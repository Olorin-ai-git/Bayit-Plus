"""
Snowflake Database Provider Implementation.

This module wraps the existing RealSnowflakeClient to conform to
the DatabaseProvider interface for the database abstraction layer.
"""

from typing import Any, Dict, List, Optional
import asyncio

from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
from .database_provider import DatabaseProvider

logger = get_bridge_logger(__name__)


class SnowflakeProvider(DatabaseProvider):
    """
    Snowflake implementation of DatabaseProvider.

    This class wraps the existing RealSnowflakeClient to provide
    a consistent interface for database operations.
    """

    def __init__(self):
        """Initialize Snowflake provider with existing client."""
        self._client = RealSnowflakeClient()
        logger.debug("Initialized SnowflakeProvider")

    def connect(self) -> None:
        """
        Establish connection to Snowflake database.

        Raises:
            ConnectionError: If unable to establish database connection
        """
        try:
            # RealSnowflakeClient uses lazy connection, so we just ensure config is loaded
            logger.debug("Snowflake provider ready (lazy connection)")
        except Exception as e:
            logger.error(f"Failed to initialize Snowflake provider: {e}")
            raise ConnectionError(f"Snowflake connection failed: {e}") from e

    async def disconnect_async(self) -> None:
        """
        Close the Snowflake database connection asynchronously.
        
        This method properly awaits the disconnect operation, ensuring all queries
        have completed before closing the connection. Use this from async code.
        
        Safe to call multiple times.
        """
        try:
            if self._client and hasattr(self._client, 'disconnect'):
                await self._client.disconnect()
                logger.debug("Snowflake provider disconnected")
            else:
                logger.debug("Snowflake provider disconnect called (no active client)")
        except Exception as e:
            logger.warning(f"Error during Snowflake disconnect: {e}")

    def disconnect(self) -> None:
        """
        Close the Snowflake database connection synchronously.
        
        Safe to call multiple times.
        Properly closes the underlying connection to prevent atexit callback errors.
        
        Note: When called from a running event loop, this schedules the disconnect
        as a background task and doesn't wait for completion. For async code, use
        disconnect_async() instead.
        """
        try:
            if self._client and hasattr(self._client, 'disconnect'):
                # RealSnowflakeClient.disconnect() is async, so we need to run it in an event loop
                import asyncio
                try:
                    # Try to get the current running event loop
                    loop = asyncio.get_running_loop()
                    # Event loop is running - schedule disconnect as background task
                    # Use loop.create_task() which is the proper way to create tasks from sync code
                    loop.create_task(self._client.disconnect())
                    logger.debug("Snowflake disconnect scheduled as background task")
                except RuntimeError:
                    # No running event loop - try to get or create one
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            # Loop is running but get_running_loop() failed - schedule task
                            loop.create_task(self._client.disconnect())
                            logger.debug("Snowflake disconnect scheduled as background task")
                        else:
                            # Loop exists but not running - run the disconnect synchronously
                            loop.run_until_complete(self._client.disconnect())
                            logger.info("Snowflake provider disconnected")
                    except RuntimeError:
                        # No event loop at all - create one
                        asyncio.run(self._client.disconnect())
                        logger.info("Snowflake provider disconnected")
            else:
                logger.info("Snowflake provider disconnect called (no active client)")
        except Exception as e:
            logger.warning(f"Error during Snowflake disconnect: {e}")

    async def execute_query_async(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a query against Snowflake database (async version - USE THIS!).
        
        Does NOT block the event loop. Properly awaits async operations.

        Args:
            query: SQL query string to execute
            params: Optional dictionary of query parameters

        Returns:
            List of dictionaries representing result rows

        Raises:
            RuntimeError: If query execution fails
        """
        try:
            # Directly await without blocking
            results = await self._client.execute_query(query)
            logger.info(f"Snowflake query executed: {len(results)} rows returned")
            return results
        except Exception as e:
            logger.error(f"Snowflake query execution failed: {e}")
            raise RuntimeError(f"Query execution failed: {e}") from e

    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        DEPRECATED: Use execute_query_async() instead!
        
        This sync wrapper should NOT be called from async code - it blocks the event loop.

        Args:
            query: SQL query string to execute
            params: Optional dictionary of query parameters

        Returns:
            List of dictionaries representing result rows

        Raises:
            RuntimeError: If query execution fails
        """
        try:
            # Raise error if called from async context
            try:
                asyncio.get_running_loop()
                raise RuntimeError(
                    "CRITICAL: execute_query() cannot be called from async context!\\n"
                    "Use execute_query_async() instead for proper async support."
                )
            except RuntimeError as e:
                if "cannot be called" in str(e):
                    raise
                # No event loop, proceed with sync execution
                results = asyncio.run(self._client.execute_query(query))
                logger.info(f"Snowflake query executed: {len(results)} rows returned")
                return results
        except Exception as e:
            logger.error(f"Snowflake query execution failed: {e}")
            raise RuntimeError(f"Query execution failed: {e}") from e

    def get_connection(self) -> Any:
        """
        Get the underlying Snowflake connection object.

        Returns:
            The RealSnowflakeClient instance

        Raises:
            ConnectionError: If no active connection exists
        """
        if self._client is None:
            raise ConnectionError("No active Snowflake connection")

        return self._client

    def get_full_table_name(self) -> str:
        """
        Get the full qualified table name: database.schema.table
        
        Uses environment variables:
        - SNOWFLAKE_DATABASE (default: DBT)
        - SNOWFLAKE_SCHEMA (default: DBT_PROD)
        - SNOWFLAKE_TRANSACTIONS_TABLE (default: TXS)
        
        Returns:
            Full qualified table name: database.schema.table
        """
        import os
        from app.service.agent.tools.snowflake_tool.schema_constants import get_required_env_var
        
        database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
        schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
        table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
        
        return f"{database}.{schema}.{table}"
