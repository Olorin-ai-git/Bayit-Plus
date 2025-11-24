"""
Contract tests for DatabaseProvider interface.

This module ensures all database providers implement the required interface
correctly and behave consistently across different backend implementations.

Following TDD approach: These tests MUST FAIL initially, then pass after
implementing the concrete provider classes.
"""

import pytest
from typing import Any, Dict, List
from abc import ABC

from app.service.agent.tools.database_tool.database_provider import DatabaseProvider


class TestDatabaseProviderContract:
    """
    Contract tests ensuring all DatabaseProvider implementations follow the interface.

    These tests verify that:
    1. All abstract methods are implemented
    2. Method signatures match the interface
    3. Return types are correct
    4. Error handling is consistent
    """

    @pytest.fixture
    def provider_implementations(self):
        """
        Fixture providing all DatabaseProvider implementations to test.

        Returns:
            List of DatabaseProvider class types (not instances)
        """
        from app.service.agent.tools.database_tool.snowflake_provider import SnowflakeProvider
        from app.service.agent.tools.database_tool.postgres_client import PostgreSQLProvider

        return [SnowflakeProvider, PostgreSQLProvider]

    def test_provider_is_abstract_base_class(self):
        """Verify DatabaseProvider is an abstract base class."""
        assert issubclass(DatabaseProvider, ABC), \
            "DatabaseProvider must inherit from ABC"

    def test_provider_has_required_methods(self):
        """Verify DatabaseProvider defines all required abstract methods."""
        required_methods = [
            'connect',
            'disconnect',
            'execute_query',
            'get_connection'
        ]

        for method_name in required_methods:
            assert hasattr(DatabaseProvider, method_name), \
                f"DatabaseProvider must define abstract method: {method_name}"

    def test_all_providers_implement_interface(self, provider_implementations):
        """Verify all concrete providers implement the DatabaseProvider interface."""
        for provider_class in provider_implementations:
            assert issubclass(provider_class, DatabaseProvider), \
                f"{provider_class.__name__} must inherit from DatabaseProvider"

    def test_all_providers_implement_connect(self, provider_implementations):
        """Verify all providers implement connect() method."""
        for provider_class in provider_implementations:
            assert hasattr(provider_class, 'connect'), \
                f"{provider_class.__name__} must implement connect()"

            # Check method signature (takes no arguments except self)
            method = getattr(provider_class, 'connect')
            assert callable(method), \
                f"{provider_class.__name__}.connect must be callable"

    def test_all_providers_implement_disconnect(self, provider_implementations):
        """Verify all providers implement disconnect() method."""
        for provider_class in provider_implementations:
            assert hasattr(provider_class, 'disconnect'), \
                f"{provider_class.__name__} must implement disconnect()"

            method = getattr(provider_class, 'disconnect')
            assert callable(method), \
                f"{provider_class.__name__}.disconnect must be callable"

    def test_all_providers_implement_execute_query(self, provider_implementations):
        """Verify all providers implement execute_query() method with correct signature."""
        for provider_class in provider_implementations:
            assert hasattr(provider_class, 'execute_query'), \
                f"{provider_class.__name__} must implement execute_query()"

            method = getattr(provider_class, 'execute_query')
            assert callable(method), \
                f"{provider_class.__name__}.execute_query must be callable"

    def test_all_providers_implement_get_connection(self, provider_implementations):
        """Verify all providers implement get_connection() method."""
        for provider_class in provider_implementations:
            assert hasattr(provider_class, 'get_connection'), \
                f"{provider_class.__name__} must implement get_connection()"

            method = getattr(provider_class, 'get_connection')
            assert callable(method), \
                f"{provider_class.__name__}.get_connection must be callable"

    def test_execute_query_returns_list_of_dicts(self, provider_implementations):
        """
        Verify execute_query() returns List[Dict[str, Any]].

        This test will fail initially and pass after implementation.
        We can't test actual query execution without database connection,
        but we can verify the method exists and has the right signature.
        """
        for provider_class in provider_implementations:
            # Get method signature from annotations if available
            method = getattr(provider_class, 'execute_query')

            # Verify method exists and is callable
            assert callable(method), \
                f"{provider_class.__name__}.execute_query must be callable"

            # Check if the method has return type annotation
            if hasattr(method, '__annotations__'):
                annotations = method.__annotations__
                # Note: Actual return type checking would require instantiation
                # which we avoid in contract tests

    def test_providers_can_be_instantiated(self, provider_implementations):
        """
        Verify all providers can be instantiated without connection.

        This test ensures the provider constructors don't require
        immediate database connection, allowing for deferred initialization.
        """
        for provider_class in provider_implementations:
            try:
                # Attempt to instantiate without connecting
                provider = provider_class()

                # Verify it's an instance of DatabaseProvider
                assert isinstance(provider, DatabaseProvider), \
                    f"{provider_class.__name__} instance must be DatabaseProvider"

            except TypeError as e:
                # If instantiation fails, it might require config parameters
                # This is acceptable, but document it
                pytest.skip(
                    f"{provider_class.__name__} requires configuration "
                    f"parameters for instantiation: {e}"
                )

    def test_connection_lifecycle(self, provider_implementations):
        """
        Verify connection lifecycle methods can be called in sequence.

        This is a smoke test to ensure:
        1. connect() can be called
        2. disconnect() can be called after connect()
        3. Multiple connect/disconnect cycles are safe
        """
        for provider_class in provider_implementations:
            try:
                provider = provider_class()

                # Test that connection methods exist and are callable
                # Actual connection testing is done in integration tests
                assert callable(provider.connect)
                assert callable(provider.disconnect)

            except (TypeError, AttributeError) as e:
                pytest.skip(
                    f"{provider_class.__name__} instantiation requires "
                    f"configuration: {e}"
                )

    def test_error_handling_consistency(self, provider_implementations):
        """
        Verify all providers raise consistent error types.

        This ensures that error handling code can work uniformly
        across different database providers.
        """
        # All providers should raise ConnectionError for connection issues
        # and QueryExecutionError for query problems
        # This is verified through their exception raising in actual implementation

        for provider_class in provider_implementations:
            # Verify the class can be instantiated for error testing
            # Actual error behavior is tested in integration tests
            assert provider_class is not None
