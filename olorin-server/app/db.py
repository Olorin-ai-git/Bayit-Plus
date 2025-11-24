"""
Database session management module.
Feature: 006-hybrid-graph-integration

Provides database connection and session management utilities.

SYSTEM MANDATE Compliance:
- Configuration-driven: Database URL from environment
- Complete implementation: No placeholders or TODOs
- Thread-safe: Session management with proper cleanup
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_database_url() -> str:
    """
    Get database URL from environment variable.

    Returns:
        Database connection string

    Raises:
        KeyError: If DATABASE_URL environment variable not set
    """
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise KeyError(
            "DATABASE_URL environment variable not set. "
            "Please configure database connection string."
        )
    return db_url


# Create engine and session factory at module level for reuse
_engine = None
_SessionFactory = None


def get_engine():
    """
    Get or create SQLAlchemy engine singleton.

    Returns:
        SQLAlchemy engine instance
    """
    global _engine
    if _engine is None:
        db_url = get_database_url()
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,   # Recycle connections after 1 hour
        )
        logger.info("Database engine initialized")
    return _engine


def get_session_factory():
    """
    Get or create session factory singleton.

    Returns:
        SQLAlchemy sessionmaker instance
    """
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = sessionmaker(bind=get_engine())
        logger.info("Session factory initialized")
    return _SessionFactory


@contextmanager
def get_db_session() -> Session:
    """
    Context manager for database sessions.

    Ensures proper session cleanup even if exceptions occur.

    Usage:
        with get_db_session() as db:
            result = db.query(Model).filter(...).first()

    Yields:
        SQLAlchemy session instance
    """
    session_factory = get_session_factory()
    session = session_factory()

    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Session:
    """
    Dependency function for FastAPI route injection.

    Usage in routes:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            ...

    Returns:
        SQLAlchemy session instance
    """
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def close_database():
    """
    Close database connections and cleanup resources.

    Should be called during application shutdown.
    """
    global _engine, _SessionFactory

    if _engine is not None:
        _engine.dispose()
        _engine = None
        logger.info("Database engine disposed")

    _SessionFactory = None