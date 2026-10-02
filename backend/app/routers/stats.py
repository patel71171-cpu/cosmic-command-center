"""Stats router — dashboard aggregation and risk metrics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.assessment import Assessment
from ..models.finding import Finding
from ..models.target import Target
from ..models.user import User

router = APIRouter(prefix="/api/stats", tags=["Statistics"])


@router.get("")
@router.get("/")
async def get_stats_root(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias for /api/stats/dashboard (frontend contract)."""
    return await get_dashboard_stats(db=db, current_user=current_user)


@router.get("/dashboard")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get aggregated stats for the dashboard."""
    total_targets = db.query(Target).count()
    total_assessments = db.query(Assessment).count()
    total_findings = db.query(Finding).count()

    # Severity breakdown
    severity_counts = {}
    for row in db.query(Finding.severity, func.count(Finding.id)).group_by(Finding.severity).all():
        severity_counts[row[0]] = row[1]

    # Status breakdown
    status_counts = {}
    for row in db.query(Finding.status, func.count(Finding.id)).group_by(Finding.status).all():
        status_counts[row[0]] = row[1]

    # Assessment status breakdown
    assessment_status = {}
    for row in db.query(Assessment.status, func.count(Assessment.id)).group_by(Assessment.status).all():
        assessment_status[row[0]] = row[1]

    # Average risk score
    avg_risk = db.query(func.avg(Assessment.risk_score)).scalar() or 0

    open_findings = sum(
        count for status_name, count in status_counts.items()
        if status_name in ("Open", "Validated", "In progress")
    )
    verified_findings = status_counts.get("Verified", 0)

    # Top risk findings
    top_findings = db.query(Finding).order_by(Finding.cvss_score.desc()).limit(5).all()

    return {
        "total_targets": total_targets,
        "total_assessments": total_assessments,
        "total_findings": total_findings,
        "open_findings": open_findings,
        "verified_findings": verified_findings,
        "severity_counts": severity_counts,
        "status_counts": status_counts,
        "assessment_status": assessment_status,
        "average_risk_score": round(float(avg_risk), 1),
        "top_findings": [f.to_dict() for f in top_findings],
    }


@router.get("/risk-trend")
async def get_risk_trend(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get risk score trend over time."""
    assessments = db.query(Assessment).order_by(Assessment.created_at).all()
    return [
        {
            "date": a.created_at.isoformat() if a.created_at else None,
            "risk_score": a.risk_score,
            "security_score": a.security_score,
            "findings_count": a.findings_count,
            "name": a.name,
        }
        for a in assessments
    ]
