"""Targets router — manage assessment targets."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import generate_id, get_current_user, require_role
from ..core.audit import log_audit_event
from ..models.target import Target
from ..models.user import User

router = APIRouter(prefix="/api/targets", tags=["Targets"])


class TargetCreate(BaseModel):
    name: str
    url: str
    description: str | None = None
    environment: str = "staging"
    authorized: bool = False
    authorization_ref: str | None = None
    source_repo: str | None = None
    dependency_manifest: str | None = None


class TargetUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    description: str | None = None
    environment: str | None = None
    authorized: bool | None = None
    authorization_ref: str | None = None
    source_repo: str | None = None
    dependency_manifest: str | None = None


@router.get("/")
async def list_targets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    targets = db.query(Target).all()
    return [t.to_dict() for t in targets]


@router.post("/", status_code=201)
async def create_target(
    request: TargetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    target = Target(
        id=generate_id(),
        name=request.name,
        url=request.url,
        description=request.description,
        environment=request.environment,
        authorized=request.authorized,
        authorization_ref=request.authorization_ref,
        source_repo=request.source_repo,
        dependency_manifest=request.dependency_manifest,
        created_by=current_user.id,
    )
    db.add(target)
    db.commit()
    db.refresh(target)

    await log_audit_event(
        action="CREATE",
        resource_type="target",
        resource_id=target.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return target.to_dict()


@router.get("/{target_id}")
async def get_target(target_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target.to_dict()


@router.patch("/{target_id}")
async def update_target(
    target_id: str,
    request: TargetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "assessor")),
):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)

    await log_audit_event(
        action="UPDATE",
        resource_type="target",
        resource_id=target.id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return target.to_dict()


@router.delete("/{target_id}")
async def delete_target(
    target_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    target = db.query(Target).filter(Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    db.delete(target)
    db.commit()

    await log_audit_event(
        action="DELETE",
        resource_type="target",
        resource_id=target_id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
    )

    return {"detail": "Target deleted"}
