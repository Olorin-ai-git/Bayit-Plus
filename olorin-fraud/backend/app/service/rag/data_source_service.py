"""
Data Source Service
Manages RAG data source configurations and connections.
Supports PostgreSQL, SQLite, and Investigation Results.
All configuration from environment variables - no hardcoded values.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.service.database.models import RAGDataSource
from app.service.database.vector_database_config import get_vector_db_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataSourceService:
    """Service for managing RAG data sources."""

    def __init__(self):
        """Initialize data source service."""
        self.db_config = get_vector_db_config()

    async def create_data_source(
        self,
        name: str,
        source_type: str,
        connection_config: Dict[str, Any],
        enabled: bool = True,
    ) -> RAGDataSource:
        """Create a new data source configuration."""
        async with self.db_config.session() as session:
            data_source = RAGDataSource(
                name=name,
                source_type=source_type,
                connection_config=connection_config,
                enabled=enabled,
                status="disconnected",
            )
            session.add(data_source)
            if self.db_config.is_postgresql:
                await session.commit()
                await session.refresh(data_source)
            else:
                session.commit()
                session.refresh(data_source)

            # Eagerly access all attributes while session is still open
            _ = data_source.id
            _ = data_source.name
            _ = data_source.source_type
            _ = data_source.connection_config
            _ = data_source.enabled
            _ = data_source.status
            _ = data_source.last_checked
            _ = data_source.error_message
            _ = data_source.created_at
            _ = data_source.updated_at

            # Make object transient (detached but with loaded attributes)
            # This allows it to be used outside the session context
            from sqlalchemy.orm import make_transient

            make_transient(data_source)

            logger.info(f"Created data source: {name} ({source_type})")
            return data_source

    async def get_data_source(self, source_id: str) -> Optional[RAGDataSource]:
        """Get data source by ID."""
        async with self.db_config.session() as session:
            query = select(RAGDataSource).where(RAGDataSource.id == source_id)
            if self.db_config.is_postgresql:
                result = await session.execute(query)
            else:
                result = session.execute(query)
            data_source = result.scalar_one_or_none()

            if data_source:
                # Eagerly access all attributes while session is still open
                _ = data_source.id
                _ = data_source.name
                _ = data_source.source_type
                _ = data_source.connection_config
                _ = data_source.enabled
                _ = data_source.status
                _ = data_source.last_checked
                _ = data_source.error_message
                _ = data_source.created_at
                _ = data_source.updated_at

                # Make object transient (detached but with loaded attributes)
                from sqlalchemy.orm import make_transient

                make_transient(data_source)

            return data_source

    async def get_all_data_sources(self) -> List[RAGDataSource]:
        """Get all data sources."""
        try:
            # Ensure database is initialized
            await self.db_config.initialize_engine()

            async with self.db_config.session() as session:
                query = select(RAGDataSource).order_by(RAGDataSource.name)
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                    sources = list(result.scalars().all())
                else:
                    result = session.execute(query)
                    sources = list(result.scalars().all())

                # Eagerly access all attributes while session is still open
                # This prevents DetachedInstanceError when objects are used later
                for source in sources:
                    # Access all attributes to load them into memory
                    _ = source.id
                    _ = source.name
                    _ = source.source_type
                    _ = source.connection_config
                    _ = source.enabled
                    _ = source.status
                    _ = source.last_checked
                    _ = source.error_message
                    _ = source.created_at
                    _ = source.updated_at

                    # Make object transient (detached but with loaded attributes)
                    # This allows it to be used outside the session context
                    from sqlalchemy.orm import make_transient

                    make_transient(source)

                return sources
        except Exception as e:
            logger.warning(f"Failed to get all data sources: {e}")
            # Return empty list if database not available - allows graceful degradation
            return []

    async def get_enabled_data_sources(self) -> List[RAGDataSource]:
        """Get all enabled data sources."""
        try:
            # Ensure database is initialized
            await self.db_config.initialize_engine()

            async with self.db_config.session() as session:
                query = (
                    select(RAGDataSource)
                    .where(RAGDataSource.enabled == True)
                    .order_by(RAGDataSource.name)
                )
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                    sources = list(result.scalars().all())
                else:
                    result = session.execute(query)
                    sources = list(result.scalars().all())

                # Eagerly access all attributes while session is still open
                # This prevents DetachedInstanceError when objects are used later
                # Also make objects transient so they can be used outside the session
                for source in sources:
                    # Access all attributes to load them into memory
                    _ = source.id
                    _ = source.name
                    _ = source.source_type
                    _ = source.connection_config
                    _ = source.enabled
                    _ = source.status
                    _ = source.last_checked
                    _ = source.error_message
                    _ = source.created_at
                    _ = source.updated_at

                    # Make object transient (detached but with loaded attributes)
                    # This allows it to be used outside the session context
                    from sqlalchemy.orm import make_transient

                    make_transient(source)

                return sources
        except Exception as e:
            logger.warning(f"Failed to get enabled data sources: {e}")
            # Return empty list if database not available - allows graceful degradation
            return []

    async def update_data_source(
        self,
        source_id: str,
        name: Optional[str] = None,
        connection_config: Optional[Dict[str, Any]] = None,
        enabled: Optional[bool] = None,
    ) -> Optional[RAGDataSource]:
        """Update data source configuration."""
        async with self.db_config.session() as session:
            query = select(RAGDataSource).where(RAGDataSource.id == source_id)
            if self.db_config.is_postgresql:
                result = await session.execute(query)
            else:
                result = session.execute(query)
            data_source = result.scalar_one_or_none()

            if not data_source:
                return None

            if name is not None:
                data_source.name = name
            if connection_config is not None:
                data_source.connection_config = connection_config
            if enabled is not None:
                data_source.enabled = enabled

            if self.db_config.is_postgresql:
                await session.commit()
                await session.refresh(data_source)
            else:
                session.commit()
                session.refresh(data_source)

            logger.info(f"Updated data source: {source_id}")
            return data_source

    async def delete_data_source(self, source_id: str) -> bool:
        """Delete data source."""
        async with self.db_config.session() as session:
            query = delete(RAGDataSource).where(RAGDataSource.id == source_id)
            if self.db_config.is_postgresql:
                result = await session.execute(query)
                await session.commit()
            else:
                result = session.execute(query)
                session.commit()

            deleted = result.rowcount > 0
            if deleted:
                logger.info(f"Deleted data source: {source_id}")
            return deleted

    async def enable_data_source(self, source_id: str) -> bool:
        """Enable a data source."""
        return await self.update_data_source(source_id, enabled=True) is not None

    async def disable_data_source(self, source_id: str) -> bool:
        """Disable a data source."""
        return await self.update_data_source(source_id, enabled=False) is not None

    async def test_connection(self, source_id: str) -> Dict[str, Any]:
        """Test connection to a data source."""
        data_source = await self.get_data_source(source_id)
        if not data_source:
            return {"success": False, "error": "Data source not found"}

        try:
            if data_source.source_type == "postgresql":
                return await self._test_postgresql(data_source)
            elif data_source.source_type == "sqlite":
                return await self._test_sqlite(data_source)
            elif data_source.source_type == "investigation_results":
                return await self._test_investigation_results(data_source)
            else:
                return {
                    "success": False,
                    "error": f"Unknown source type: {data_source.source_type}",
                }
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {"success": False, "error": str(e)}

    async def _test_postgresql(self, data_source: RAGDataSource) -> Dict[str, Any]:
        """Test PostgreSQL connection."""
        try:
            import asyncpg

            config = data_source.connection_config
            conn = await asyncpg.connect(
                host=config.get("host"),
                port=config.get("port", 5432),
                database=config.get("database"),
                user=config.get("user"),
                password=config.get("password"),
            )
            await conn.execute("SELECT 1")
            await conn.close()

            await self._update_status(data_source.id, "connected", None)
            return {"success": True, "status": "connected"}
        except Exception as e:
            await self._update_status(data_source.id, "error", str(e))
            return {"success": False, "error": str(e)}

    async def _test_sqlite(self, data_source: RAGDataSource) -> Dict[str, Any]:
        """Test SQLite connection."""
        try:
            import sqlite3

            file_path = data_source.connection_config.get("file_path")
            if not file_path or not os.path.exists(file_path):
                raise FileNotFoundError(f"SQLite file not found: {file_path}")

            conn = sqlite3.connect(file_path)
            conn.execute("SELECT 1")
            conn.close()

            await self._update_status(data_source.id, "connected", None)
            return {"success": True, "status": "connected"}
        except Exception as e:
            await self._update_status(data_source.id, "error", str(e))
            return {"success": False, "error": str(e)}

    async def _test_investigation_results(
        self, data_source: RAGDataSource
    ) -> Dict[str, Any]:
        """Test investigation results data source."""
        try:
            from sqlalchemy import select

            from app.models.investigation_state import InvestigationState
            from app.persistence.database import get_db_session

            with get_db_session() as session:
                query = select(InvestigationState).limit(1)
                result = session.execute(query)
                result.fetchone()

            await self._update_status(data_source.id, "connected", None)
            return {"success": True, "status": "connected"}
        except Exception as e:
            await self._update_status(data_source.id, "error", str(e))
            return {"success": False, "error": str(e)}

    async def _update_status(
        self, source_id: str, status: str, error_message: Optional[str]
    ) -> None:
        """Update data source status."""
        async with self.db_config.session() as session:
            query = (
                update(RAGDataSource)
                .where(RAGDataSource.id == source_id)
                .values(
                    status=status,
                    error_message=error_message,
                    last_checked=datetime.utcnow(),
                )
            )
            if self.db_config.is_postgresql:
                await session.execute(query)
                await session.commit()
            else:
                session.execute(query)
                session.commit()


_global_service: Optional[DataSourceService] = None


def get_data_source_service() -> DataSourceService:
    """Get global data source service."""
    global _global_service
    if _global_service is None:
        _global_service = DataSourceService()
    return _global_service
