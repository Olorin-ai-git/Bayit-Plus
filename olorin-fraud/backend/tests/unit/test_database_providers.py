"""
Unit tests for Database Providers.

Tests the concrete implementations of DatabaseProvider interface.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider
from app.service.agent.tools.database_tool.snowflake_provider import SnowflakeProvider


class TestSnowflakeProvider:
    """Unit tests for SnowflakeProvider."""

    @patch(
        "app.service.agent.tools.database_tool.snowflake_provider.RealSnowflakeClient"
    )
    def test_initialization(self, mock_client_class):
        """Test SnowflakeProvider initialization."""
        provider = SnowflakeProvider()

        assert provider is not None
        mock_client_class.assert_called_once()

    @patch(
        "app.service.agent.tools.database_tool.snowflake_provider.RealSnowflakeClient"
    )
    def test_connect(self, mock_client_class):
        """Test connect method."""
        provider = SnowflakeProvider()
        provider.connect()

        # Connect should not raise an exception
        assert True

    @patch(
        "app.service.agent.tools.database_tool.snowflake_provider.RealSnowflakeClient"
    )
    def test_disconnect(self, mock_client_class):
        """Test disconnect method."""
        provider = SnowflakeProvider()
        provider.disconnect()

        # Disconnect should not raise an exception
        assert True

    @patch(
        "app.service.agent.tools.database_tool.snowflake_provider.RealSnowflakeClient"
    )
    def test_execute_query(self, mock_client_class):
        """Test execute_query method."""
        # Setup mock client
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Setup async mock for execute_query
        async def mock_execute(*args, **kwargs):
            return [{"id": 1, "value": "test"}]

        mock_client.execute_query = AsyncMock(side_effect=mock_execute)

        provider = SnowflakeProvider()

        # The execute_query will use asyncio.run_until_complete internally
        # This test verifies the basic flow works
        result = provider.execute_query("SELECT * FROM test")

        assert result == [{"id": 1, "value": "test"}]

    @patch(
        "app.service.agent.tools.database_tool.snowflake_provider.RealSnowflakeClient"
    )
    def test_get_connection(self, mock_client_class):
        """Test get_connection returns the client."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        provider = SnowflakeProvider()
        connection = provider.get_connection()

        assert connection == mock_client


class TestPostgreSQLProvider:
    """Unit tests for PostgreSQLProvider."""

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_initialization(self, mock_get_config):
        """Test PostgreSQLProvider initialization."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "schema": "public",
            "transactions_table": "transactions_enriched",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_get_config.return_value = mock_loader

        provider = PostgreSQLProvider()

        assert provider is not None
        assert provider._config is not None
        assert provider._config["host"] == "localhost"

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_initialization_missing_config(self, mock_get_config):
        """Test PostgreSQLProvider initialization with missing configuration."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": None,
            "port": None,
            "database": None,
            "user": None,
            "password": None,
        }
        mock_get_config.return_value = mock_loader

        # Should raise ValueError due to fail-fast validation
        with pytest.raises(ValueError) as exc_info:
            provider = PostgreSQLProvider()

        assert "CRITICAL PostgreSQL config missing" in str(exc_info.value)

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_connect(self, mock_get_config):
        """Test connect method."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_get_config.return_value = mock_loader

        provider = PostgreSQLProvider()
        provider.connect()

        # Connect should not raise an exception (lazy connection)
        assert True

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_disconnect(self, mock_get_config):
        """Test disconnect method."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_get_config.return_value = mock_loader

        provider = PostgreSQLProvider()
        provider.disconnect()

        # Disconnect should not raise an exception
        assert True

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_get_full_table_name(self, mock_get_config):
        """Test get_full_table_name method."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "schema": "public",
            "transactions_table": "transactions_enriched",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_get_config.return_value = mock_loader

        provider = PostgreSQLProvider()
        table_name = provider.get_full_table_name()

        assert table_name == "public.transactions_enriched"

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_get_connection_not_initialized(self, mock_get_config):
        """Test get_connection raises error when pool not initialized."""
        mock_loader = Mock()
        mock_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_get_config.return_value = mock_loader

        provider = PostgreSQLProvider()

        with pytest.raises(ConnectionError) as exc_info:
            provider.get_connection()

        assert "No active PostgreSQL connection pool" in str(exc_info.value)
