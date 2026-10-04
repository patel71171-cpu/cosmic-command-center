"""Authentication router — login, register, Google sign-in, token management."""
import re
import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..core.google_oauth import (
    GoogleOAuthError,
    build_start_url,
    exchange_code_for_profile,
    is_configured,
    issue_exchange_code,
    redeem_exchange_code,
)
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


class GoogleStatusResponse(BaseModel):
    configured: bool


class GoogleExchangeRequest(BaseModel):
    code: str


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


# ---------------------------------------------------------------------------
# Google sign-in
# ---------------------------------------------------------------------------
# Anyone with a Google account can sign in; no invitation or pre-seeded record
# is required. The account is created on first successful sign-in, with the
# least-privileged role so access stays deliberate.

GOOGLE_DEFAULT_ROLE = "viewer"


def _upsert_google_user(db: Session, profile: dict) -> User:
    """Find or create the local account backing a verified Google identity."""
    email = profile["email"]
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        # Google identities authenticate through Google only. Storing a hash of
        # a fresh random secret means no password can ever match this account,
        # while keeping the NOT NULL constraint satisfied.
        user = User(
            id=generate_id(),
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(48)),
            full_name=profile["full_name"],
            roles=GOOGLE_DEFAULT_ROLE,
            # Set explicitly: a not-yet-flushed row has is_active=None rather
            # than the column default, which would read as deactivated below.
            is_active=True,
        )
        db.add(user)
    else:
        # Keep the display name fresh, but never touch roles: an existing
        # account keeps whatever access an administrator granted it.
        if profile.get("full_name") and user.full_name != profile["full_name"]:
            user.full_name = profile["full_name"]

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


@router.get("/google/status", response_model=GoogleStatusResponse)
async def google_status():
    """Let the login page hide or explain the Google option."""
    return GoogleStatusResponse(configured=is_configured())


@router.get("/google/start")
async def google_start():
    """Redirect the browser to Google's consent screen."""
    try:
        return RedirectResponse(build_start_url(), status_code=302)
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/google/callback")
async def google_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    """Google's landing point: verify the identity, then hand back a one-time code."""
    from urllib.parse import quote

    if error:
        # The user declined consent or Google refused the request.
        return RedirectResponse(
            f"{settings.frontend_url}/login?google_error={quote(error)}",
            status_code=302,
        )

    try:
        profile = await exchange_code_for_profile(code, state)
        user = _upsert_google_user(db, profile)
    except GoogleOAuthError as exc:
        return RedirectResponse(
            f"{settings.frontend_url}/login?google_error={quote(str(exc))}",
            status_code=302,
        )

    await log_audit_event(
        action="LOGIN",
        user_id=user.id,
        user_email=user.email,
        outcome="SUCCESS",
        details={"provider": "google"},
    )

    # Hand over a single-use code rather than a JWT in the URL, so the token
    # never lands in browser history, referrers, or server logs.
    exchange = issue_exchange_code(user.id, user.email, user.roles)
    return RedirectResponse(
        f"{settings.frontend_url}/auth/callback?code={quote(exchange)}",
        status_code=302,
    )


@router.post("/google/exchange", response_model=TokenResponse)
async def google_exchange(
    request: GoogleExchangeRequest,
    db: Session = Depends(get_db),
):
    """Swap the one-time code for a normal SENTINEL JWT."""
    try:
        claims = redeem_exchange_code(request.code)
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    user = db.query(User).filter(User.id == claims.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": user.id, "email": user.email, "roles": user.roles})
    return TokenResponse(access_token=token, user=user.to_dict())
