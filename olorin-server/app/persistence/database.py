"""
Olorin Database Configuration and Session Management

This module provides SQLAlchemy database configuration and session management
for the Olorin fraud investigation platform.
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from app.service.config import get_settings_for_env
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# SQLAlchemy Base class for models
Base = declarative_base()

# Global database session factory
_SessionLocal = None
_engine = None


def init_database():
    """Initialize database engine and session factory."""
    global _SessionLocal, _engine
    
    if _SessionLocal is not None:
        return
        
    settings = get_settings_for_env()
    
    # Use SQLite for testing, PostgreSQL for production
    database_url = getattr(settings, 'DATABASE_URL', 'sqlite:///./olorin_test.db')
    
    _engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {}
    )
    
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    
    logger.info(f"Database initialized with URL: {database_url}")


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