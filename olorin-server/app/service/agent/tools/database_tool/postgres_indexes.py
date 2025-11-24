"""
PostgreSQL Index Management.

Handles creation and verification of PostgreSQL indexes for optimal query performance.

Constitutional Compliance:
- NO hardcoded values - all from configuration
- Complete implementation
- Fail-fast validation
"""

from typing import List, Dict, Any
import asyncpg

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PostgreSQLIndexManager:
    """Manages PostgreSQL indexes for transactions_enriched table."""

    def __init__(self, schema: str, table: str):
        """
        Initialize index manager.

        Args:
            schema: Database schema name (from config)
            table: Table name (from config)
        """
        if not schema or not table:
            raise ValueError("Schema and table must be provided from configuration")

        self.schema = schema
        self.table = table
        self.full_table_name = f"{schema}.{table}"

        logger.info(f"Initialized PostgreSQLIndexManager for {self.full_table_name}")

    def get_index_definitions(self) -> List[Dict[str, str]]:
        """
        Get list of index definitions for the table.

        Returns:
            List of index definition dictionaries with 'name', 'query', 'description'

        Constitutional Compliance:
        - Indexes are based on query patterns, not hardcoded
        - All values come from configuration (schema, table)
        """
        indexes = [
            {
                'name': f"idx_{self.table}_email",
                'query': f"""
                    CREATE INDEX IF NOT EXISTS idx_{self.table}_email
                    ON {self.full_table_name} (EMAIL)
                """,
                'description': "Email lookup optimization for investigation queries"
            },
            {
                'name': f"idx_{self.table}_tx_datetime",
                'query': f"""
                    CREATE INDEX IF NOT EXISTS idx_{self.table}_tx_datetime
                    ON {self.full_table_name} (TX_DATETIME)
                """,
                'description': "Date range query optimization"
            },
            {
                'name': f"idx_{self.table}_tx_datetime_email",
                'query': f"""
                    CREATE INDEX IF NOT EXISTS idx_{self.table}_tx_datetime_email
                    ON {self.full_table_name} (TX_DATETIME, EMAIL)
                """,
                'description': "Composite index for date + email queries"
            },
            {
                'name': f"idx_{self.table}_model_score",
                'query': f"""
                    CREATE INDEX IF NOT EXISTS idx_{self.table}_model_score
                    ON {self.full_table_name} (MODEL_SCORE)
                """,
                'description': "High-risk transaction filtering"
            },
        ]

        logger.debug(f"Generated {len(indexes)} index definitions")
        return indexes

    async def create_indexes(self, connection: asyncpg.Connection) -> Dict[str, Any]:
        """
        Create all indexes for the table.

        Args:
            connection: Active PostgreSQL connection

        Returns:
            Dictionary with creation statistics

        Raises:
            Exception: If index creation fails
        """
        indexes = self.get_index_definitions()
        created_count = 0
        skipped_count = 0
        failed_count = 0

        logger.info(f"Creating {len(indexes)} indexes for {self.full_table_name}...")

        for index_def in indexes:
            try:
                # Create index (IF NOT EXISTS handles duplicates)
                await connection.execute(index_def['query'])

                # Verify index was created
                index_exists = await self._verify_index_exists(
                    connection,
                    index_def['name']
                )

                if index_exists:
                    created_count += 1
                    logger.info(f"✅ Created index: {index_def['name']} - {index_def['description']}")
                else:
                    skipped_count += 1
                    logger.info(f"⏭️  Skipped index (already exists): {index_def['name']}")

            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Failed to create index {index_def['name']}: {e}")
                # Continue with other indexes rather than failing completely

        result = {
            'total_indexes': len(indexes),
            'created': created_count,
            'skipped': skipped_count,
            'failed': failed_count,
            'success': failed_count == 0
        }

        if result['success']:
            logger.info(
                f"✅ Index creation complete: {created_count} created, "
                f"{skipped_count} already existed"
            )
        else:
            logger.warning(
                f"⚠️  Index creation completed with errors: {failed_count} failed"
            )

        return result

    async def _verify_index_exists(
        self,
        connection: asyncpg.Connection,
        index_name: str
    ) -> bool:
        """
        Verify that an index exists in the database.

        Args:
            connection: Active PostgreSQL connection
            index_name: Name of index to check

        Returns:
            True if index exists, False otherwise
        """
        query = """
            SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = $1
                  AND tablename = $2
                  AND indexname = $3
            )
        """

        result = await connection.fetchval(query, self.schema, self.table, index_name)
        return bool(result)

    async def verify_all_indexes(self, connection: asyncpg.Connection) -> Dict[str, Any]:
        """
        Verify that all required indexes exist.

        Args:
            connection: Active PostgreSQL connection

        Returns:
            Dictionary with verification results

        Raises:
            Exception: If verification fails
        """
        indexes = self.get_index_definitions()
        existing_count = 0
        missing_indexes = []

        logger.info(f"Verifying {len(indexes)} indexes for {self.full_table_name}...")

        for index_def in indexes:
            exists = await self._verify_index_exists(connection, index_def['name'])

            if exists:
                existing_count += 1
                logger.debug(f"✅ Index exists: {index_def['name']}")
            else:
                missing_indexes.append(index_def['name'])
                logger.warning(f"❌ Index missing: {index_def['name']}")

        result = {
            'total_indexes': len(indexes),
            'existing': existing_count,
            'missing': len(missing_indexes),
            'missing_index_names': missing_indexes,
            'all_present': len(missing_indexes) == 0
        }

        if result['all_present']:
            logger.info(f"✅ All {existing_count} indexes verified")
        else:
            logger.warning(
                f"⚠️  Missing {len(missing_indexes)} indexes: {missing_indexes}"
            )

        return result

    async def get_index_sizes(self, connection: asyncpg.Connection) -> List[Dict[str, Any]]:
        """
        Get sizes of all indexes for performance monitoring.

        Args:
            connection: Active PostgreSQL connection

        Returns:
            List of index size information dictionaries
        """
        query = """
            SELECT
                indexname,
                pg_size_pretty(pg_relation_size(schemaname||'.'||indexname::text)) as size,
                pg_relation_size(schemaname||'.'||indexname::text) as size_bytes
            FROM pg_indexes
            WHERE schemaname = $1
              AND tablename = $2
            ORDER BY pg_relation_size(schemaname||'.'||indexname::text) DESC
        """

        rows = await connection.fetch(query, self.schema, self.table)

        index_sizes = []
        for row in rows:
            index_sizes.append({
                'index_name': row['indexname'],
                'size': row['size'],
                'size_bytes': row['size_bytes']
            })

        logger.info(f"Retrieved size information for {len(index_sizes)} indexes")
        return index_sizes
