"""Finding model — vulnerability records."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .user import Base
from .evidence import Evidence  # noqa: F401  — registers Evidence for the relationship below

SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low", "Informational"]
FINDING_STATUSES = ["Open", "Validated", "In progress", "Verified", "False Positive", "Risk Accepted"]


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True)
    assessment_id = Column(String(36), ForeignKey("assessments.id"), nullable=False)
    title = Column(String(500), nullable=False)
    severity = Column(String(50), nullable=False)
    cvss_score = Column(Float, default=0.0)
    cvss_vector = Column(String(255), nullable=True)
    confidence = Column(String(50), default="Medium")  # High, Medium, Low
    category = Column(String(100), nullable=True)
    asset = Column(String(500), nullable=True)
    status = Column(String(50), default="Open")
    detected = Column(DateTime, default=datetime.utcnow)
    summary = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)
    fix = Column(Text, nullable=True)
    owner = Column(String(255), default="Unassigned")
    # OWASP mappings
    owasp_wstg = Column(String(50), nullable=True)  # e.g., WSTG-ATHN-01
    owasp_api_top10 = Column(String(50), nullable=True)  # e.g., API1:2023
    cve_ids = Column(Text, nullable=True)  # JSON array of CVE IDs
    ghsa_ids = Column(Text, nullable=True)  # JSON array of GHSA IDs
    # Source tool that found this
    source_tool = Column(String(100), nullable=True)  # zap, semgrep, osv, manual
    source_rule_id = Column(String(255), nullable=True)  # original rule/alert ID
    # Deduplication hash
    dedup_hash = Column(String(64), nullable=True, index=True)
    # Evidence chain
    evidence_hashes = Column(Text, nullable=True)  # JSON array of evidence hashes
    # Remediation tracking
    remediation_status = Column(String(50), default="OPEN")  # OPEN, IN_PROGRESS, FIXED
    remediation_proof = Column(Text, nullable=True)  # JSON: commit link, diff, screenshot
    # Re-test tracking
    retest_status = Column(String(50), nullable=True)  # PENDING, STILL_VULNERABLE, VERIFIED_FIXED
    retest_evidence = Column(Text, nullable=True)  # JSON: re-test scan results
    analysis = Column(Text, nullable=True)  # JSON: AI-generated investigation report

    # Loaded eagerly so `to_dict()` can expose the evidence ids the evidence
    # viewer links to, without issuing a follow-up query per finding.
    evidence_items = relationship(
        "Evidence",
        foreign_keys="[Evidence.finding_id]",
        lazy="selectin",
        order_by="Evidence.created_at",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "assessment_id": self.assessment_id,
            "title": self.title,
            "severity": self.severity,
            "cvss_score": self.cvss_score,
            "cvss_vector": self.css_vector if hasattr(self, 'css_vector') else self.cvss_vector,
            "confidence": self.confidence,
            "category": self.category,
            "asset": self.asset,
            "status": self.status,
            "detected": self.detected.isoformat() if self.detected else None,
            "summary": self.summary,
            "impact": self.impact,
            "fix": self.fix,
            "owner": self.owner,
            "owasp_wstg": self.owasp_wstg,
            "owasp_api_top10": self.owasp_api_top10,
            "cve_ids": self.cve_ids,
            "ghsa_ids": self.ghsa_ids,
            "source_tool": self.source_tool,
            "source_rule_id": self.source_rule_id,
            "dedup_hash": self.dedup_hash,
            "evidence_hashes": self.evidence_hashes,
            "evidence": [e.id for e in self.evidence_items],
            "remediation_status": self.remediation_status,
            "remediation_proof": self.remediation_proof,
            "retest_status": self.retest_status,
            "retest_evidence": self.retest_evidence,
            "analysis": self.analysis,
        }
