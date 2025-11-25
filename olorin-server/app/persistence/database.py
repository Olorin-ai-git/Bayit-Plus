"""
Olorin Database Configuration and Session Management

This module provides SQLAlchemy database configuration and session management
for the Olorin fraud investigation platform.
"""

import os
import uuid
from contextlib import contextmanager
from typing import Generator, Tuple

from fastapi import HTTPException, status
from sqlalchemy import JSON, String, TypeDecorator, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.service.config import get_settings_for_env
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# SQLAlchemy Base class for models
Base = declarative_base()

# Global database session factory
_SessionLocal = None
_engine = None


class JSONType(TypeDecorator):
    """
    Database-agnostic JSON column type.
    Uses JSONB for PostgreSQL and JSON for SQLite/other databases.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        else:
            return dialect.type_descriptor(JSON())


class UUIDType(TypeDecorator):
    """
    Database-agnostic UUID column type.
    Uses PostgreSQL UUID for PostgreSQL and String(36) for SQLite/other databases.
    """

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PostgresUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value
        else:
            return str(value) if isinstance(value, uuid.UUID) else value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value
        else:
            return uuid.UUID(value) if isinstance(value, str) else value


def init_database():
    """Initialize database engine and session factory."""
    global _SessionLocal, _engine

    if _SessionLocal is not None:
        return

    settings = get_settings_for_env()

    # Use PostgreSQL (default to localhost if DATABASE_URL not set)
    database_url = getattr(settings, "DATABASE_URL", None)
    if not database_url:
        # Build PostgreSQL URL from environment variables or defaults
        from app.service.database_config import build_database_url

        database_url = build_database_url(settings)

    _engine = create_engine(
        database_url,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,
        max_overflow=10,
    )

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    logger.info(
        f"Database initialized with URL: {database_url[:50]}..."
    )  # Don't log full URL with password


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.

    Yields:
        Database session
    """
    if _SessionLocal is None:
        init_database()

    db = _SessionLocal()
    try:
        yield db
    except HTTPException as e:
        # Don't log 304 Not Modified as an error - it's a valid HTTP response
        if e.status_code != status.HTTP_304_NOT_MODIFIED:
            logger.error(f"Database session HTTP error: {e}")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.

    Yields:
        Database session
    """
    if _SessionLocal is None:
        init_database()

    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except HTTPException as e:
        # Don't log 304 Not Modified as an error - it's a valid HTTP response
        if e.status_code != status.HTTP_304_NOT_MODIFIED:
            logger.error(f"Database session HTTP error: {e}")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    if _engine is None:
        init_database()

    Base.metadata.create_all(bind=_engine)
    logger.info("Database tables created")


def drop_tables():
    """Drop all database tables."""
    if _engine is None:
        init_database()

    Base.metadata.drop_all(bind=_engine)
    logger.info("Database tables dropped")


def get_engine():
    """Get the SQLAlchemy engine instance."""
    if _engine is None:
        init_database()
    return _engine


def check_postgres_running() -> Tuple[bool, str]:
    """
    Check if PostgreSQL server is running and accessible.

    Returns:
        Tuple of (is_running: bool, error_message: str)
        If is_running is True, error_message will be empty.
        If is_running is False, error_message will contain the reason.
    """
    try:
        settings = get_settings_for_env()

        # Build database URL to get connection parameters
        database_url = getattr(settings, "DATABASE_URL", None)
        if not database_url:
            from app.service.database_config import build_database_url

            database_url = build_database_url(settings)

        # Try to create a test connection
        test_engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},  # 5 second timeout
        )

        # Attempt to connect and execute a simple query
        with test_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()

        test_engine.dispose()
        logger.info("✅ PostgreSQL server is running and accessible")
        return True, ""

    except OperationalError as e:
        error_msg = str(e)
        logger.error(f"❌ PostgreSQL connection failed: {error_msg}")
        return False, f"PostgreSQL server is not running or not accessible: {error_msg}"
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ PostgreSQL health check failed: {error_msg}")
        return False, f"PostgreSQL health check failed: {error_msg}"


def ensure_required_tables_exist():
    """
    Ensure all required database tables exist, creating them if they don't.

    This function checks for required tables and creates any missing ones.
    It imports all models to ensure they're registered with Base metadata.
    """
    try:
        engine = get_engine()

        # Import all models to ensure they're registered with Base metadata
        # This ensures all tables are included in metadata before checking
        from sqlalchemy import inspect

        from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
        from app.models.composio_action_audit import ComposioActionAudit
        from app.models.composio_connection import ComposioConnection
        from app.models.investigation_state import InvestigationState
        from app.models.soar_playbook_execution import SOARPlaybookExecution

        # Note: InvestigationTemplate and InvestigationAuditLog use separate Base classes
        # They are handled separately if needed, but the main tables use app.persistence.database.Base
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        # Get all tables defined in Base metadata (main Base from app.persistence.database)
        required_tables = set(Base.metadata.tables.keys())

        missing_tables = required_tables - existing_tables

        if missing_tables:
            logger.info(
                f"📋 Creating {len(missing_tables)} missing table(s): {missing_tables}"
            )
            # Create all missing tables using Base.metadata
            Base.metadata.create_all(bind=engine, checkfirst=True)
            logger.info(f"✅ Created missing table(s)")
        else:
            logger.info(f"✅ All required tables exist: {sorted(required_tables)}")

    except Exception as e:
        logger.error(f"❌ Failed to ensure required tables exist: {e}", exc_info=True)
        raise
