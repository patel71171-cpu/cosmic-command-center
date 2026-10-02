"""Evidence router — evidence chain management and verification."""
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user, sha256_hash, hash_chain
from ..models.evidence import Evidence
from ..models.user import User

router = APIRouter(prefix="/api/evidence", tags=["Evidence"])


@router.get("/{evidence_id}")
async def get_evidence(evidence_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence.to_dict()


@router.get("/chain/verify")
async def verify_evidence_chain(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Walk the entire evidence chain and verify integrity."""
    evidence_items = db.query(Evidence).order_by(Evidence.created_at).all()

    if not evidence_items:
        return {"status": "ok", "message": "No evidence records found", "total_records": 0}

    tampered = []
    previous_hash = None

    for i, ev in enumerate(evidence_items):
        # Verify content hash
        computed_content_hash = sha256_hash(ev.content or "")
        if computed_content_hash != ev.content_hash:
            tampered.append({
                "id": ev.id,
                "index": i,
                "issue": "content_hash_mismatch",
                "stored": ev.content_hash,
                "computed": computed_content_hash,
            })
            continue

        # Verify chain hash
        computed_chain = hash_chain(ev.previous_hash or "", ev.content_hash)
        if computed_chain != ev.chain_hash:
            tampered.append({
                "id": ev.id,
                "index": i,
                "issue": "chain_hash_mismatch",
                "stored": ev.chain_hash,
                "computed": computed_chain,
            })

        # Verify linkage
        if i > 0 and ev.previous_hash != evidence_items[i - 1].chain_hash:
            tampered.append({
                "id": ev.id,
                "index": i,
                "issue": "chain_link_broken",
                "expected_previous": evidence_items[i - 1].chain_hash,
                "actual_previous": ev.previous_hash,
            })

        previous_hash = ev.chain_hash

    return {
        "status": "ok" if not tampered else "tampered",
        "total_records": len(evidence_items),
        "tampered_records": tampered,
        "chain_valid": len(tampered) == 0,
    }


@router.get("/chain/{assessment_id}")
async def get_assessment_chain(assessment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the evidence chain for a specific assessment."""
    evidence_items = db.query(Evidence).filter(Evidence.assessment_id == assessment_id).order_by(Evidence.created_at).all()
    return [e.to_dict() for e in evidence_items]
