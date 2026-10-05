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

    # SQLAlchemy 2.1 dropped psycopg2 as the implicit driver for a bare
    # "postgresql://" URL; it now expects psycopg (v3). This project ships
    # psycopg2-binary, so make the driver explicit rather than silently
    # falling back to SQLite with a confusing error.
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

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
    except Exception as exc:
        # Falling back keeps the API bootable, but silence here previously hid
        # a missing database driver and made the app look like it had lost its
        # data. Say so loudly instead.
        print(
            "[SENTINEL] DATABASE WARNING: cannot reach %s (%s: %s). "
            "FALLING BACK TO SQLITE at %s — data will NOT be the real database."
            % (url.split("@")[-1], type(exc).__name__, str(exc)[:160], fallback),
            flush=True,
        )
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
