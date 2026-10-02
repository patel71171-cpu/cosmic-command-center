"""Celery application — durable async scan execution.

FastAPI's ``BackgroundTasks`` run inside the API process and die with it, so a
scan interrupted by a deploy or crash is lost. This module is the Celery entry
point used by the ``worker`` service in ``docker-compose.yml``; it dispatches
the same pipeline the API uses.
"""
import asyncio

from celery import Celery

from .core.config import settings

celery_app = Celery(
    "sentinel",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Redis is restarted alongside the worker in compose, so don't fail the
    # boot sequence while the broker is still coming up.
    broker_connection_retry_on_startup=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@celery_app.task(name="sentinel.run_assessment", bind=True)
def run_assessment(self, assessment_id: str, target_id: str) -> dict:
    """Run the full assessment pipeline for ``assessment_id``."""
    from .core.database import SessionLocal
    from .models.target import Target
    from .services.pipeline import run_assessment_pipeline

    db = SessionLocal()
    try:
        target = db.query(Target).filter(Target.id == target_id).first()
        if target is None:
            return {"assessment_id": assessment_id, "status": "FAILED", "error": "target not found"}
        asyncio.run(run_assessment_pipeline(assessment_id, target))
        return {"assessment_id": assessment_id, "status": "QUEUED_TASK_COMPLETE"}
    finally:
        db.close()
