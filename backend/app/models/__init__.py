"""SENTINEL SQLAlchemy models.

Importing this package registers every table on the shared declarative
`Base`, so `Base.metadata.create_all()` always creates the full schema.
"""
from .user import Base, User  # noqa: F401
from .target import Target  # noqa: F401
from .assessment import Assessment  # noqa: F401
from .finding import Finding  # noqa: F401
from .evidence import Evidence  # noqa: F401
from .remediation import RemediationAction  # noqa: F401
from .retest import ReTest  # noqa: F401
from .audit_log import AuditLog  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Target",
    "Assessment",
    "Finding",
    "Evidence",
    "RemediationAction",
    "ReTest",
    "AuditLog",
]
