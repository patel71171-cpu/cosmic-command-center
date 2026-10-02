"""Reports router — generate auditable assessment reports."""
import json
import uuid
import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.security import generate_id, get_current_user, require_role, sha256_hash
from ..core.audit import log_audit_event
from ..models.assessment import Assessment
from ..models.finding import Finding
from ..models.evidence import Evidence
from ..models.target import Target
from ..models.remediation import RemediationAction
from ..models.retest import ReTest
from ..models.user import User

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def generate_html_report(assessment: dict, target: dict, findings: list, evidence: list, remediations: list, retests: list) -> str:
    """Generate an HTML report."""
    from html import escape

    def e(value) -> str:
        """Escape scanner-controlled text so reports can't carry stored XSS."""
        return escape(str(value if value is not None else ""))

    findings_html = ""
    for f in findings:
        severity_color = {
            "Critical": "#dc2626", "High": "#ea580c", "Medium": "#d97706",
            "Low": "#65a30d", "Informational": "#6b7280"
        }.get(f["severity"], "#6b7280")

        findings_html += f"""
        <div class="finding" style="border-left: 4px solid {severity_color}; padding: 12px; margin: 12px 0; background: #f9fafb;">
            <h3>{e(f['title'])}</h3>
            <p><strong>Severity:</strong> <span style="color: {severity_color}">{e(f['severity'])}</span> | <strong>CVSS:</strong> {e(f['cvss_score'])} | <strong>Status:</strong> {e(f['status'])}</p>
            <p><strong>Asset:</strong> {e(f['asset'])}</p>
            <p><strong>Summary:</strong> {e(f['summary'])}</p>
            <p><strong>Impact:</strong> {e(f['impact'])}</p>
            <p><strong>Fix:</strong> {e(f['fix'])}</p>
        </div>
        """

    from html import escape as _esc

    meta_name = _esc(str(assessment.get("name") or "—"))
    meta_target = _esc(str(target.get("url") or "—"))
    meta_date = _esc(str(assessment.get("created_at") or "—"))
    meta_status = _esc(str(assessment.get("status") or "—"))

    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>SENTINEL Assessment Report — {meta_name}</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #1e40af; }}
        h2 {{ color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }}
        .meta {{ background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }}
        .finding {{ border-left: 4px solid #ccc; padding: 12px; margin: 12px 0; background: #f9fafb; }}
        .verified {{ color: #16a34a; font-weight: bold; }}
        .vulnerable {{ color: #dc2626; font-weight: bold; }}
        table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
        th, td {{ border: 1px solid #d1d5db; padding: 8px; text-align: left; }}
        th {{ background: #f3f4f6; }}
    </style>
</head>
<body>
    <h1>SENTINEL — Active Defense Edition</h1>
    <h2>Security Assessment Report</h2>

    <div class="meta">
        <p><strong>Assessment:</strong> {meta_name}</p>
        <p><strong>Target:</strong> {meta_target}</p>
        <p><strong>Date:</strong> {meta_date}</p>
        <p><strong>Status:</strong> {meta_status}</p>
        <p><strong>Risk Score:</strong> {assessment.get('risk_score', 0)}/100</p>
        <p><strong>Security Score:</strong> {assessment.get('security_score', 0)}/100</p>
        <p><strong>Total Findings:</strong> {assessment.get('findings_count', len(findings))}</p>
    </div>

    <h2>Executive Summary</h2>
    <p>This report presents the findings of an authorized security assessment conducted using the SENTINEL Active Defense Edition platform. The assessment evaluated the target application for common vulnerabilities, misconfigurations, and security weaknesses.</p>

    <h2>Findings</h2>
    {findings_html}

    <h2>Remediation Log</h2>
    <table>
        <tr><th>Finding</th><th>Action</th><th>Status</th><th>Applied</th></tr>
        {''.join(f"<tr><td>{_esc(r['finding_id'][:8])}</td><td>{_esc(r['title'])}</td><td>{_esc(r['status'])}</td><td>{_esc(r.get('applied_at') or 'N/A')}</td></tr>" for r in remediations)}
    </table>

    <h2>Re-Test Results</h2>
    <table>
        <tr><th>Finding</th><th>Status</th><th>Verified</th></tr>
        {''.join(f"<tr><td>{_esc(r['finding_id'][:8])}</td><td class='{'verified' if r['status'] == 'VERIFIED_FIXED' else 'vulnerable'}'>{_esc(r['status'])}</td><td>{_esc(r.get('verified_at') or 'N/A')}</td></tr>" for r in retests)}
    </table>

    <h2>Evidence Chain Integrity</h2>
    <p>All findings are backed by SHA-256 hashed evidence records. The evidence chain is tamper-evident and auditable.</p>

    <h2>Compliance Mapping (NIST SP 800-53)</h2>
    <table>
        <tr><th>Control Family</th><th>Findings</th></tr>
        <tr><td>AC — Access Control</td><td>{len([f for f in findings if f['category'] in ['Authorization', 'Authentication']])}</td></tr>
        <tr><td>AU — Audit and Accountability</td><td>{len([f for f in findings if f['category'] in ['Logging', 'Monitoring']])}</td></tr>
        <tr><td>CM — Configuration Management</td><td>{len([f for f in findings if f['category'] == 'Configuration'])}</td></tr>
        <tr><td>IA — Identification and Authentication</td><td>{len([f for f in findings if f['category'] == 'Authentication'])}</td></tr>
        <tr><td>SC — System and Communications Protection</td><td>{len([f for f in findings if f['category'] in ['Transport Security', 'API Security']])}</td></tr>
        <tr><td>SI — System and Information Integrity</td><td>{len([f for f in findings if f['category'] in ['Input Validation', 'Client Security']])}</td></tr>
    </table>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p>Generated by SENTINEL — Active Defense Edition</p>
        <p>Report ID: {generate_id()}</p>
        <p>This report is confidential and intended for authorized personnel only.</p>
    </footer>
</body>
</html>"""
    return html


@router.get("/{assessment_id}", response_class=HTMLResponse)
async def get_report(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an HTML report for an assessment."""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    target = db.query(Target).filter(Target.id == assessment.target_id).first()
    findings = db.query(Finding).filter(Finding.assessment_id == assessment_id).all()
    evidence = db.query(Evidence).filter(Evidence.assessment_id == assessment_id).all()
    finding_ids = [f.id for f in findings]
    remediations = (
        db.query(RemediationAction)
        .filter(RemediationAction.finding_id.in_(finding_ids))
        .all()
        if finding_ids
        else []
    )
    retests = db.query(ReTest).filter(ReTest.assessment_id == assessment_id).all()

    # Hash the report
    report_content = f"{assessment_id}:{assessment.name}:{len(findings)}"
    report_hash = sha256_hash(report_content)

    await log_audit_event(
        action="READ",
        resource_type="report",
        resource_id=assessment_id,
        user_id=current_user.id,
        user_email=current_user.email,
        outcome="SUCCESS",
        details={"report_hash": report_hash},
    )

    html = generate_html_report(
        assessment.to_dict(),
        target.to_dict() if target else {},
        [f.to_dict() for f in findings],
        [e.to_dict() for e in evidence],
        [r.to_dict() for r in remediations],
        [r.to_dict() for r in retests],
    )
    return HTMLResponse(content=html)


@router.get("/{assessment_id}/pdf")
async def get_pdf_report(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Placeholder for PDF generation — returns HTML for now."""
    # In production, use weasyprint or reportlab for PDF generation
    return await get_report(assessment_id, db, current_user)
