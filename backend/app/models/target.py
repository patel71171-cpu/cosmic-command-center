"""Target model — applications being assessed."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from .user import Base


class Target(Base):
    __tablename__ = "targets"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(2048), nullable=False)
    description = Column(Text, nullable=True)
    environment = Column(String(50), default="staging")  # production, staging, development
    authorized = Column(Boolean, default=False)  # explicit authorization flag
    authorization_ref = Column(String(500), nullable=True)  # reference to authorization doc
    source_repo = Column(String(2048), nullable=True)  # Git repo URL for SAST
    dependency_manifest = Column(String(500), nullable=True)  # path to manifest file
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "environment": self.environment,
            "authorized": self.authorized,
            "authorization_ref": self.authorization_ref,
            "source_repo": self.source_repo,
            "dependency_manifest": self.dependency_manifest,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
