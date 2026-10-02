"""Assessments router — create, run, and manage assessments."""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import generate_id, get_current_user, require_role
from ..core.audit import log_audit_event
from ..models.assessment import Assessment
from ..models.target import Target
from ..models.user import User
from ..services.pipeline import run_assessment_pipeline

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


class AssessmentCreate(BaseModel):
    target: str
    name: str
    methodology: list[str] | None = None
    checks: list[str] | None = None  # wizard field name for methodology
    # Optional context passed by the wizard
    environment: str | None = None
    scope: str | None = None
    description: str | None = None
    authorized: bool | None = None
    authorization_ref: str | None = None

    def resolved_methodology(self) -> list[str]:
        return self.methodology or self.checks or []


def _resolve_target(db: Session, request: AssessmentCreate, current_user: User) -> Target:
    """Resolve `target` as either an existing target id or a URL.

    New URLs are registered as targets so the wizard can scan a target it
    has never seen before. Scanning still requires the authorized flag.
    """
    target = db.query(Target).filter(Target.id == request.target).first()
    if target:
        return target

    target = db.query(Target).filter(Target.url == request.target).first()
    if target:
        return target

    if not (request.target.startswith("http://") or request.target.startswith("https://")):
        raise HTTPException(
            status_code=404,
            detail="Target not found. Provide a target id or a full http(s) URL.",
        )

    target = Target(
        id=generate_id(),
        name=request.target,
        url=request.target,
        description=request.description,
        environment=(request.environment or "staging").lower(),
        authorized=bool(request.authorized),
        authorization_ref=request.authorization_ref or request.description,
        created_by=current_user.id,
    )
    db.add(target)
    db.flush()
    return target


@router.get("/")
async def list_assessments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessments = db.query(Assessment).order_by(Assessment.created_at.desc()).all()
    return [a.to_dict() for a in assessments]


@router.post("/", status_code=201)
async def create_assessment(
    request: AssessmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    target = _resolve_target(db, request, current_user)

    if not target.authorized:
        raise HTTPException(
            status_code=400,
            detail="Target is not authorized for scanning. Set authorized=true with authorization reference.",
        )

    methodology = request.resolved_methodology()
    assessment = Assessment(
        id=generate_id(),
        target_id=target.id,
        name=request.name,
        status="DRAFT",
        methodology=json.dumps(methodology),
        created_by=current_user.id,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    await log_audit_event(
        action="CREATE",
        resource_type="assessment",
        resource_id=assessment.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    # Kick off the scan immediately — the wizard expects the pipeline to run.
    background_tasks.add_task(run_assessment_pipeline, assessment.id, target)

    return assessment.to_dict()


@router.post("/{assessment_id}/run")
async def run_assessment(
    assessment_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    target = db.query(Target).filter(Target.id == assessment.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    # Update status
    assessment.status = "SCANNING"
    assessment.progress = 10
    db.commit()

    # Run pipeline in background
    background_tasks.add_task(run_assessment_pipeline, assessment.id, target)

    await log_audit_event(
        action="SCAN",
        resource_type="assessment",
        resource_id=assessment.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
        details={"target": target.url},
    )

    return {"detail": "Assessment scan started", "assessment_id": assessment_id}


@router.get("/{assessment_id}")
async def get_assessment(assessment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment.to_dict()


@router.get("/{assessment_id}/status")
async def get_assessment_status(assessment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "id": assessment.id,
        "status": assessment.status,
        "progress": assessment.progress,
        "findings_count": assessment.findings_count,
        "risk_score": assessment.risk_score,
    }
