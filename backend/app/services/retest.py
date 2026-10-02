"""
Re-Test Service
Re-scans specific findings to verify remediation.
"""
import asyncio
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..core.security import generate_id, sha256_hash, hash_chain
from ..models.finding import Finding
from ..models.retest import ReTest
from ..models.evidence import Evidence
from .scanner import SecurityScanner


async def run_retest(retest_id: str, finding_id: str, target_url: str):
    """Run a targeted re-test for a specific finding."""
    db = SessionLocal()
    try:
        retest = db.query(ReTest).filter(ReTest.id == retest_id).first()
        finding = db.query(Finding).filter(Finding.id == finding_id).first()

        if not retest or not finding:
            return

        # `asset` is often a path (e.g. /api/debug) rather than a full URL —
        # fall back to the assessment's target URL so the scan can run.
        scan_url = target_url or ""
        if not scan_url.startswith(("http://", "https://")):
            from ..models.assessment import Assessment
            from ..models.target import Target

            assessment = (
                db.query(Assessment).filter(Assessment.id == finding.assessment_id).first()
            )
            scan_url = ""
            if assessment:
                owner = (
                    db.query(Target).filter(Target.id == assessment.target_id).first()
                )
                scan_url = owner.url if owner else ""
            if not scan_url:
                retest.status = "FAILED"
                retest.comparison = "Re-test failed: no scan URL available for this finding"
                db.commit()
                return

        # Run a fresh scan
        scanner = SecurityScanner(scan_url, timeout=15.0)
        try:
            result = await scanner.run_full_assessment()
        finally:
            await scanner.close()

        # Check if the vulnerability is still present
        still_vulnerable = False
        for new_finding in result.get("findings", []):
            if new_finding["title"] == finding.title:
                still_vulnerable = True
                break

        # Update retest record
        if still_vulnerable:
            retest.status = "STILL_VULNERABLE"
            finding.retest_status = "STILL_VULNERABLE"
        else:
            retest.status = "VERIFIED_FIXED"
            finding.retest_status = "VERIFIED_FIXED"
            finding.status = "Verified"

        retest.verified_at = datetime.utcnow()
        retest.comparison = f"Original: {finding.title} | Re-test: {'Still present' if still_vulnerable else 'Not found'}"

        # Create evidence for re-test
        last_evidence = db.query(Evidence).order_by(Evidence.created_at.desc()).first()
        previous_hash = last_evidence.chain_hash if last_evidence else None

        content = f"Re-test for {finding.title}: {retest.status}"
        content_hash = sha256_hash(content)
        chain_hash = hash_chain(previous_hash or "", content_hash)

        # Keep the record strictly newer than the previous link so the
        # verifier's `created_at` walk matches the order the chain was built.
        created_at = datetime.utcnow()
        if last_evidence and last_evidence.created_at and created_at <= last_evidence.created_at:
            created_at = last_evidence.created_at + timedelta(microseconds=1)

        evidence = Evidence(
            id=generate_id(),
            finding_id=finding_id,
            assessment_id=finding.assessment_id,
            type="scanner_output",
            source="SENTINEL Re-test",
            confidence="High",
            content=content,
            content_hash=content_hash,
            previous_hash=previous_hash,
            chain_hash=chain_hash,
            created_at=created_at,
        )
        db.add(evidence)
        db.commit()

    except Exception as e:
        db.rollback()
        # `retest` may be unbound if the lookup itself failed
        try:
            if "retest" in locals() and retest is not None:
                retest.status = "FAILED"
                retest.comparison = f"Re-test failed: {str(e)}"
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
