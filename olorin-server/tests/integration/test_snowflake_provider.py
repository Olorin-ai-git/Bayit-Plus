"""
Integration tests for SnowflakeProvider.

This module tests the Snowflake database provider implementation
with real Snowflake connections (or test containers for CI/CD).

Following TDD approach: These tests MUST FAIL initially until
SnowflakeProvider is fully implemented with proper error handling.

NOTE: These tests require Snowflake credentials to be configured.
Tests will be skipped if Snowflake configuration is not available.
"""

import pytest
from typing import Dict, Any, List

from app.service.agent.tools.database_tool.snowflake_provider import SnowflakeProvider
from app.service.agent.tools.database_tool.database_provider import DatabaseProvider


@pytest.fixture
def snowflake_config_available():
    """
    Check if Snowflake configuration is available.

    Returns:
        bool: True if Snowflake can be tested, False otherwise
    """
    import os
    from app.service.config_loader import get_config_loader

    try:
        config_loader = get_config_loader()
        config = config_loader.load_snowflake_config()

        # Check critical fields are present
        required_fields = ['account', 'user', 'password', 'database']
        has_required = all(config.get(field) for field in required_fields)

        return has_required
    except Exception:
        return False


@pytest.fixture
def snowflake_provider():
    """
    Create a SnowflakeProvider instance for testing.

    Yields:
        SnowflakeProvider: An initialized provider instance
    """
    provider = SnowflakeProvider()
    yield provider

    # Cleanup: Ensure disconnection after test
    try:
        provider.disconnect()
    except Exception:
        pass


class TestSnowflakeProviderIntegration:
    """Integration tests for SnowflakeProvider with real database connection."""

    def test_provider_implements_interface(self):
        """Verify SnowflakeProvider implements DatabaseProvider interface."""
        provider = SnowflakeProvider()

        assert isinstance(provider, DatabaseProvider), \
            "SnowflakeProvider must implement DatabaseProvider interface"

    def test_provider_instantiation(self):
        """Test that SnowflakeProvider can be instantiated."""
        provider = SnowflakeProvider()

        assert provider is not None
        assert hasattr(provider, 'connect')
        assert hasattr(provider, 'disconnect')
        assert hasattr(provider, 'execute_query')
        assert hasattr(provider, 'get_connection')

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled. Use --run-integration to enable."
    )
    def test_connection_lifecycle(self, snowflake_provider):
        """Test connection establishment and teardown."""
        # Initially not connected
        # (Exact connection state checking depends on implementation)

        # Connect to Snowflake
        snowflake_provider.connect()

        # Get connection to verify it's established
        connection = snowflake_provider.get_connection()
        assert connection is not None, \
            "Connection should be established after connect()"

        # Disconnect
        snowflake_provider.disconnect()

        # After disconnect, connection should not be usable
        # (Behavior depends on implementation)

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_execute_simple_query(self, snowflake_provider):
        """Test executing a simple SELECT query."""
        snowflake_provider.connect()

        # Execute a simple query that should work on any Snowflake database
        query = "SELECT CURRENT_TIMESTAMP() as current_time"
        results = snowflake_provider.execute_query(query)

        assert isinstance(results, list), \
            "execute_query should return a list"
        assert len(results) > 0, \
            "Query should return at least one row"
        assert isinstance(results[0], dict), \
            "Each result row should be a dictionary"
        assert 'current_time' in results[0] or 'CURRENT_TIME' in results[0], \
            "Result should contain the selected column"

        snowflake_provider.disconnect()

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_execute_query_with_parameters(self, snowflake_provider):
        """Test executing a parameterized query."""
        snowflake_provider.connect()

        # Test query with parameters (syntax depends on Snowflake driver)
        query = "SELECT :value as test_value"
        params = {'value': 42}

        results = snowflake_provider.execute_query(query, params)

        assert len(results) > 0
        assert isinstance(results[0], dict)
        # Result column name might vary (test_value or TEST_VALUE)
        result_keys = [k.lower() for k in results[0].keys()]
        assert 'test_value' in result_keys

        snowflake_provider.disconnect()

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_execute_query_returns_correct_structure(self, snowflake_provider):
        """Test that query results have expected structure."""
        snowflake_provider.connect()

        query = """
            SELECT
                1 as id,
                'test' as name,
                100.50 as amount,
                CURRENT_DATE() as date_column
        """

        results = snowflake_provider.execute_query(query)

        assert isinstance(results, list)
        assert len(results) == 1

        row = results[0]
        assert isinstance(row, dict)

        # Verify all columns present (case-insensitive)
        row_keys_lower = [k.lower() for k in row.keys()]
        assert 'id' in row_keys_lower
        assert 'name' in row_keys_lower
        assert 'amount' in row_keys_lower
        assert 'date_column' in row_keys_lower

        snowflake_provider.disconnect()

    def test_execute_query_without_connection_fails(self, snowflake_provider):
        """Test that executing query without connection raises appropriate error."""
        # Don't connect
        query = "SELECT 1"

        # Should raise an error indicating no connection
        with pytest.raises(Exception) as exc_info:
            snowflake_provider.execute_query(query)

        # Error should indicate connection issue
        error_msg = str(exc_info.value).lower()
        assert 'connect' in error_msg or 'connection' in error_msg, \
            "Error should mention connection issue"

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_multiple_queries_same_connection(self, snowflake_provider):
        """Test executing multiple queries on the same connection."""
        snowflake_provider.connect()

        # Execute first query
        results1 = snowflake_provider.execute_query("SELECT 1 as num")
        assert len(results1) == 1

        # Execute second query on same connection
        results2 = snowflake_provider.execute_query("SELECT 2 as num")
        assert len(results2) == 1

        # Execute third query
        results3 = snowflake_provider.execute_query("SELECT 3 as num")
        assert len(results3) == 1

        snowflake_provider.disconnect()

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_reconnection_after_disconnect(self, snowflake_provider):
        """Test that provider can reconnect after disconnect."""
        # First connection cycle
        snowflake_provider.connect()
        results1 = snowflake_provider.execute_query("SELECT 1 as num")
        assert len(results1) == 1
        snowflake_provider.disconnect()

        # Second connection cycle (reconnection)
        snowflake_provider.connect()
        results2 = snowflake_provider.execute_query("SELECT 2 as num")
        assert len(results2) == 1
        snowflake_provider.disconnect()

    def test_disconnect_without_connection_is_safe(self, snowflake_provider):
        """Test that calling disconnect without connection doesn't raise error."""
        # Should not raise exception
        snowflake_provider.disconnect()

        # Should be callable multiple times
        snowflake_provider.disconnect()

    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration"),
        reason="Integration tests disabled"
    )
    def test_invalid_query_raises_error(self, snowflake_provider):
        """Test that invalid SQL raises appropriate error."""
        snowflake_provider.connect()

        # Execute invalid SQL
        invalid_query = "SELECT * FROM table_that_does_not_exist_12345"

        with pytest.raises(Exception) as exc_info:
            snowflake_provider.execute_query(invalid_query)

        # Should raise query execution error
        # (Exact error type depends on implementation)
        assert exc_info.value is not None

        snowflake_provider.disconnect()
