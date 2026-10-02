"""
SENTINEL — Shared data models for the security analysis pipeline.
Every scanner outputs the SAME Finding shape so the orchestrator can merge them.
"""
from enum import Enum
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ToolName(str, Enum):
    ZAP = "OWASP_ZAP"
    SEMGREP = "SEMGREP"
    OSV = "OSV"


class Evidence(BaseModel):
    """One piece of raw proof attached to a finding (hash-chained later)."""
    source: ToolName
    artifact_type: str          # "zap_alert" | "sarif_result" | "osv_vuln"
    raw: dict                   # original tool output, stored as-is
    sha256: Optional[str] = None  # filled by evidence-chain module


class Finding(BaseModel):
    """Normalized vulnerability record — identical shape from all 3 tools."""
    title: str
    description: str
    severity: Severity

    # ---- classification ----
    owasp_wstg_ids: List[str] = Field(default_factory=list)   # e.g. ["WSTG-INPV-005"]
    owasp_api_top10: List[str] = Field(default_factory=list)  # e.g. ["API1:2023"]

    # ---- proof ----
    tool: ToolName
    evidence: List[Evidence] = Field(default_factory=list)

    # ---- location ----
    target_url: Optional[str] = None
    path: Optional[str] = None            # affected URL/file path
    parameter: Optional[str] = None       # affected param / dependency name

    # ---- ids for dedup ----
    fingerprint: str                      # stable hash: tool + normalized title + path
    cve_ids: List[str] = Field(default_factory=list)
    references: List[str] = Field(default_factory=list)

    # ---- risk engine hooks (filled by CVSS module later) ----
    cvss_vector: Optional[str] = None
    cvss_score: Optional[float] = None

    # ---- workflow state (Phase 5) ----
    status: str = "OPEN"                  # OPEN -> IN_PROGRESS -> FIXED -> VERIFIED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
