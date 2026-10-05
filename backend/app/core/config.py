"""Application configuration."""
import json
import os
import secrets
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings

# Auto-generated signing key lives next to the app root (backend/.jwt_secret).
_SECRET_FILE = Path(
    os.getenv("JWT_SECRET_FILE", str(Path(__file__).resolve().parents[2] / ".jwt_secret"))
)


def _resolve_jwt_secret() -> str:
    """Prefer an explicit key, otherwise mint one and persist it.

    The previous default was a publicly known literal, so any deployment that
    forgot to set ``JWT_SECRET`` accepted forged admin tokens. A generated key
    survives restarts (so users stay signed in) without shipping a forgeable
    constant.
    """
    env = os.getenv("JWT_SECRET")
    if env:
        return env

    try:
        existing = _SECRET_FILE.read_text(encoding="utf-8").strip()
        if existing:
            return existing
    except FileNotFoundError:
        # First run — fall through and mint a key below.
        pass
    except OSError:
        # Unreadable path; use an ephemeral key rather than a known constant.
        return secrets.token_hex(32)

    generated = secrets.token_hex(32)
    try:
        _SECRET_FILE.write_text(generated, encoding="utf-8")
        try:
            os.chmod(_SECRET_FILE, 0o600)
        except OSError:  # Windows or read-only volume
            pass
    except OSError:
        # Write failed (read-only filesystem): keep the in-memory key, which at
        # worst signs users out on restart rather than accepting a known secret.
        pass
    return generated


class Settings(BaseSettings):
    APP_NAME: str = "SENTINEL — Active Defense Edition"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database. The driver is named explicitly: SQLAlchemy 2.1 no longer
    # defaults a bare postgresql:// to psycopg2, so omitting it would fail with
    # "No module named 'psycopg'" and silently drop the app onto the SQLite
    # fallback below.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://sentinel:sentinel@localhost:5432/sentinel",
    )

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # JWT
    JWT_SECRET: str = _resolve_jwt_secret()
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Sandbox
    SANDBOX_NETWORK: str = os.getenv("SANDBOX_NETWORK", "sentinel-sandbox")
    SANDBOX_MEMORY_LIMIT: str = os.getenv("SANDBOX_MEMORY_LIMIT", "512m")
    SANDBOX_CPU_LIMIT: float = float(os.getenv("SANDBOX_CPU_LIMIT", "0.5"))
    SANDBOX_TIMEOUT_SECONDS: int = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "300"))

    # Evidence storage
    EVIDENCE_STORAGE_PATH: str = os.getenv("EVIDENCE_STORAGE_PATH", "./evidence_storage")

    # CORS — comma-separated origins (a JSON array also works).
    CORS_ORIGINS: str = "http://localhost:3002,http://localhost:3000"

    # ── AI provider ──────────────────────────────────────────────────────
    # Self-hosted Ollama used by the AI Copilot.
    #   OLLAMA_HOST — base URL of the Ollama server. In Docker this is the
    #                 compose service name (http://ollama:11434); for a bare
    #                 local run it is the default below.
    #   OLLAMA_MODEL — the model to request. It must already be pulled into
    #                  whichever Ollama instance OLLAMA_HOST points at.
    # OLLAMA_URL is accepted as a legacy alias so existing .env files keep
    # working, but OLLAMA_HOST takes precedence.
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", os.getenv("OLLAMA_URL", "http://localhost:11434"))
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5vl:3b")

    # How long to wait on a generation before giving up, and how long to wait
    # when merely checking whether the server is up.
    OLLAMA_TIMEOUT_SECONDS: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))
    OLLAMA_PROBE_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_PROBE_TIMEOUT_SECONDS", "5"))

    model_config = {"env_file": ".env"}

    @property
    def ollama_url(self) -> str:
        """Base URL of the Ollama server, normalised without a trailing slash.

        Accepts a bare host:port (as `ollama` or `ollama:11434`), which is what
        the Ollama tooling itself uses, and fills in the scheme.
        """
        raw = (self.OLLAMA_HOST or "").strip().rstrip("/")
        if not raw:
            return "http://localhost:11434"
        if not raw.startswith(("http://", "https://")):
            raw = "http://" + raw
        return raw

    @model_validator(mode="after")
    def _reject_blank_jwt_secret(self) -> "Settings":
        # A `.env` entry like `JWT_SECRET=` (or a blank env var) would otherwise
        # sign tokens with an empty key. Fall back to the generated secret.
        if not (self.JWT_SECRET or "").strip():
            object.__setattr__(self, "JWT_SECRET", _resolve_jwt_secret())
        return self

    @property
    def cors_origins(self) -> list[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                return [str(o).strip() for o in json.loads(raw) if str(o).strip()]
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()
