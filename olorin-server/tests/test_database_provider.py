"""
Test suite for database provider abstraction layer.
Written FIRST for TDD - tests should FAIL until implementation is complete.
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from typing import Dict, Any

# These imports will fail initially (TDD approach)
from app.service.config_loader import ConfigLoader, get_config_loader
from app.service.agent.tools.database_tool import (
    DatabaseProvider,
    DatabaseFactory,
    get_database_provider
)
from app.service.agent.tools.database_tool.database_provider import DatabaseProvider as BaseProvider
from app.service.agent.tools.database_tool.database_factory import DatabaseFactory as Factory


class TestDatabaseProviderConfig:
    """Test suite for T006: Database provider configuration loading."""

    def test_load_database_provider_config_with_postgresql(self):
        """Test loading configuration when DATABASE_PROVIDER=postgresql."""
        with patch.dict(os.environ, {
            'DATABASE_PROVIDER': 'postgresql',
            'POSTGRES_HOST': 'test-host',
            'POSTGRES_PORT': '5432',
            'POSTGRES_DATABASE': 'test_db',
            'POSTGRES_SCHEMA': 'public',
            'POSTGRES_USER': 'test_user',
            'POSTGRES_PASSWORD': 'test_pass',
            'POSTGRES_POOL_SIZE': '10',
            'POSTGRES_POOL_MAX_OVERFLOW': '20',
            'POSTGRES_QUERY_TIMEOUT': '300',
            'POSTGRES_TRANSACTIONS_TABLE': 'test_transactions'
        }, clear=False):
            loader = ConfigLoader()
            config = loader.load_database_provider_config()

            assert config['provider'] == 'postgresql'
            assert config['postgresql']['host'] == 'test-host'
            assert config['postgresql']['port'] == 5432  # Should be int
            assert config['postgresql']['database'] == 'test_db'
            assert config['postgresql']['schema'] == 'public'
            assert config['postgresql']['user'] == 'test_user'
            assert config['postgresql']['password'] == 'test_pass'
            assert config['postgresql']['pool_size'] == 10  # Should be int
            assert config['postgresql']['pool_max_overflow'] == 20  # Should be int
            assert config['postgresql']['query_timeout'] == 300  # Should be int
            assert config['postgresql']['transactions_table'] == 'test_transactions'

    def test_load_database_provider_config_with_snowflake(self):
        """Test loading configuration when DATABASE_PROVIDER=snowflake."""
        with patch.dict(os.environ, {'DATABASE_PROVIDER': 'snowflake'}, clear=False):
            loader = ConfigLoader()
            config = loader.load_database_provider_config()

            assert config['provider'] == 'snowflake'
            # Snowflake config should use existing load_snowflake_config method
            assert 'snowflake' in config

    def test_load_database_provider_config_default_postgresql(self):
        """Test default to postgresql with warning when DATABASE_PROVIDER not set."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('app.service.config_loader.logger') as mock_logger:
                loader = ConfigLoader()
                config = loader.load_database_provider_config()

                assert config['provider'] == 'postgresql'
                mock_logger.warning.assert_called_with(
                    "DATABASE_PROVIDER not set, defaulting to 'postgresql'"
                )

    def test_load_database_provider_config_invalid_provider(self):
        """Test fail-fast behavior with invalid DATABASE_PROVIDER value."""
        with patch.dict(os.environ, {'DATABASE_PROVIDER': 'invalid_db'}, clear=False):
            loader = ConfigLoader()

            with pytest.raises(ValueError) as exc_info:
                loader.load_database_provider_config()

            assert "Invalid DATABASE_PROVIDER" in str(exc_info.value)
            assert "'invalid_db'" in str(exc_info.value)
            assert "Must be 'snowflake' or 'postgresql'" in str(exc_info.value)

    def test_postgresql_config_type_conversion(self):
        """Test that PostgreSQL numeric configs are converted to proper types."""
        with patch.dict(os.environ, {
            'DATABASE_PROVIDER': 'postgresql',
            'POSTGRES_PORT': '5432',
            'POSTGRES_POOL_SIZE': '10',
            'POSTGRES_POOL_MAX_OVERFLOW': '20',
            'POSTGRES_QUERY_TIMEOUT': '300'
        }, clear=False):
            loader = ConfigLoader()
            config = loader.load_database_provider_config()

            # All numeric values should be integers
            assert isinstance(config['postgresql']['port'], int)
            assert isinstance(config['postgresql']['pool_size'], int)
            assert isinstance(config['postgresql']['pool_max_overflow'], int)
            assert isinstance(config['postgresql']['query_timeout'], int)

    def test_postgresql_config_missing_critical_fields(self):
        """Test warning for missing critical PostgreSQL configuration."""
        with patch.dict(os.environ, {
            'DATABASE_PROVIDER': 'postgresql',
            # Missing critical fields
        }, clear=True):
            with patch('app.service.config_loader.logger') as mock_logger:
                loader = ConfigLoader()
                config = loader.load_database_provider_config()

                # Should still return config but warn about missing fields
                assert config['provider'] == 'postgresql'
                # Check that warnings were logged for missing fields
                assert mock_logger.warning.called


class TestDatabaseProviderAbstraction:
    """Test suite for T008: DatabaseProvider abstract base class."""

    def test_database_provider_is_abstract(self):
        """Test that DatabaseProvider cannot be instantiated directly."""
        with pytest.raises(TypeError) as exc_info:
            provider = BaseProvider()

        assert "Can't instantiate abstract class" in str(exc_info.value)

    def test_database_provider_has_required_methods(self):
        """Test that DatabaseProvider defines all required abstract methods."""
        # Check that abstract methods are defined
        assert hasattr(BaseProvider, 'connect')
        assert hasattr(BaseProvider, 'disconnect')
        assert hasattr(BaseProvider, 'execute_query')
        assert hasattr(BaseProvider, 'get_connection')

        # Verify they are abstract
        assert getattr(BaseProvider.connect, '__isabstractmethod__', False)
        assert getattr(BaseProvider.disconnect, '__isabstractmethod__', False)
        assert getattr(BaseProvider.execute_query, '__isabstractmethod__', False)
        assert getattr(BaseProvider.get_connection, '__isabstractmethod__', False)

    def test_database_provider_type_hints(self):
        """Test that DatabaseProvider methods have proper type hints."""
        import inspect
        from typing import get_type_hints

        # Check type hints for each method
        connect_hints = get_type_hints(BaseProvider.connect)
        assert connect_hints.get('return') is None or connect_hints['return'] == type(None)

        disconnect_hints = get_type_hints(BaseProvider.disconnect)
        assert disconnect_hints.get('return') is None or disconnect_hints['return'] == type(None)

        execute_query_hints = get_type_hints(BaseProvider.execute_query)
        assert 'query' in execute_query_hints
        assert execute_query_hints['query'] == str
        assert 'params' in execute_query_hints

        get_connection_hints = get_type_hints(BaseProvider.get_connection)
        assert 'return' in get_connection_hints


class TestDatabaseFactory:
    """Test suite for T009: DatabaseFactory pattern."""

    def test_get_database_provider_postgresql(self):
        """Test factory returns PostgreSQL provider for 'postgresql'."""
        provider = Factory.get_database_provider('postgresql')
        assert isinstance(provider, BaseProvider)
        # For now it can be a placeholder, actual implementation comes later

    def test_get_database_provider_snowflake(self):
        """Test factory returns Snowflake provider for 'snowflake'."""
        provider = Factory.get_database_provider('snowflake')
        assert isinstance(provider, BaseProvider)
        # For now it can be a placeholder, actual implementation comes later

    def test_get_database_provider_invalid(self):
        """Test factory raises error for invalid provider name."""
        with pytest.raises(ValueError) as exc_info:
            Factory.get_database_provider('invalid_provider')

        assert "Invalid database provider" in str(exc_info.value)
        assert "'invalid_provider'" in str(exc_info.value)

    def test_get_database_provider_case_insensitive(self):
        """Test factory handles case variations."""
        # Should handle various cases
        provider1 = Factory.get_database_provider('PostgreSQL')
        provider2 = Factory.get_database_provider('POSTGRESQL')
        provider3 = Factory.get_database_provider('postgresql')

        assert isinstance(provider1, BaseProvider)
        assert isinstance(provider2, BaseProvider)
        assert isinstance(provider3, BaseProvider)

    def test_factory_function_wrapper(self):
        """Test the module-level get_database_provider function."""
        from app.service.agent.tools.database_tool import get_database_provider

        provider = get_database_provider('postgresql')
        assert isinstance(provider, BaseProvider)


class TestDatabaseToolModule:
    """Test suite for T007: database_tool module exports."""

    def test_module_exports_database_provider(self):
        """Test that database_tool module exports DatabaseProvider."""
        from app.service.agent.tools.database_tool import DatabaseProvider
        assert DatabaseProvider is not None

    def test_module_exports_database_factory(self):
        """Test that database_tool module exports DatabaseFactory."""
        from app.service.agent.tools.database_tool import DatabaseFactory
        assert DatabaseFactory is not None

    def test_module_exports_get_database_provider_function(self):
        """Test that database_tool module exports get_database_provider function."""
        from app.service.agent.tools.database_tool import get_database_provider
        assert callable(get_database_provider)

    def test_module_clean_interface(self):
        """Test that module only exports expected items."""
        import app.service.agent.tools.database_tool as db_module

        # Check that main exports are present
        assert hasattr(db_module, 'DatabaseProvider')
        assert hasattr(db_module, 'DatabaseFactory')
        assert hasattr(db_module, 'get_database_provider')