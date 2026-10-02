"""Remediation router — manage remediation actions and re-tests."""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import generate_id, get_current_user, require_role
from ..core.audit import log_audit_event
from ..models.finding import Finding
from ..models.remediation import RemediationAction
from ..models.retest import ReTest
from ..models.user import User
from ..services.retest import run_retest

router = APIRouter(prefix="/api/remediation", tags=["Remediation"])


class RemediationCreate(BaseModel):
    finding_id: str
    action_type: str  # code_fix, config_change, patch, waf_rule, rate_limit
    title: str
    description: str | None = None
    patch_diff: str | None = None
    config_change: dict | None = None
    reference_links: list[str] | None = None


class RemediationUpdate(BaseModel):
    status: str | None = None  # OPEN, IN_PROGRESS, FIXED
    proof: dict | None = None


@router.get("/")
async def list_remediations(
    finding_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(RemediationAction)
    if finding_id:
        query = query.filter(RemediationAction.finding_id == finding_id)
    if status:
        query = query.filter(RemediationAction.status == status)
    actions = query.all()
    return [a.to_dict() for a in actions]


@router.post("/", status_code=201)
async def create_remediation(
    request: RemediationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    # Verify finding exists
    finding = db.query(Finding).filter(Finding.id == request.finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    action = RemediationAction(
        id=generate_id(),
        finding_id=request.finding_id,
        action_type=request.action_type,
        title=request.title,
        description=request.description,
        patch_diff=request.patch_diff,
        config_change=json.dumps(request.config_change) if request.config_change else None,
        reference_links=json.dumps(request.reference_links) if request.reference_links else None,
        status="OPEN",
    )
    db.add(action)

    # Update finding remediation status
    finding.remediation_status = "IN_PROGRESS"
    db.commit()
    db.refresh(action)

    await log_audit_event(
        action="CREATE",
        resource_type="remediation",
        resource_id=action.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return action.to_dict()


@router.patch("/{action_id}")
async def update_remediation(
    action_id: str,
    request: RemediationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    action = db.query(RemediationAction).filter(RemediationAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Remediation action not found")

    if request.status:
        action.status = request.status
        if request.status == "FIXED":
            action.applied_by = current_user.id
            action.applied_at = datetime.utcnow()

            # Update finding
            finding = db.query(Finding).filter(Finding.id == action.finding_id).first()
            if finding:
                finding.remediation_status = "FIXED"
                if request.proof:
                    finding.remediation_proof = json.dumps(request.proof)

    db.commit()
    db.refresh(action)

    await log_audit_event(
        action="UPDATE",
        resource_type="remediation",
        resource_id=action.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return action.to_dict()


@router.post("/{action_id}/retest")
async def retest_finding(
    action_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    """Trigger a re-test for a remediated finding."""
    action = db.query(RemediationAction).filter(RemediationAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Remediation action not found")

    finding = db.query(Finding).filter(Finding.id == action.finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    # Create re-test record
    retest = ReTest(
        id=generate_id(),
        finding_id=finding.id,
        assessment_id=finding.assessment_id,
        status="PENDING",
    )
    db.add(retest)
    db.commit()

    # Run re-test in background
    background_tasks.add_task(run_retest, retest.id, finding.id, finding.asset)

    await log_audit_event(
        action="SCAN",
        resource_type="retest",
        resource_id=retest.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return {"detail": "Re-test started", "retest_id": retest.id}


@router.get("/retests/{retest_id}")
async def get_retest_status(retest_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    retest = db.query(ReTest).filter(ReTest.id == retest_id).first()
    if not retest:
        raise HTTPException(status_code=404, detail="Re-test not found")
    return retest.to_dict()
