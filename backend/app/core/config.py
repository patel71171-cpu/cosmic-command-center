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

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://sentinel:sentinel@localhost:5432/sentinel")

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

    # Local Ollama model used by the AI Copilot
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5vl:3b")

    model_config = {"env_file": ".env"}

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
