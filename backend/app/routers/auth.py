"""Authentication router — login, register, token management."""
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import (
    create_access_token, generate_id, get_current_user,
    get_password_hash, verify_password,
)
from ..core.audit import log_audit_event
from ..models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class _EmailMixin:
    """Lenient email validation.

    Deliberately avoids `EmailStr`, which rejects reserved special-use
    domains such as `sentinel.local` (used by demo/on-prem deployments).
    """

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


class LoginRequest(_EmailMixin, BaseModel):
    email: str
    password: str


class RegisterRequest(_EmailMixin, BaseModel):
    email: str
    password: str
    full_name: str
    roles: list[str] = ["viewer"]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        await log_audit_event(
            action="LOGIN",
            user_email=request.email,
            outcome="FAILURE",
            details={"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email, "roles": user.roles})

    await log_audit_event(
        action="LOGIN",
        user_id=user.id,
        user_email=user.email,
        outcome="SUCCESS",
    )

    return TokenResponse(access_token=token, user=user.to_dict())


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=generate_id(),
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name,
        roles=",".join(request.roles),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    await log_audit_event(
        action="CREATE",
        resource_type="user",
        resource_id=user.id,
        user_id=user.id,
        user_email=user.email,
        outcome="SUCCESS",
    )

    token = create_access_token({"sub": user.id, "email": user.email, "roles": user.roles})

    return TokenResponse(access_token=token, user=user.to_dict())


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()
