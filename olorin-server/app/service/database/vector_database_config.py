"""
Vector Database Configuration
Supports PostgreSQL + pgvector for RAG system.
All configuration from environment variables - no hardcoded values.
"""

import os
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session

from app.service.config import get_settings_for_env
from app.service.database_config import build_database_url, get_database_password
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class VectorDatabaseConfig:
    """Vector database configuration supporting PostgreSQL + pgvector."""
    
    def __init__(self):
        """Initialize vector database configuration from environment."""
        self.settings = get_settings_for_env()
        self.database_url = self._get_database_url()
        self.is_postgresql = self.database_url.startswith("postgresql")
        if not self.is_postgresql:
            logger.warning(f"Non-PostgreSQL database URL detected: {self.database_url[:50]}... PostgreSQL is required for vector database.")
        self._async_engine = None
        self._async_session_factory = None
        
    def _get_database_url(self) -> str:
        """Get database URL from environment or settings.
        
        Returns PostgreSQL URL (SQLite support removed).
        """
        rag_db_url = os.getenv("RAG_DATABASE_URL")
        if rag_db_url:
            return rag_db_url
            
        database_url = getattr(self.settings, 'DATABASE_URL', None)
        if database_url:
            return database_url
            
        db_host = os.getenv("DB_HOST")
        if db_host:
            return build_database_url(self.settings)
        
        # Default to building PostgreSQL URL from settings
        return build_database_url(self.settings)
    
    async def initialize_engine(self) -> None:
        """Initialize PostgreSQL database engine (SQLite support removed)."""
        if not self.is_postgresql:
            raise ValueError(f"PostgreSQL is required for vector database. Got: {self.database_url[:50]}...")
        await self._initialize_postgresql()
    
    async def _initialize_postgresql(self) -> None:
        """Initialize PostgreSQL with pgvector support."""
        try:
            async_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
            self._async_engine = create_async_engine(
                async_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                echo=False
            )
            self._async_session_factory = async_sessionmaker(
                self._async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            async with self._async_engine.begin() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            logger.info("PostgreSQL + pgvector engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL: {e}")
            raise
    
    @asynccontextmanager
    async def session(self):
        """Get async PostgreSQL database session."""
        if not self.is_postgresql:
            raise ValueError("PostgreSQL is required for vector database")
        if not self._async_session_factory:
            await self.initialize_engine()
        async with self._async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    async def execute_raw_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> list:
        """Execute raw SQL query (PostgreSQL only)."""
        async with self.session() as session:
            result = await session.execute(text(query), params or {})
            return [dict(row._mapping) for row in result]
    
    async def create_vector_index(
        self,
        table_name: str,
        column_name: str,
        index_type: str = "ivfflat",
        lists: int = 100,
        operator_class: str = "vector_cosine_ops"
    ) -> None:
        """Create vector index (PostgreSQL only)."""
        if not self.is_postgresql:
            logger.warning("Vector indexes only supported on PostgreSQL")
            return
            
        index_name = f"idx_{table_name}_{column_name}_{index_type}"
        query = f"""
            CREATE INDEX IF NOT EXISTS {index_name}
            ON {table_name}
            USING {index_type} ({column_name} {operator_class})
            WITH (lists = {lists})
        """
        
        try:
            async with self.session() as session:
                await session.execute(text(query))
                await session.commit()
            logger.info(f"Created vector index: {index_name}")
        except Exception as e:
            logger.warning(f"Failed to create vector index: {e}")
    
    async def close(self) -> None:
        """Close database connections."""
        if self._async_engine:
            await self._async_engine.dispose()


_global_config: Optional[VectorDatabaseConfig] = None


def get_vector_db_config() -> VectorDatabaseConfig:
    """Get global vector database configuration."""
    global _global_config
    if _global_config is None:
        _global_config = VectorDatabaseConfig()
    return _global_config


async def initialize_vector_database() -> None:
    """Initialize vector database."""
    config = get_vector_db_config()
    await config.initialize_engine()


async def cleanup_vector_database() -> None:
    """Cleanup vector database connections."""
    global _global_config
    if _global_config:
        await _global_config.close()
        _global_config = None

