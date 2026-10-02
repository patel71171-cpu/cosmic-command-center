"""
Seed script — creates the admin account and one real assessment.

The assessment is produced by running the actual scanner against a real target,
so every finding, evidence record and hash-chain link is genuine output rather
than a hand-written fixture.
"""
import asyncio
import json
from datetime import datetime, timedelta

from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash, generate_id, sha256_hash, hash_chain
from app import models  # noqa: F401  — registers every table on Base
from app.models.user import User, Base
from app.models.target import Target
from app.models.assessment import Assessment
from app.models.finding import Finding
from app.models.evidence import Evidence
from app.services.scanner import SecurityScanner

SEED_TARGET_URL = "https://example.com"
SEED_TARGET_NAME = "Example Corp — Public Site"
SEED_ASSESSMENT_NAME = "Example Corp — Baseline Assessment"
SEED_AUTHORIZATION_REF = "SEED-AUTH-2026-001"


async def seed_database():
    # Ensure schema exists (seed may run before the API ever boots)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@sentinel.local").first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database with a real assessment run...")

        # ── Admin user ──────────────────────────────────────────────────────
        admin = User(
            id=generate_id(),
            email="admin@sentinel.local",
            hashed_password=get_password_hash("admin123"),
            full_name="SENTINEL Admin",
            roles="admin,assessor,viewer",
            is_active=True,
        )
        db.add(admin)
        db.flush()

        # ── Target ──────────────────────────────────────────────────────────
        target = Target(
            id=generate_id(),
            name=SEED_TARGET_NAME,
            url=SEED_TARGET_URL,
            description="Production public web presence, authorised for baseline assessment.",
            environment="production",
            authorized=True,
            authorization_ref=SEED_AUTHORIZATION_REF,
            created_by=admin.id,
        )
        db.add(target)
        db.flush()

        # ── Real scan ───────────────────────────────────────────────────────
        print(f"  Scanning {SEED_TARGET_URL} ...")
        scanner = SecurityScanner(SEED_TARGET_URL)
        try:
            result = await scanner.run_full_assessment()
        finally:
            await scanner.close()

        findings_data = result.get("findings", [])
        evidence_data = result.get("evidence", [])
        print(f"  Scan complete: {len(findings_data)} findings, {len(evidence_data)} evidence records")

        assessment = Assessment(
            id=generate_id(),
            target_id=target.id,
            name=SEED_ASSESSMENT_NAME,
            status="FINDINGS_READY",
            progress=100,
            findings_count=len(findings_data),
            risk_score=float(result.get("risk_score", 0)),
            security_score=float(result.get("security_score", 0)),
            scan_duration=float(result.get("scan_duration", 0)),
            methodology=json.dumps(
                ["headers", "ssl", "endpoints", "info_disclosure", "cors", "dependencies"]
            ),
            created_by=admin.id,
            completed_at=datetime.utcnow(),
        )
        db.add(assessment)
        db.flush()

        # ── Findings + evidence, chained in the order the scanner produced ──
        prev_hash = None
        chain_ts = None

        def next_ts():
            nonlocal chain_ts
            ts = datetime.utcnow()
            if chain_ts is not None and ts <= chain_ts:
                ts = chain_ts + timedelta(microseconds=1)
            chain_ts = ts
            return ts

        # Scan log first, so the chain opens with the raw run record.
        log_lines = [
            f"SCAN LOG — {result.get('target', SEED_TARGET_URL)}",
            f"Started: {result.get('scan_timestamp', '')}",
            f"Duration: {result.get('scan_duration', 0)}s",
            f"Findings: {len(findings_data)} | Risk {result.get('risk_score', 0)}/100 "
            f"| Security {result.get('security_score', 0)}/100",
            "",
            "RESPONSE HEADERS",
        ]
        for key, value in (result.get("headers") or {}).items():
            log_lines.append(f"{key}: {value}")
        ssl_info = result.get("ssl_info") or {}
        if ssl_info:
            log_lines += ["", "TLS"]
            for key in ("tls_version", "cipher", "subject", "issuer", "not_after"):
                if ssl_info.get(key):
                    log_lines.append(f"{key}: {ssl_info[key]}")
        endpoints = result.get("endpoints") or []
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
        db.add(Evidence(
            id=generate_id(), finding_id=None, assessment_id=assessment.id,
            type="scanner_output", source="SENTINEL Scanner", confidence="High",
            content=log_content, content_hash=log_hash,
            previous_hash=prev_hash, chain_hash=log_chain, created_at=next_ts(),
        ))
        prev_hash = log_chain

        for fd in findings_data:
            finding = Finding(
                id=generate_id(),
                assessment_id=assessment.id,
                title=fd["title"],
                severity=fd["severity"],
                cvss_score=fd.get("cvss", 0),
                cvss_vector=fd.get("cvss_vector", ""),
                confidence=fd.get("confidence", "Medium"),
                category=fd.get("category", ""),
                asset=fd.get("asset", SEED_TARGET_URL),
                status="Open",
                detected=datetime.utcnow(),
                summary=fd.get("summary", ""),
                impact=fd.get("impact", ""),
                fix=fd.get("fix", ""),
                owner="Unassigned",
                source_tool=fd.get("source_tool", "sentinel"),
                source_rule_id=fd.get("source_rule_id", ""),
                dedup_hash=sha256_hash(fd["title"] + ":" + fd.get("asset", SEED_TARGET_URL)),
                remediation_status="OPEN",
            )
            db.add(finding)
            db.flush()

            for evd in evidence_data:
                if evd.get("finding") != fd.get("id"):
                    continue
                content = evd.get("content", "")
                content_hash = sha256_hash(content)
                chain = hash_chain(prev_hash or "", content_hash)
                db.add(Evidence(
                    id=generate_id(), finding_id=finding.id,
                    assessment_id=assessment.id, type=evd.get("type", "scanner_output"),
                    source=evd.get("source", "SENTINEL Scanner"),
                    confidence=evd.get("confidence", "Medium"),
                    content=content, content_hash=content_hash,
                    previous_hash=prev_hash, chain_hash=chain, created_at=next_ts(),
                ))
                prev_hash = chain

        db.commit()
        print("Database seeded successfully!")
        print(f"  Admin user: admin@sentinel.local / admin123")
        print(f"  Target: {target.url}")
        print(f"  Assessment: {assessment.name}")
        print(f"  Findings: {len(findings_data)}")
        print(f"  Evidence records: {db.query(Evidence).count()}")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
