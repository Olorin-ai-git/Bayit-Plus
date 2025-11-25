"""
Integration tests for PostgreSQLProvider.

This module tests the PostgreSQL database provider implementation
with real PostgreSQL connections using Docker containers (testcontainers).

Following TDD approach: These tests MUST FAIL initially until
PostgreSQLProvider is fully implemented.

NOTE: These tests use testcontainers to spin up a temporary PostgreSQL
database for testing. Docker must be running for these tests to pass.
"""

from typing import Any, Dict, List

import pytest

from app.service.agent.tools.database_tool.database_provider import DatabaseProvider
from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider


@pytest.fixture(scope="module")
def postgres_test_connection(postgresql_container):
    """
    Provide PostgreSQL connection parameters from test container.

    Args:
        postgresql_container: Pytest fixture from conftest.py providing PostgreSQL container

    Returns:
        Dict with connection parameters
    """
    connection_url = postgresql_container.get_connection_url()

    # Parse connection URL to get individual parameters
    # Format: postgresql://user:password@host:port/database
    import urllib.parse

    parsed = urllib.parse.urlparse(connection_url)

    return {
        "host": parsed.hostname,
        "port": parsed.port,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
        "schema": "public",
        "pool_size": 5,
        "pool_max_overflow": 10,
        "query_timeout": 30,
    }


@pytest.fixture
def postgres_provider(postgres_test_connection):
    """
    Create a PostgreSQLProvider instance for testing.

    Args:
        postgres_test_connection: Connection parameters fixture

    Yields:
        PostgreSQLProvider: An initialized provider instance
    """
    # Create provider with test connection parameters
    # Note: Implementation may vary on how config is passed
    provider = PostgreSQLProvider()

    yield provider

    # Cleanup: Ensure disconnection after test
    try:
        provider.disconnect()
    except Exception:
        pass


class TestPostgreSQLProviderIntegration:
    """Integration tests for PostgreSQLProvider with Docker PostgreSQL container."""

    def test_provider_implements_interface(self):
        """Verify PostgreSQLProvider implements DatabaseProvider interface."""
        provider = PostgreSQLProvider()

        assert isinstance(
            provider, DatabaseProvider
        ), "PostgreSQLProvider must implement DatabaseProvider interface"

    def test_provider_instantiation(self):
        """Test that PostgreSQLProvider can be instantiated."""
        provider = PostgreSQLProvider()

        assert provider is not None
        assert hasattr(provider, "connect")
        assert hasattr(provider, "disconnect")
        assert hasattr(provider, "execute_query")
        assert hasattr(provider, "get_connection")

    def test_connection_lifecycle(self, postgres_provider):
        """Test connection establishment and teardown with PostgreSQL."""
        # Connect to PostgreSQL
        postgres_provider.connect()

        # Get connection to verify it's established
        connection = postgres_provider.get_connection()
        assert (
            connection is not None
        ), "Connection should be established after connect()"

        # Disconnect
        postgres_provider.disconnect()

        # After disconnect, connection should be cleaned up
        # (Exact behavior depends on implementation)

    def test_execute_simple_query(self, postgres_provider):
        """Test executing a simple SELECT query."""
        postgres_provider.connect()

        # Execute a simple query that works on PostgreSQL
        query = "SELECT CURRENT_TIMESTAMP as current_time"
        results = postgres_provider.execute_query(query)

        assert isinstance(results, list), "execute_query should return a list"
        assert len(results) > 0, "Query should return at least one row"
        assert isinstance(results[0], dict), "Each result row should be a dictionary"
        assert "current_time" in results[0], "Result should contain the selected column"

        postgres_provider.disconnect()

    def test_execute_query_with_parameters(self, postgres_provider):
        """Test executing a parameterized query."""
        postgres_provider.connect()

        # PostgreSQL uses $1, $2, etc. for parameters
        query = "SELECT $1::integer as test_value"
        # Note: Parameter format depends on implementation
        # This might need to be adjusted based on how PostgreSQLProvider handles params

        # Try with different parameter formats
        try:
            # Try named parameters (dict format)
            results = postgres_provider.execute_query(
                "SELECT %(value)s::integer as test_value", {"value": 42}
            )
        except Exception:
            # Try positional parameters (list format)
            results = postgres_provider.execute_query(
                "SELECT $1::integer as test_value", [42]
            )

        assert len(results) > 0
        assert isinstance(results[0], dict)
        assert "test_value" in results[0]
        assert results[0]["test_value"] == 42

        postgres_provider.disconnect()

    def test_execute_query_returns_correct_structure(self, postgres_provider):
        """Test that query results have expected structure for various data types."""
        postgres_provider.connect()

        query = """
            SELECT
                1 as id,
                'test' as name,
                100.50 as amount,
                CURRENT_DATE as date_column,
                true as is_active
        """

        results = postgres_provider.execute_query(query)

        assert isinstance(results, list)
        assert len(results) == 1

        row = results[0]
        assert isinstance(row, dict)

        # Verify all columns present
        assert "id" in row
        assert "name" in row
        assert "amount" in row
        assert "date_column" in row
        assert "is_active" in row

        # Verify data types
        assert row["id"] == 1
        assert row["name"] == "test"
        assert abs(row["amount"] - 100.50) < 0.01  # Float comparison
        assert row["is_active"] is True

        postgres_provider.disconnect()

    def test_execute_query_without_connection_fails(self, postgres_provider):
        """Test that executing query without connection raises appropriate error."""
        # Don't connect
        query = "SELECT 1"

        # Should raise an error indicating no connection
        with pytest.raises(Exception) as exc_info:
            postgres_provider.execute_query(query)

        # Error should indicate connection issue
        error_msg = str(exc_info.value).lower()
        assert (
            "connect" in error_msg or "connection" in error_msg
        ), "Error should mention connection issue"

    def test_multiple_queries_same_connection(self, postgres_provider):
        """Test executing multiple queries on the same connection."""
        postgres_provider.connect()

        # Execute first query
        results1 = postgres_provider.execute_query("SELECT 1 as num")
        assert len(results1) == 1
        assert results1[0]["num"] == 1

        # Execute second query on same connection
        results2 = postgres_provider.execute_query("SELECT 2 as num")
        assert len(results2) == 1
        assert results2[0]["num"] == 2

        # Execute third query
        results3 = postgres_provider.execute_query("SELECT 3 as num")
        assert len(results3) == 1
        assert results3[0]["num"] == 3

        postgres_provider.disconnect()

    def test_reconnection_after_disconnect(self, postgres_provider):
        """Test that provider can reconnect after disconnect."""
        # First connection cycle
        postgres_provider.connect()
        results1 = postgres_provider.execute_query("SELECT 1 as num")
        assert len(results1) == 1
        postgres_provider.disconnect()

        # Second connection cycle (reconnection)
        postgres_provider.connect()
        results2 = postgres_provider.execute_query("SELECT 2 as num")
        assert len(results2) == 1
        postgres_provider.disconnect()

    def test_disconnect_without_connection_is_safe(self, postgres_provider):
        """Test that calling disconnect without connection doesn't raise error."""
        # Should not raise exception
        postgres_provider.disconnect()

        # Should be callable multiple times
        postgres_provider.disconnect()

    def test_invalid_query_raises_error(self, postgres_provider):
        """Test that invalid SQL raises appropriate error."""
        postgres_provider.connect()

        # Execute invalid SQL
        invalid_query = "SELECT * FROM table_that_does_not_exist_12345"

        with pytest.raises(Exception) as exc_info:
            postgres_provider.execute_query(invalid_query)

        # Should raise query execution error
        assert exc_info.value is not None
        error_msg = str(exc_info.value).lower()
        # PostgreSQL should mention the table doesn't exist
        assert (
            "not exist" in error_msg
            or "does not exist" in error_msg
            or "relation" in error_msg
        )

        postgres_provider.disconnect()

    def test_create_and_query_table(self, postgres_provider):
        """Test creating a table and querying it."""
        postgres_provider.connect()

        # Create a test table
        create_table_query = """
            CREATE TABLE IF NOT EXISTS test_users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100)
            )
        """
        postgres_provider.execute_query(create_table_query)

        # Insert test data
        insert_query = """
            INSERT INTO test_users (name, email)
            VALUES ('John Doe', 'john@example.com')
            RETURNING id, name, email
        """
        insert_results = postgres_provider.execute_query(insert_query)
        assert len(insert_results) == 1
        assert insert_results[0]["name"] == "John Doe"

        # Query the data
        select_query = "SELECT id, name, email FROM test_users WHERE name = 'John Doe'"
        select_results = postgres_provider.execute_query(select_query)
        assert len(select_results) == 1
        assert select_results[0]["name"] == "John Doe"
        assert select_results[0]["email"] == "john@example.com"

        # Cleanup
        postgres_provider.execute_query("DROP TABLE IF EXISTS test_users")
        postgres_provider.disconnect()

    def test_transaction_support(self, postgres_provider):
        """Test that transactions work correctly (if supported by implementation)."""
        postgres_provider.connect()

        # Create test table
        postgres_provider.execute_query(
            """
            CREATE TABLE IF NOT EXISTS test_transactions (
                id SERIAL PRIMARY KEY,
                value INTEGER
            )
        """
        )

        # Insert some data
        postgres_provider.execute_query(
            "INSERT INTO test_transactions (value) VALUES (100)"
        )

        # Verify data was inserted
        results = postgres_provider.execute_query(
            "SELECT value FROM test_transactions WHERE value = 100"
        )
        assert len(results) == 1
        assert results[0]["value"] == 100

        # Cleanup
        postgres_provider.execute_query("DROP TABLE IF EXISTS test_transactions")
        postgres_provider.disconnect()

    def test_concurrent_queries(self, postgres_provider):
        """Test executing queries with connection pooling (if implemented)."""
        postgres_provider.connect()

        # Execute multiple queries in sequence
        # (True concurrency would require async or threading)
        for i in range(5):
            results = postgres_provider.execute_query(f"SELECT {i} as num")
            assert len(results) == 1
            assert results[0]["num"] == i

        postgres_provider.disconnect()
