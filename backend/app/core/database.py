"""Database connection and session management.

Uses PostgreSQL when available (production / Docker), and transparently
falls back to a local SQLite file so the app always boots in dev.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .config import settings


def _build_engine():
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    fallback = "sqlite:///./sentinel.db"
    try:
        eng = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        with eng.connect():
            pass
        return eng
    except Exception:
        # psycopg missing or Postgres unreachable — fall back to SQLite so the API still boots
        os.environ["DATABASE_URL"] = fallback
        return create_engine(fallback, connect_args={"check_same_thread": False})


engine = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
