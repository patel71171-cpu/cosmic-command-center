"""Assessment Pipeline Orchestrator."""
import asyncio, json, uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..core.database import SessionLocal
from ..core.security import generate_id, sha256_hash, hash_chain
from ..models.assessment import Assessment
from ..models.finding import Finding
from ..models.evidence import Evidence
from ..models.target import Target
from .scanner import SecurityScanner

async def run_assessment_pipeline(assessment_id: str, target: Target):
    db = SessionLocal()
    try:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment: return
        assessment.status = "SCANNING"
        assessment.progress = 20
        db.commit()
        scanner = SecurityScanner(target.url)
        try:
            scan_result = await scanner.run_full_assessment()
        finally:
            await scanner.close()
        assessment.progress = 60
        assessment.status = "ANALYZING"
        db.commit()
        findings_data = scan_result.get("findings", [])
        evidence_data = scan_result.get("evidence", [])
        last_ev = db.query(Evidence).order_by(Evidence.created_at.desc()).first()
        prev_hash = last_ev.chain_hash if last_ev else None
        # The verifier walks evidence in `created_at` order, so that order must
        # match the order the chain was built in. Records written inside the
        # same clock tick would otherwise be free to sort either way.
        chain_ts = last_ev.created_at if (last_ev and last_ev.created_at) else None

        def next_ts():
            nonlocal chain_ts
            ts = datetime.utcnow()
            if chain_ts is not None and ts <= chain_ts:
                ts = chain_ts + timedelta(microseconds=1)
            chain_ts = ts
            return ts

        # ── Scan log ────────────────────────────────────────────────────────────
        # The raw scanner output is itself evidence: response headers, TLS details,
        # every endpoint probed and the verdict rendered for each one.
        log_lines = [
            f"SCAN LOG — {target.url}",
            f"Started: {scan_result.get('scan_timestamp', '')}",
            f"Duration: {scan_result.get('scan_duration', 0)}s",
            f"Findings: {len(findings_data)} | Risk {scan_result.get('risk_score', 0)}/100 "
            f"| Security {scan_result.get('security_score', 0)}/100",
            "",
            "RESPONSE HEADERS",
        ]
        for key, value in (scan_result.get("headers") or {}).items():
            log_lines.append(f"{key}: {value}")
        ssl_info = scan_result.get("ssl_info") or {}
        if ssl_info:
            log_lines += ["", "TLS"]
            for key in ("tls_version", "cipher", "subject", "issuer", "not_after"):
                if ssl_info.get(key):
                    log_lines.append(f"{key}: {ssl_info[key]}")
        endpoints = scan_result.get("endpoints") or []
        log_lines += ["", f"ENDPOINTS PROBED ({len(endpoints)})"]
        for ep in endpoints:
            log_lines.append(
                f"GET {ep.get('path')} -> HTTP {ep.get('status')} "
                f"({ep.get('content_type', 'unknown')}, {ep.get('length', 0)} bytes)"
            )
        log_lines += ["", "VERDICTS"]
        for fd in findings_data:
            log_lines.append(
                f"[{fd.get('severity')} | CVSS {fd.get('cvss', 0)}] {fd.get('title')} "
                f"— {fd.get('asset')}"
            )
        log_content = "\n".join(log_lines)
        log_hash = sha256_hash(log_content)
        log_chain = hash_chain(prev_hash or "", log_hash)
        log_ts = next_ts()
        db.add(Evidence(
            id=generate_id(), finding_id=None, assessment_id=assessment_id,
            type="scanner_output", source="SENTINEL Scanner", confidence="High",
            content=log_content, content_hash=log_hash,
            previous_hash=prev_hash, chain_hash=log_chain, created_at=log_ts,
        ))
        prev_hash = log_chain
        for fd in findings_data:
            finding = Finding(
                id=generate_id(), assessment_id=assessment_id,
                title=fd["title"], severity=fd["severity"],
                cvss_score=fd.get("cvss", 0), cvss_vector=fd.get("cvss_vector", ""),
                confidence=fd.get("confidence", "Medium"), category=fd.get("category", ""),
                asset=fd.get("asset", target.url), status="Open",
                detected=datetime.utcnow(), summary=fd.get("summary", ""),
                impact=fd.get("impact", ""), fix=fd.get("fix", ""),
                owner="Unassigned", source_tool=fd.get("source_tool", "sentinel"),
                source_rule_id=fd.get("source_rule_id", ""),
                dedup_hash=sha256_hash(fd["title"] + ":" + fd.get("asset", target.url)),
                remediation_status="OPEN",
            )
            db.add(finding)
            db.flush()
            for evd in evidence_data:
                if evd.get("finding") == fd.get("id"):
                    content = evd.get("content", "")
                    ch = sha256_hash(content)
                    chain = hash_chain(prev_hash or "", ch)
                    ts = next_ts()
                    ev = Evidence(
                        id=generate_id(), finding_id=finding.id,
                        assessment_id=assessment_id, type=evd.get("type", "scanner_output"),
                        source=evd.get("source", "SENTINEL Scanner"),
                        confidence=evd.get("confidence", "Medium"),
                        content=content, content_hash=ch,
                        previous_hash=prev_hash, chain_hash=chain,
                        created_at=ts,
                    )
                    db.add(ev)
                    prev_hash = chain
        assessment.status = "FINDINGS_READY"
        assessment.progress = 100
        assessment.findings_count = len(findings_data)
        assessment.risk_score = scan_result.get("risk_score", 0)
        assessment.security_score = scan_result.get("security_score", 0)
        assessment.scan_duration = scan_result.get("scan_duration", 0)
        # Persist the discovered workflow (reachable pages/endpoints) so the
        # attack-surface and risk graphs can render the application structure.
        assessment.endpoints = json.dumps([
            {
                "path": ep.get("path", "/"),
                "status": ep.get("status", 0),
                "content_type": ep.get("content_type", ""),
            }
            for ep in (scan_result.get("endpoints") or [])
        ])
        assessment.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[PIPELINE] assessment {assessment_id} failed: {e}")
        try:
            if "assessment" in locals() and assessment is not None:
                assessment.status = "FAILED"
                assessment.error_message = str(e)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
