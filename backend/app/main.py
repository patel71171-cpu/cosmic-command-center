"""
SENTINEL — Active Defense Edition
FastAPI Backend Server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import engine
from .core.audit import AuditMiddleware
from . import models  # noqa: F401  — registers every table on Base
from .models.user import Base
from .routers import auth, targets, assessments, findings, evidence, stats, remediation, reports, copilot, investigate

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Evidence-driven security assessment platform with active defense capabilities.",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit middleware
app.add_middleware(AuditMiddleware)

# Routers
app.include_router(auth.router)
app.include_router(targets.router)
app.include_router(assessments.router)
app.include_router(findings.router)
app.include_router(evidence.router)
app.include_router(stats.router)
app.include_router(remediation.router)
app.include_router(reports.router)
app.include_router(copilot.router)
app.include_router(investigate.router)


@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api")
async def api_info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "auth": "/api/auth",
            "targets": "/api/targets",
            "assessments": "/api/assessments",
            "findings": "/api/findings",
            "evidence": "/api/evidence",
            "stats": "/api/stats",
        },
    }


class _TrailingSlashNormalizer:
    """Serve ``/api/foo`` straight from the ``/api/foo/`` route.

    Starlette's default ``redirect_slashes`` answers a missing slash with an
    absolute ``307 Location``. Behind a reverse proxy the redirect can point at
    a different origin, and browsers strip the ``Authorization`` header on
    cross-origin redirects — turning a cosmetic missing slash into a confusing
    401. Rewriting the scope in place avoids the redirect entirely.
    """

    def __init__(self, app, paths):
        self.app = app
        self.paths = paths

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if not path.endswith("/") and f"{path}/" in self.paths:
                rewritten = {**scope, "path": f"{path}/"}
                # Keep the ASGI raw_path (bytes, no query) consistent for
                # anything downstream that reads it, e.g. access logging.
                raw_path = scope.get("raw_path")
                if raw_path:
                    rewritten["raw_path"] = raw_path + b"/"
                scope = rewritten
        await self.app(scope, receive, send)


def _iter_http_paths(routes):
    """Yield the URL template of every route, descending into included routers.

    FastAPI wraps each ``include_router`` call in an ``_IncludedRouter`` that
    exposes no ``path`` of its own, so a flat scan of ``app.routes`` would miss
    every routed endpoint.
    """
    for route in routes:
        path = getattr(route, "path", None)
        if path:
            yield path
        nested = getattr(route, "original_router", None)
        if nested is not None and getattr(nested, "routes", None):
            yield from _iter_http_paths(nested.routes)


# Registered last so every route (including /api/health) is known to the
# normalizer. Paths are matched exactly, so unrelated routes are untouched.
app.add_middleware(
    _TrailingSlashNormalizer,
    paths=set(_iter_http_paths(app.routes)),
)

