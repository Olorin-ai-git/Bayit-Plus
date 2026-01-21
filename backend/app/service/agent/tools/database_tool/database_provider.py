"""
Database Provider Abstract Base Class.

This module defines the abstract interface for database providers
to ensure consistent implementation across different database backends
(PostgreSQL and Snowflake).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union


class DatabaseProvider(ABC):
    """
    Abstract base class for database providers.

    This class defines the interface that all database providers must implement
    to ensure consistent database operations across different backends.
    """

    @abstractmethod
    def connect(self) -> None:
        """
        Establish connection to the database.

        This method should handle all connection setup including:
        - Creating connection pools if applicable
        - Setting connection parameters
        - Validating connection health

        Raises:
            ConnectionError: If unable to establish database connection
        """
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """
        Close the database connection.

        This method should handle cleanup including:
        - Closing active connections
        - Releasing connection pools
        - Cleaning up resources

        Safe to call multiple times.
        """
        pass

    @abstractmethod
    def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a query against the database.

        Args:
            query: SQL query string to execute
            params: Optional dictionary of query parameters for parameterized queries

        Returns:
            List of dictionaries representing result rows

        Raises:
            QueryExecutionError: If query execution fails
            ConnectionError: If database connection is not established
        """
        pass

    @abstractmethod
    def get_connection(self) -> Any:
        """
        Get the underlying database connection object.

        This method provides access to the raw connection for advanced use cases.
        The type of object returned depends on the specific provider implementation:
        - PostgreSQL: psycopg2 connection or SQLAlchemy engine
        - Snowflake: snowflake.connector connection

        Returns:
            The underlying database connection object

        Raises:
            ConnectionError: If no active connection exists
        """
        pass
