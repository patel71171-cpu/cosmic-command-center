"""Re-test model — verification scan results."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from .user import Base


class ReTest(Base):
    __tablename__ = "re_tests"

    id = Column(String(36), primary_key=True)
    finding_id = Column(String(36), ForeignKey("findings.id"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("assessments.id"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, STILL_VULNERABLE, VERIFIED_FIXED
    original_evidence = Column(Text, nullable=True)  # JSON: original finding evidence
    retest_evidence = Column(Text, nullable=True)  # JSON: re-test scan results
    comparison = Column(Text, nullable=True)  # before/after comparison
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "assessment_id": self.assessment_id,
            "status": self.status,
            "original_evidence": self.original_evidence,
            "retest_evidence": self.retest_evidence,
            "comparison": self.comparison,
            "verified_by": self.verified_by,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
