"""
Unit tests for DatabaseFactory.

Tests the factory pattern for creating database provider instances.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from app.service.agent.tools.database_tool.database_factory import (
    DatabaseFactory,
    get_database_provider,
)
from app.service.agent.tools.database_tool.database_provider import DatabaseProvider
from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider
from app.service.agent.tools.database_tool.snowflake_provider import SnowflakeProvider


class TestDatabaseFactory:
    """Unit tests for DatabaseFactory class."""

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_create_provider_postgresql_explicit(self, mock_get_config):
        """Test creating PostgreSQL provider with explicit name."""
        # Mock PostgreSQL config
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

        provider = DatabaseFactory.create_provider("postgresql")

        assert provider is not None
        assert isinstance(provider, PostgreSQLProvider)
        assert isinstance(provider, DatabaseProvider)

    def test_create_provider_snowflake_explicit(self):
        """Test creating Snowflake provider with explicit name."""
        provider = DatabaseFactory.create_provider("snowflake")

        assert provider is not None
        assert isinstance(provider, SnowflakeProvider)
        assert isinstance(provider, DatabaseProvider)

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_create_provider_case_insensitive(self, mock_get_config):
        """Test provider name is case-insensitive."""
        # Mock PostgreSQL config
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

        provider_upper = DatabaseFactory.create_provider("POSTGRESQL")
        provider_mixed = DatabaseFactory.create_provider("PostgreSQL")
        provider_lower = DatabaseFactory.create_provider("postgresql")

        assert isinstance(provider_upper, PostgreSQLProvider)
        assert isinstance(provider_mixed, PostgreSQLProvider)
        assert isinstance(provider_lower, PostgreSQLProvider)

    def test_create_provider_invalid_name(self):
        """Test creating provider with invalid name raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            DatabaseFactory.create_provider("mysql")

        assert "Invalid database provider" in str(exc_info.value)
        assert "mysql" in str(exc_info.value)

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    @patch("app.service.agent.tools.database_tool.database_factory.get_config_loader")
    def test_create_provider_from_config_postgresql(
        self, mock_factory_config, mock_postgres_config
    ):
        """Test creating provider from DATABASE_PROVIDER environment variable (postgresql)."""
        # Mock factory config loader
        mock_factory_loader = Mock()
        mock_factory_loader.load_database_provider_config.return_value = {
            "provider": "postgresql",
            "postgresql": {},
        }
        mock_factory_config.return_value = mock_factory_loader

        # Mock PostgreSQL config loader
        mock_postgres_loader = Mock()
        mock_postgres_loader.load_postgresql_config.return_value = {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "user": "test_user",
            "password": "test_pass",
            "pool_size": 10,
            "pool_max_overflow": 20,
            "query_timeout": 300,
        }
        mock_postgres_config.return_value = mock_postgres_loader

        provider = DatabaseFactory.create_provider()

        assert isinstance(provider, PostgreSQLProvider)
        mock_factory_loader.load_database_provider_config.assert_called_once()

    @patch("app.service.agent.tools.database_tool.database_factory.get_config_loader")
    def test_create_provider_from_config_snowflake(self, mock_get_config):
        """Test creating provider from DATABASE_PROVIDER environment variable (snowflake)."""
        # Mock config loader
        mock_loader = Mock()
        mock_loader.load_database_provider_config.return_value = {
            "provider": "snowflake",
            "snowflake": {},
        }
        mock_get_config.return_value = mock_loader

        provider = DatabaseFactory.create_provider()

        assert isinstance(provider, SnowflakeProvider)
        mock_loader.load_database_provider_config.assert_called_once()

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_get_database_provider_function(self, mock_get_config):
        """Test module-level get_database_provider function."""
        # Mock PostgreSQL config
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

        provider = get_database_provider("postgresql")

        assert isinstance(provider, PostgreSQLProvider)

    @patch("app.service.agent.tools.database_tool.postgres_client.get_config_loader")
    def test_provider_implements_interface(self, mock_get_config):
        """Test that created providers implement DatabaseProvider interface."""
        # Mock PostgreSQL config
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

        postgres_provider = DatabaseFactory.create_provider("postgresql")
        snowflake_provider = DatabaseFactory.create_provider("snowflake")

        # Check PostgreSQL provider has required methods
        assert hasattr(postgres_provider, "connect")
        assert hasattr(postgres_provider, "disconnect")
        assert hasattr(postgres_provider, "execute_query")
        assert hasattr(postgres_provider, "get_connection")
        assert callable(postgres_provider.connect)
        assert callable(postgres_provider.disconnect)
        assert callable(postgres_provider.execute_query)
        assert callable(postgres_provider.get_connection)

        # Check Snowflake provider has required methods
        assert hasattr(snowflake_provider, "connect")
        assert hasattr(snowflake_provider, "disconnect")
        assert hasattr(snowflake_provider, "execute_query")
        assert hasattr(snowflake_provider, "get_connection")
        assert callable(snowflake_provider.connect)
        assert callable(snowflake_provider.disconnect)
        assert callable(snowflake_provider.execute_query)
        assert callable(snowflake_provider.get_connection)
