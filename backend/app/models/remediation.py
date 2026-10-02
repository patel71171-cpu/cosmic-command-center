"""Remediation action model — fixes applied, linked to findings."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from .user import Base


class RemediationAction(Base):
    __tablename__ = "remediation_actions"

    id = Column(String(36), primary_key=True)
    finding_id = Column(String(36), ForeignKey("findings.id"), nullable=False)
    action_type = Column(String(100), nullable=False)  # code_fix, config_change, patch, waf_rule, rate_limit
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    patch_diff = Column(Text, nullable=True)  # unified diff format
    config_change = Column(Text, nullable=True)  # JSON config change
    reference_links = Column(Text, nullable=True)  # JSON array of URLs
    status = Column(String(50), default="OPEN")  # OPEN, IN_PROGRESS, FIXED
    proof = Column(Text, nullable=True)  # JSON: commit link, screenshot, verification result
    applied_by = Column(String(36), nullable=True)
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "action_type": self.action_type,
            "title": self.title,
            "description": self.description,
            "patch_diff": self.patch_diff,
            "config_change": self.config_change,
            "reference_links": self.reference_links,
            "status": self.status,
            "proof": self.proof,
            "applied_by": self.applied_by,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
