"""Findings router — list, update, and manage findings."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user, require_role
from ..core.audit import log_audit_event
from ..models.finding import Finding
from ..models.user import User

router = APIRouter(prefix="/api/findings", tags=["Findings"])


class FindingUpdate(BaseModel):
    status: str | None = None
    owner: str | None = None
    remediation_status: str | None = None
    remediation_proof: dict | None = None


@router.get("/")
async def list_findings(
    assessment_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Finding)
    if assessment_id:
        query = query.filter(Finding.assessment_id == assessment_id)
    if severity:
        query = query.filter(Finding.severity == severity)
    if status:
        query = query.filter(Finding.status == status)
    findings = query.order_by(Finding.cvss_score.desc()).all()
    return [f.to_dict() for f in findings]


@router.get("/{finding_id}")
async def get_finding(finding_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding.to_dict()


@router.patch("/{finding_id}")
async def update_finding(
    finding_id: str,
    request: FindingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "remediation_proof" and value is not None:
            setattr(finding, field, json.dumps(value))
        else:
            setattr(finding, field, value)

    db.commit()
    db.refresh(finding)

    await log_audit_event(
        action="UPDATE",
        resource_type="finding",
        resource_id=finding.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
        details={"updated_fields": list(update_data.keys())},
    )

    return finding.to_dict()


@router.get("/{finding_id}/evidence")
async def get_finding_evidence(finding_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    from ..models.evidence import Evidence
    evidence = db.query(Evidence).filter(Evidence.finding_id == finding_id).all()
    return [e.to_dict() for e in evidence]
