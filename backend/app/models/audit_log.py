"""Audit log model — append-only, NIST SP 800-53 compliant."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from .user import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)  # CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, SCAN, etc.
    resource_type = Column(String(100), nullable=True)  # assessment, finding, target, etc.
    resource_id = Column(String(36), nullable=True)
    source_ip = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    outcome = Column(String(50), nullable=True)  # SUCCESS, FAILURE
    details = Column(Text, nullable=True)  # JSON details
    # Integrity
    entry_hash = Column(String(64), nullable=False)  # SHA-256 of this entry
    previous_entry_hash = Column(String(64), nullable=True)  # hash chain

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "source_ip": self.source_ip,
            "user_agent": self.user_agent,
            "outcome": self.outcome,
            "details": self.details,
            "entry_hash": self.entry_hash,
            "previous_entry_hash": self.previous_entry_hash,
        }
