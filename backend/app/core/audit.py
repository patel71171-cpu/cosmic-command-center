"""Audit logging middleware and utilities."""
import hashlib
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from .database import SessionLocal
from ..models.audit_log import AuditLog


def compute_entry_hash(entry_data: str) -> str:
    return hashlib.sha256(entry_data.encode()).hexdigest()


async def log_audit_event(
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    source_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    outcome: str = "SUCCESS",
    details: Optional[dict] = None,
):
    """Write an audit log entry with hash chain integrity."""
    db = SessionLocal()
    try:
        # Get last entry for hash chain
        last_entry = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
        previous_hash = last_entry.entry_hash if last_entry else None

        entry_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()

        # Build entry data for hashing
        entry_data = json.dumps({
            "id": entry_id,
            "timestamp": timestamp.isoformat(),
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "outcome": outcome,
            "details": details,
        }, sort_keys=True, default=str)

        entry_hash = compute_entry_hash(entry_data + (previous_hash or ""))

        log_entry = AuditLog(
            id=entry_id,
            timestamp=timestamp,
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            source_ip=source_ip,
            user_agent=user_agent,
            outcome=outcome,
            details=json.dumps(details) if details else None,
            entry_hash=entry_hash,
            previous_entry_hash=previous_hash,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Don't let audit logging failures break the app
        print(f"Audit logging failed: {e}")
    finally:
        db.close()


class AuditMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that logs every API call to the audit trail."""

    async def dispatch(self, request: Request, call_next):
        # Skip health checks and docs
        if request.url.path in ("/health", "/api/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        # Extract user info if available
        user_id = None
        user_email = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            from .security import decode_token
            payload = decode_token(auth_header[7:])
            if payload:
                user_id = payload.get("sub")
                user_email = payload.get("email")

        source_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Determine action from method
        method = request.method
        action_map = {"GET": "READ", "POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}
        action = action_map.get(method, method)

        # Extract resource type from path
        path_parts = request.url.path.strip("/").split("/")
        resource_type = path_parts[1] if len(path_parts) > 1 else None
        resource_id = path_parts[2] if len(path_parts) > 2 and path_parts[2] != "api" else None

        response = await call_next(request)

        # Log the event
        await log_audit_event(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            source_ip=source_ip,
            user_agent=user_agent,
            outcome="SUCCESS" if response.status_code < 400 else "FAILURE",
            details={
                "method": method,
                "path": request.url.path,
                "status_code": response.status_code,
            },
        )

        return response
