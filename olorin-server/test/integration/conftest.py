"""
Pytest configuration for integration tests.
Provides database fixtures and app setup.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.investigation_state import Base as InvestigationBase
from app.models.investigation_audit_log import Base as AuditBase


@pytest.fixture(scope="function")
def db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")

    # Create all tables
    InvestigationBase.metadata.create_all(engine)
    AuditBase.metadata.create_all(engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    yield session

    session.close()
    engine.dispose()
