"""
Multi-Entity Investigation Result Storage and Retrieval

Provides persistent storage and retrieval for multi-entity investigation results
with caching, compression, and efficient querying capabilities.
"""

import asyncio
import base64
import gzip
import hashlib
import json
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MultiEntityResultStorage:
    """
    Storage manager for multi-entity investigation results.

    Features:
    - SQLite-based persistent storage with async operations
    - Result compression for large investigation data
    - TTL-based automatic cleanup
    - Efficient indexing for fast retrieval
    - Result caching for frequently accessed investigations
    """

    def __init__(self, db_path: str = "multi_entity_results.db", ttl_days: int = 30):
        self.db_path = Path(db_path)
        self.ttl_days = ttl_days
        self.cache = {}  # In-memory cache
        self.cache_max_size = 100
        self._initialized = False

    async def initialize(self):
        """Initialize the storage system"""
        if self._initialized:
            return

        await self._create_tables()
        await self._cleanup_expired_results()
        self._initialized = True
        logger.info(f"MultiEntityResultStorage initialized with DB: {self.db_path}")

    async def _create_tables(self):
        """Create database tables for result storage"""
        async with self._get_connection() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS investigation_results (
                    investigation_id TEXT PRIMARY KEY,
                    request_data TEXT NOT NULL,
                    result_data BLOB NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    compressed BOOLEAN DEFAULT TRUE,
                    result_hash TEXT NOT NULL,
                    entity_count INTEGER NOT NULL,
                    boolean_logic TEXT,
                    total_duration_ms INTEGER DEFAULT 0
                )
            """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_investigation_status 
                ON investigation_results(status)
            """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_investigation_created 
                ON investigation_results(created_at)
            """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_investigation_expires 
                ON investigation_results(expires_at)
            """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_entity_count 
                ON investigation_results(entity_count)
            """
            )

            await conn.commit()

    @asynccontextmanager
    async def _get_connection(self):
        """Get async database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _compress_data(self, data: str) -> bytes:
        """Compress result data using gzip"""
        return gzip.compress(data.encode("utf-8"))

    def _decompress_data(self, data: bytes) -> str:
        """Decompress result data"""
        return gzip.decompress(data).decode("utf-8")

    def _generate_result_hash(self, result: MultiEntityInvestigationResult) -> str:
        """Generate hash of result data for deduplication"""
        result_str = json.dumps(result.dict(), sort_keys=True, default=str)
        return hashlib.sha256(result_str.encode()).hexdigest()[:16]

    async def store_result(
        self,
        investigation_id: str,
        request: MultiEntityInvestigationRequest,
        result: MultiEntityInvestigationResult,
    ) -> bool:
        """
        Store investigation result with metadata.

        Args:
            investigation_id: Unique investigation identifier
            request: Original investigation request
            result: Investigation result to store

        Returns:
            True if stored successfully, False otherwise
        """
        try:
            # Prepare data
            request_json = json.dumps(request.dict(), default=str)
            result_json = json.dumps(result.dict(), default=str)
            result_blob = self._compress_data(result_json)
            result_hash = self._generate_result_hash(result)

            now = datetime.utcnow()
            expires_at = now + timedelta(days=self.ttl_days)

            async with self._get_connection() as conn:
                await conn.execute(
                    """
                    INSERT OR REPLACE INTO investigation_results 
                    (investigation_id, request_data, result_data, status, created_at, 
                     updated_at, expires_at, compressed, result_hash, entity_count, 
                     boolean_logic, total_duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        investigation_id,
                        request_json,
                        result_blob,
                        result.status,
                        now,
                        now,
                        expires_at,
                        True,
                        result_hash,
                        len(result.entities),
                        result.boolean_logic,
                        result.total_duration_ms,
                    ),
                )
                await conn.commit()

            # Update cache
            self._update_cache(investigation_id, result)

            logger.info(
                f"Stored result for investigation {investigation_id} "
                f"(entities: {len(result.entities)}, duration: {result.total_duration_ms}ms)"
            )

            return True

        except Exception as e:
            logger.error(f"Failed to store result for {investigation_id}: {str(e)}")
            return False

    async def get_result(
        self, investigation_id: str
    ) -> Optional[MultiEntityInvestigationResult]:
        """
        Retrieve investigation result by ID.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Investigation result if found, None otherwise
        """
        # Check cache first
        if investigation_id in self.cache:
            logger.debug(f"Cache hit for investigation {investigation_id}")
            return self.cache[investigation_id]

        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    SELECT result_data, compressed, status, updated_at
                    FROM investigation_results 
                    WHERE investigation_id = ? AND expires_at > ?
                """,
                    (investigation_id, datetime.utcnow()),
                )

                row = cursor.fetchone()
                if not row:
                    return None

                # Decompress and parse result
                result_data = row["result_data"]
                if row["compressed"]:
                    result_json = self._decompress_data(result_data)
                else:
                    result_json = result_data.decode("utf-8")

                result_dict = json.loads(result_json)
                result = MultiEntityInvestigationResult(**result_dict)

                # Update cache
                self._update_cache(investigation_id, result)

                logger.debug(f"Retrieved result for investigation {investigation_id}")
                return result

        except Exception as e:
            logger.error(f"Failed to retrieve result for {investigation_id}: {str(e)}")
            return None

    async def get_investigation_status(
        self, investigation_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get investigation status and metadata.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Status information if found, None otherwise
        """
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    SELECT investigation_id, status, created_at, updated_at, 
                           entity_count, boolean_logic, total_duration_ms
                    FROM investigation_results 
                    WHERE investigation_id = ? AND expires_at > ?
                """,
                    (investigation_id, datetime.utcnow()),
                )

                row = cursor.fetchone()
                if not row:
                    return None

                return {
                    "investigation_id": row["investigation_id"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "entity_count": row["entity_count"],
                    "boolean_logic": row["boolean_logic"],
                    "total_duration_ms": row["total_duration_ms"],
                }

        except Exception as e:
            logger.error(f"Failed to get status for {investigation_id}: {str(e)}")
            return None

    async def update_investigation_status(
        self, investigation_id: str, status: str
    ) -> bool:
        """
        Update investigation status.

        Args:
            investigation_id: Investigation identifier
            status: New status value

        Returns:
            True if updated successfully, False otherwise
        """
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    UPDATE investigation_results 
                    SET status = ?, updated_at = ? 
                    WHERE investigation_id = ?
                """,
                    (status, datetime.utcnow(), investigation_id),
                )

                await conn.commit()
                success = cursor.rowcount > 0

                if success:
                    logger.debug(f"Updated status for {investigation_id} to {status}")

                return success

        except Exception as e:
            logger.error(f"Failed to update status for {investigation_id}: {str(e)}")
            return False

    async def list_investigations(
        self, status_filter: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List investigations with optional filtering.

        Args:
            status_filter: Filter by status (optional)
            limit: Maximum number of results
            offset: Results offset for pagination

        Returns:
            List of investigation summaries
        """
        try:
            query = """
                SELECT investigation_id, status, created_at, updated_at, 
                       entity_count, boolean_logic, total_duration_ms
                FROM investigation_results 
                WHERE expires_at > ?
            """
            params = [datetime.utcnow()]

            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            async with self._get_connection() as conn:
                cursor = await conn.execute(query, params)
                rows = cursor.fetchall()

                return [
                    {
                        "investigation_id": row["investigation_id"],
                        "status": row["status"],
                        "created_at": row["created_at"],
                        "updated_at": row["updated_at"],
                        "entity_count": row["entity_count"],
                        "boolean_logic": row["boolean_logic"],
                        "total_duration_ms": row["total_duration_ms"],
                    }
                    for row in rows
                ]

        except Exception as e:
            logger.error(f"Failed to list investigations: {str(e)}")
            return []

    async def delete_result(self, investigation_id: str) -> bool:
        """
        Delete investigation result.

        Args:
            investigation_id: Investigation identifier

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    DELETE FROM investigation_results 
                    WHERE investigation_id = ?
                """,
                    (investigation_id,),
                )

                await conn.commit()
                success = cursor.rowcount > 0

                if success:
                    # Remove from cache
                    self.cache.pop(investigation_id, None)
                    logger.info(f"Deleted result for investigation {investigation_id}")

                return success

        except Exception as e:
            logger.error(f"Failed to delete result for {investigation_id}: {str(e)}")
            return False

    async def _cleanup_expired_results(self):
        """Clean up expired investigation results"""
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    DELETE FROM investigation_results 
                    WHERE expires_at <= ?
                """,
                    (datetime.utcnow(),),
                )

                await conn.commit()
                deleted_count = cursor.rowcount

                if deleted_count > 0:
                    logger.info(
                        f"Cleaned up {deleted_count} expired investigation results"
                    )

                return deleted_count

        except Exception as e:
            logger.error(f"Failed to cleanup expired results: {str(e)}")
            return 0

    def _update_cache(
        self, investigation_id: str, result: MultiEntityInvestigationResult
    ):
        """Update in-memory cache with LRU eviction"""
        # Remove oldest entries if cache is full
        if len(self.cache) >= self.cache_max_size:
            # Remove first item (oldest)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]

        # Add/update result
        self.cache[investigation_id] = result

    def clear_cache(self):
        """Clear in-memory cache"""
        self.cache.clear()
        logger.info("Cleared result cache")

    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            async with self._get_connection() as conn:
                cursor = await conn.execute(
                    """
                    SELECT 
                        COUNT(*) as total_investigations,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                        AVG(entity_count) as avg_entity_count,
                        AVG(total_duration_ms) as avg_duration_ms,
                        SUM(LENGTH(result_data)) as total_storage_bytes
                    FROM investigation_results 
                    WHERE expires_at > ?
                """,
                    (datetime.utcnow(),),
                )

                row = cursor.fetchone()

                return {
                    "total_investigations": row["total_investigations"],
                    "completed": row["completed"],
                    "in_progress": row["in_progress"],
                    "failed": row["failed"],
                    "avg_entity_count": round(row["avg_entity_count"] or 0, 2),
                    "avg_duration_ms": round(row["avg_duration_ms"] or 0, 2),
                    "total_storage_bytes": row["total_storage_bytes"] or 0,
                    "cache_size": len(self.cache),
                    "cache_max_size": self.cache_max_size,
                    "ttl_days": self.ttl_days,
                }

        except Exception as e:
            logger.error(f"Failed to get storage stats: {str(e)}")
            return {}


# Global storage instance
_storage_instance: Optional[MultiEntityResultStorage] = None


async def get_result_storage() -> MultiEntityResultStorage:
    """Get global result storage instance"""
    global _storage_instance

    if _storage_instance is None:
        _storage_instance = MultiEntityResultStorage()
        await _storage_instance.initialize()

    return _storage_instance
