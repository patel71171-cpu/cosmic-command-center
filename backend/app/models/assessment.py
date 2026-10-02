"""Assessment model — one per target, with status machine."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from .user import Base
from .target import Target  # noqa: F401  — registers Target for the relationship below

# Status machine:
# DRAFT → SCANNING → ANALYZING → FINDINGS_READY → REMEDIATION → RE-TESTING → VERIFIED / FAILED
ASSESSMENT_STATUSES = [
    "DRAFT", "SCANNING", "ANALYZING", "FINDINGS_READY",
    "REMEDIATION", "RE-TESTING", "VERIFIED", "FAILED"
]


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True)
    target_id = Column(String(36), ForeignKey("targets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT")
    progress = Column(Integer, default=0)  # 0-100
    findings_count = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)  # 0-100
    security_score = Column(Float, default=0.0)  # 0-100
    scan_duration = Column(Float, default=0.0)  # seconds
    methodology = Column(Text, nullable=True)  # JSON array of checks performed
    endpoints = Column(Text, nullable=True)  # JSON array of discovered endpoints
    error_message = Column(Text, nullable=True)
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Eagerly joined so `to_dict()` can expose the target URL without a second
    # query, and the values are already populated while the session is open.
    target = relationship("Target", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "target_id": self.target_id,
            "target": self.target.url if self.target else None,
            "target_name": self.target.name if self.target else None,
            "name": self.name,
            "status": self.status,
            "progress": self.progress,
            "findings_count": self.findings_count,
            "risk_score": self.risk_score,
            "security_score": self.security_score,
            "scan_duration": self.scan_duration,
            "methodology": self.methodology,
            "endpoints": self.endpoints,
            "error_message": self.error_message,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
