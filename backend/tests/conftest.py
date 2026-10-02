"""Test configuration and fixtures."""
import pytest
from app.core.database import SessionLocal


@pytest.fixture
def db_session():
    """Provide a database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
