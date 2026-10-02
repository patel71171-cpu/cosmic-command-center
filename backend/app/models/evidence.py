"""Evidence model — files, hashes, screenshots, tool outputs."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from .user import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True)
    finding_id = Column(String(36), ForeignKey("findings.id"), nullable=True)
    assessment_id = Column(String(36), ForeignKey("assessments.id"), nullable=True)
    type = Column(String(100), nullable=False)  # http_request, http_response, scanner_output, screenshot, tool_report, config_diff, patch
    source = Column(String(255), nullable=True)  # e.g., "ZAP spider", "Semgrep SARIF"
    confidence = Column(String(50), default="Medium")
    content = Column(Text, nullable=True)  # raw content (redacted)
    content_hash = Column(String(64), nullable=False)  # SHA-256 of content
    file_path = Column(String(1000), nullable=True)  # path to stored file
    file_size = Column(Integer, default=0)
    # Hash chain
    previous_hash = Column(String(64), nullable=True)  # hash of previous record
    chain_hash = Column(String(64), nullable=False)  # hash(previous_hash + content_hash)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(36), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "assessment_id": self.assessment_id,
            "type": self.type,
            "source": self.source,
            "confidence": self.confidence,
            "content": self.content,
            "content_hash": self.content_hash,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "previous_hash": self.previous_hash,
            "chain_hash": self.chain_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by,
        }
