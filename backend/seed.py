"""
Seed script — creates the admin account and loads the captured assessment set.

Two data sources, in order of preference:

1. backend/seed_data/assessments.json — output captured from real scanner runs
   against real targets (10 assessments, 96 findings, 95 evidence records).
   Replaying this offline means a fresh database matches the original workspace
   without needing network access or a live scan.

2. A live scan of https://example.com — used when the fixture is absent, so the
   project still seeds from genuine scanner output rather than hand-written data.

Evidence content hashes and the global hash chain are recomputed on import, so
/api/evidence/chain/verify stays valid either way.

Re-running is safe: seeding is skipped when the admin account already exists.
Pass --force to wipe existing scores of data and reseed from scratch.
"""
import asyncio
import json
import os
import sys
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

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "seed_data", "assessments.json")

DATETIME_COLUMNS = {
    "created_at", "updated_at", "completed_at", "detected", "last_login",
}


def _coerce(model, row: dict) -> dict:
    """Turn fixture strings back into the types the columns expect."""
    out = {}
    for key, value in row.items():
        if key not in model.__table__.columns:
            continue
        if key in DATETIME_COLUMNS and isinstance(value, str):
            try:
                value = datetime.fromisoformat(value)
            except ValueError:
                value = None
        out[key] = value
    return out


class ChainBuilder:
    """Append-only evidence chain.

    Verification walks every record ordered by created_at and checks
    previous_hash == the prior record's chain_hash, so each insert must extend
    the single global chain rather than starting a new one per assessment.
    """

    def __init__(self, db):
        self.db = db
        self.prev = None
        self.last_ts = None
        last = db.query(Evidence).order_by(Evidence.created_at.desc()).first()
        if last:
            self.prev = last.chain_hash
            self.last_ts = last.created_at

    def add(self, *, finding_id, assessment_id, type_, source, confidence,
            content, created_at=None):
        ts = created_at or datetime.utcnow()
        # Keep strictly increasing timestamps so ORDER BY created_at is stable.
        if self.last_ts is not None and ts <= self.last_ts:
            ts = self.last_ts + timedelta(microseconds=1)
        self.last_ts = ts

        content_hash = sha256_hash(content or "")
        chain = hash_chain(self.prev or "", content_hash)
        self.db.add(Evidence(
            id=generate_id(),
            finding_id=finding_id,
            assessment_id=assessment_id,
            type=type_,
            source=source,
            confidence=confidence,
            content=content,
            content_hash=content_hash,
            previous_hash=self.prev,
            chain_hash=chain,
            created_at=ts,
        ))
        self.prev = chain


def _add_admin(db) -> User:
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
    return admin


def _seed_from_fixture(db, admin: User) -> dict:
    """Replay the captured scan output."""
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        data = json.load(f)

    id_map = {}  # fixture id -> new id, so we never collide with existing rows

    for row in data["targets"]:
        obj = Target(**_coerce(Target, {**row, "id": generate_id(),
                                        "created_by": admin.id}))
        db.add(obj)
        db.flush()
        id_map[row["id"]] = obj.id

    counts = {"assessments": 0, "findings": 0, "evidence": 0}

    for row in data["assessments"]:
        payload = _coerce(Assessment, {
            **row,
            "id": generate_id(),
            "target_id": id_map.get(row["target_id"], row["target_id"]),
            "created_by": admin.id,
        })
        obj = Assessment(**payload)
        db.add(obj)
        db.flush()
        id_map[row["id"]] = obj.id
        counts["assessments"] += 1

    # Findings first: evidence rows reference them.
    for row in data["findings"]:
        payload = _coerce(Finding, {
            **row,
            "id": generate_id(),
            "assessment_id": id_map.get(row["assessment_id"], row["assessment_id"]),
        })
        obj = Finding(**payload)
        db.add(obj)
        db.flush()
        id_map[row["id"]] = obj.id
        counts["findings"] += 1

    # Evidence last, in its original order, so the recomputed chain is stable
    # and timestamps stay strictly increasing.
    chain = ChainBuilder(db)
    for row in data["evidence"]:
        fixture_finding = row.get("finding_id")
        chain.add(
            finding_id=id_map.get(fixture_finding) if fixture_finding else None,
            assessment_id=id_map.get(row["assessment_id"], row["assessment_id"]),
            type_=row.get("type") or "scanner_output",
            source=row.get("source") or "SENTINEL Scanner",
            confidence=row.get("confidence") or "Medium",
            content=row.get("content") or "",
            created_at=_coerce(
                Evidence, {"created_at": row.get("created_at")}
            ).get("created_at"),
        )
        counts["evidence"] += 1

    db.flush()
    return counts


async def _seed_from_live_scan(db, admin: User) -> dict:
    """Fallback: scan example.com for real (needs network access)."""
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

    prev = None
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
    log_chain = hash_chain(prev or "", log_hash)
    db.add(Evidence(
        id=generate_id(), finding_id=None, assessment_id=assessment.id,
        type="scanner_output", source="SENTINEL Scanner", confidence="High",
        content=log_content, content_hash=log_hash,
        previous_hash=prev, chain_hash=log_chain, created_at=next_ts(),
    ))
    prev = log_chain

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
            chain = hash_chain(prev or "", content_hash)
            db.add(Evidence(
                id=generate_id(), finding_id=finding.id,
                assessment_id=assessment.id, type=evd.get("type", "scanner_output"),
                source=evd.get("source", "SENTINEL Scanner"),
                confidence=evd.get("confidence", "Medium"),
                content=content, content_hash=content_hash,
                previous_hash=prev, chain_hash=chain, created_at=next_ts(),
            ))
            prev = chain

    return {"assessments": 1, "findings": len(findings_data),
            "evidence": len(evidence_data) + 1}


async def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@sentinel.local").first()
        if existing and not force:
            print("Database already seeded. Skipping.")
            print("  (pass --force to wipe the workspace and reseed)")
            return

        if force:
            print("--force: clearing existing workspace data...")
            for model in (Evidence, Finding, Assessment, Target):
                db.query(model).delete()
            db.query(User).delete()
            db.commit()

        admin = _add_admin(db)

        if os.path.exists(FIXTURE_PATH):
            print("Loading captured scan set from %s ..." % os.path.basename(FIXTURE_PATH))
            counts = _seed_from_fixture(db, admin)
        else:
            print("No fixture found; running a live scan instead...")
            counts = await _seed_from_live_scan(db, admin)

        db.commit()

        print("Database seeded successfully!")
        print("  Admin user:  admin@sentinel.local / admin123")
        print("  Targets:     %d" % db.query(Target).count())
        print("  Assessments: %d" % db.query(Assessment).count())
        print("  Findings:    %d" % db.query(Finding).count())
        print("  Evidence:    %d" % db.query(Evidence).count())

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed_database(force="--force" in sys.argv))
