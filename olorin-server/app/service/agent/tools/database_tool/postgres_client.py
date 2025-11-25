"""
PostgreSQL Database Provider Implementation.

This module implements the DatabaseProvider interface for PostgreSQL
with async connection pooling using asyncpg and SQLAlchemy.
"""

import asyncio
import re
from typing import Any, Dict, List, Optional

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

from .database_provider import DatabaseProvider
from .postgres_indexes import PostgreSQLIndexManager
from .query_cache import QueryCache
from .query_translator import QueryTranslator

logger = get_bridge_logger(__name__)


class PostgreSQLProvider(DatabaseProvider):
    """
    PostgreSQL implementation of DatabaseProvider.

    This class provides async database operations using asyncpg
    for optimal PostgreSQL performance.
    """

    def __init__(self):
        """Initialize PostgreSQL provider with configuration."""
        self._pool = None
        self._config = None
        self._indexes_created = False
        self._load_configuration()

        # Initialize query translation and caching
        self.query_translator = QueryTranslator()
        self.query_cache = QueryCache(max_size=1000)

        # Initialize index manager (schema and table from config)
        schema = self._config.get("schema", "public")
        table = self._config.get("transactions_table", "transactions_enriched")
        self.index_manager = PostgreSQLIndexManager(schema, table)

        # Store max transactions limit from config
        self.max_transactions_limit = self._config.get("max_transactions_limit", 1000)

        logger.debug(
            "Initialized PostgreSQLProvider with query translation, caching, and index management"
        )

    def _load_configuration(self):
        """Load PostgreSQL configuration from config loader."""
        loader = get_config_loader()
        self._config = loader.load_postgresql_config()

        # Validate critical configuration - fail fast if missing
        required_fields = ["host", "port", "database", "user", "password"]
        missing = [f for f in required_fields if not self._config.get(f)]

        if missing:
            raise ValueError(
                f"CRITICAL PostgreSQL config missing: {missing}. "
                f"Configure in .env with POSTGRES_ prefix"
            )

        # Validate performance configuration - fail fast if missing
        performance_fields = ["pool_size", "pool_max_overflow", "query_timeout"]
        missing_perf = [
            f
            for f in performance_fields
            if f not in self._config or self._config.get(f) is None
        ]

        if missing_perf:
            raise ValueError(
                f"CRITICAL PostgreSQL performance config missing: {missing_perf}. "
                f"Configure in .env: {', '.join([f'POSTGRES_{f.upper()}' for f in missing_perf])}"
            )

    def connect(self) -> None:
        """
        Establish connection pool to PostgreSQL database.

        Raises:
            ConnectionError: If unable to establish database connection
        """
        try:
            # For sync interface, we'll mark as ready
            # Actual pool creation happens on first query
            logger.debug("PostgreSQL provider ready (lazy connection pool)")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL provider: {e}")
            raise ConnectionError(f"PostgreSQL connection failed: {e}") from e

    async def _ensure_pool(self):
        """Ensure connection pool is created (lazy initialization)."""
        if self._pool is not None:
            return

        try:
            import asyncpg

            # Build connection string (safely, without exposing password in errors)
            user = self._config["user"]
            password = self._config["password"]
            host = self._config["host"]
            port = self._config["port"]
            database = self._config["database"]

            # Add gssencmode=disable to avoid GSSAPI errors on local connections
            conn_str = f"postgresql://{user}:{password}@{host}:{port}/{database}?gssencmode=disable"

            # Get configuration values - no defaults, fail if missing
            pool_size = int(self._config["pool_size"])
            max_overflow = int(self._config["pool_max_overflow"])
            query_timeout = int(self._config["query_timeout"])

            # Validate configuration relationships
            if max_overflow < pool_size:
                raise ValueError(
                    f"pool_max_overflow ({max_overflow}) must be >= pool_size ({pool_size})"
                )

            # Create connection pool with configuration
            self._pool = await asyncpg.create_pool(
                conn_str,
                min_size=pool_size,
                max_size=pool_size + max_overflow,
                command_timeout=query_timeout,
            )

            # Safe logging - don't expose credentials
            logger.info(
                f"✅ PostgreSQL pool created: {database}@{host}:{port} (size={pool_size})"
            )

            # Ensure indexes are created after pool initialization
            await self._ensure_indexes()

        except ImportError:
            logger.error("asyncpg not installed. Run: poetry add asyncpg")
            raise
        except Exception as e:
            # Sanitize error message to remove credentials
            error_msg = str(e)
            if password in error_msg:
                error_msg = error_msg.replace(password, "***")
            logger.error(f"❌ Failed to create PostgreSQL pool: {error_msg}")
            raise ConnectionError("PostgreSQL pool creation failed") from e

    async def _ensure_indexes(self):
        """Ensure all required indexes are created (idempotent)."""
        # Use a class-level flag to prevent recreating indexes across instances
        # This prevents index recreation when multiple provider instances are created
        if not hasattr(PostgreSQLProvider, "_class_indexes_created"):
            PostgreSQLProvider._class_indexes_created = False

        if PostgreSQLProvider._class_indexes_created:
            logger.debug(
                "Indexes already verified/created by another provider instance, skipping"
            )
            return

        try:
            async with self._pool.acquire() as connection:
                # Verify indexes exist first (faster than creating)
                verify_result = await self.index_manager.verify_all_indexes(connection)

                if verify_result["all_present"]:
                    # All indexes exist, mark as created
                    PostgreSQLProvider._class_indexes_created = True
                    logger.info(
                        f"✅ PostgreSQL indexes verified: {verify_result['existing']} total"
                    )
                else:
                    # Some indexes missing, create them
                    result = await self.index_manager.create_indexes(connection)

                    if result["success"]:
                        PostgreSQLProvider._class_indexes_created = True
                        logger.info(
                            f"✅ PostgreSQL indexes verified/created: {result['created'] + result['skipped']} total"
                        )
                    else:
                        logger.warning(
                            f"⚠️  Index creation completed with {result['failed']} failures"
                        )

        except Exception as e:
            logger.error(f"❌ Failed to ensure indexes: {e}")
            # Don't raise - indexes are for performance, not correctness
            # Application can continue without them

    async def disconnect(self) -> None:
        """
        Close the PostgreSQL database connection pool.

        Safe to call multiple times.
        """
        if self._pool:
            try:
                # Properly close the pool asynchronously
                await self._close_pool()
                logger.info("PostgreSQL connection pool closed successfully")
            except Exception as e:
                logger.error(f"Error closing PostgreSQL pool: {e}")
                raise  # Propagate error for visibility

    async def _close_pool(self):
        """Close the connection pool asynchronously."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("PostgreSQL connection pool closed")

    async def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a query against PostgreSQL database.

        Automatically translates Snowflake SQL to PostgreSQL SQL with caching.

        Args:
            query: SQL query string to execute (Snowflake or PostgreSQL syntax)
            params: Optional dictionary of query parameters for parameterized queries

        Returns:
            List of dictionaries representing result rows

        Raises:
            QueryExecutionError: If query execution fails
            ConnectionError: If database connection is not established
        """
        try:
            # Check cache for translated query
            translated_query = self.query_cache.get(query)

            if translated_query is None:
                # Cache miss - translate query
                translated_query = self.query_translator.translate(query)
                self.query_cache.put(query, translated_query)
                logger.debug("Query translated and cached")
            else:
                logger.debug("Using cached translated query")

            # Execute translated query asynchronously (no asyncio.run needed - already in async context)
            results = await self._execute_query_async(translated_query, params)
            logger.debug(f"PostgreSQL query executed: {len(results)} rows returned")

            # Log cache hit rate periodically
            cache_stats = self.query_cache.get_stats()
            if cache_stats["total_requests"] % 100 == 0:
                logger.info(
                    f"Query cache stats: hit_rate={cache_stats['hit_rate']:.2%}, "
                    f"size={cache_stats['size']}/{cache_stats['max_size']}"
                )

            return results

        except Exception as e:
            logger.error(f"PostgreSQL query execution failed: {e}")
            raise RuntimeError(f"Query execution failed: {e}") from e

    async def execute_query_async(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Async wrapper for PostgreSQL query execution (calls execute_query which is already async).

        Provided for API compatibility with SnowflakeProvider.

        Args:
            query: SQL query string to execute
            params: Optional dictionary of query parameters

        Returns:
            List of dictionaries representing result rows
        """
        return await self.execute_query(query, params)

    async def _execute_query_async(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute query asynchronously."""
        # Ensure pool is created
        await self._ensure_pool()

        # Enhanced query validation
        query = query.strip()
        query_upper = query.upper()

        # Step 1: Check for multiple statements (SQL injection prevention)
        # Simple check for semicolons outside of strings
        semicolons = query.count(";")
        if semicolons > 1 or (semicolons == 1 and not query.endswith(";")):
            raise ValueError("Multiple SQL statements not allowed for security reasons")

        # Step 2: Validate query type (only SELECT and CTEs allowed)
        if not (query_upper.startswith("SELECT") or query_upper.startswith("WITH")):
            raise ValueError(
                "Only SELECT queries and CTEs are allowed for security reasons"
            )

        # Step 3: Check for dangerous keywords using word boundaries
        dangerous_pattern = r"\b(DELETE|DROP|INSERT|UPDATE|CREATE|ALTER|TRUNCATE|MERGE|GRANT|REVOKE|EXEC|EXECUTE|ATTACH|DETACH)\b"
        if re.search(dangerous_pattern, query_upper):
            match = re.search(dangerous_pattern, query_upper)
            raise ValueError(f"Query contains restricted keyword: {match.group(1)}")

        async with self._pool.acquire() as connection:
            # Convert named parameters (:param_name) to positional parameters ($1, $2, ...)
            # PostgreSQL asyncpg uses positional parameters, not named parameters
            if params:
                # Find all named parameters in the query
                param_pattern = r":(\w+)"
                param_names = re.findall(param_pattern, query)

                # Build parameter list in order of appearance
                param_list = []
                param_mapping = {}  # Map param name to position
                for idx, param_name in enumerate(param_names, start=1):
                    if param_name not in param_mapping:
                        param_mapping[param_name] = len(param_list) + 1
                        param_list.append(params.get(param_name))

                # Replace :param_name with $1, $2, etc.
                def replace_param(match):
                    param_name = match.group(1)
                    position = param_mapping.get(param_name)
                    if position is None:
                        raise ValueError(
                            f"Parameter {param_name} not found in params dict"
                        )
                    return f"${position}"

                query = re.sub(param_pattern, replace_param, query)
            else:
                param_list = []

            # Execute query
            rows = await connection.fetch(query, *param_list)

            # Convert to list of dictionaries
            results = []
            for row in rows:
                results.append(dict(row))

            return results

    def get_connection(self) -> Any:
        """
        Get the underlying PostgreSQL connection pool.

        Returns:
            The asyncpg connection pool

        Raises:
            ConnectionError: If no active connection exists
        """
        if self._pool is None:
            raise ConnectionError("No active PostgreSQL connection pool")

        return self._pool

    def get_full_table_name(self) -> str:
        """Get the full qualified table name: schema.table"""
        schema = self._config.get("schema", "public")
        table = self._config.get("transactions_table", "transactions_enriched")

        return f"{schema}.{table}"
