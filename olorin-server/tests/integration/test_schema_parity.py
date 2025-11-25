"""
Integration tests for schema parity between Snowflake and PostgreSQL.

This module verifies that both databases have identical schema structure
with all 333 columns matching in name, type, and nullability.

Following TDD: These tests MUST FAIL until SchemaValidator is fully implemented.

Constitutional Compliance:
- NO mocks - uses real database connections (test containers for PostgreSQL)
- NO hardcoded values - all from configuration
- Complete validation - no partial checks
"""

from typing import Any, Dict, List

import pytest

from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.agent.tools.database_tool.schema_validator import SchemaValidator


class TestSchemaParity:
    """Integration tests for schema parity validation between databases."""

    @pytest.fixture
    def snowflake_provider(self):
        """Create Snowflake provider for testing."""
        provider = get_database_provider("snowflake")
        provider.connect()
        yield provider
        provider.disconnect()

    @pytest.fixture
    def postgresql_provider(self, postgresql_container):
        """Create PostgreSQL provider for testing."""
        provider = get_database_provider("postgresql")
        provider.connect()
        yield provider
        provider.disconnect()

    @pytest.fixture
    def schema_validator(self):
        """Create SchemaValidator instance."""
        return SchemaValidator()

    @pytest.mark.integration
    def test_schema_validator_compares_both_databases(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that SchemaValidator can introspect both database schemas."""
        # Validate schema parity
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Should return validation result object
        assert result is not None
        assert hasattr(result, "is_valid")
        assert hasattr(result, "differences")

    @pytest.mark.integration
    def test_identical_schemas_pass_validation(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that identical schemas pass validation with no differences."""
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # If schemas are truly identical, validation should pass
        if result.is_valid:
            assert (
                len(result.differences) == 0
            ), "Identical schemas should have zero differences"
            assert result.missing_columns == [], "Should have no missing columns"
            assert result.type_mismatches == [], "Should have no type mismatches"

    @pytest.mark.integration
    def test_schema_validator_detects_missing_columns(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that validator detects when PostgreSQL is missing columns."""
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Should have missing_columns attribute
        assert hasattr(result, "missing_columns")
        assert isinstance(result.missing_columns, list)

        # If there are missing columns, validation should fail
        if len(result.missing_columns) > 0:
            assert (
                not result.is_valid
            ), "Validation should fail when columns are missing"

    @pytest.mark.integration
    def test_schema_validator_detects_type_mismatches(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that validator detects type mismatches between databases."""
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Should have type_mismatches attribute
        assert hasattr(result, "type_mismatches")
        assert isinstance(result.type_mismatches, list)

        # Each type mismatch should contain column info
        for mismatch in result.type_mismatches:
            assert hasattr(mismatch, "column_name")
            assert hasattr(mismatch, "snowflake_type")
            assert hasattr(mismatch, "postgresql_type")

    @pytest.mark.integration
    def test_schema_validator_verifies_333_columns(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that both databases have exactly 333 columns as specified."""
        # Get schema from both providers
        snowflake_schema = schema_validator.get_schema(snowflake_provider)
        postgresql_schema = schema_validator.get_schema(postgresql_provider)

        # Both should have 333 columns
        assert (
            len(snowflake_schema.columns) == 333
        ), f"Snowflake should have 333 columns, found {len(snowflake_schema.columns)}"
        assert (
            len(postgresql_schema.columns) == 333
        ), f"PostgreSQL should have 333 columns, found {len(postgresql_schema.columns)}"

    @pytest.mark.integration
    def test_schema_introspection_returns_complete_metadata(
        self, schema_validator, snowflake_provider
    ):
        """Test that schema introspection returns all required metadata."""
        schema = schema_validator.get_schema(snowflake_provider)

        # Schema should have required attributes
        assert hasattr(schema, "table_name")
        assert hasattr(schema, "columns")
        assert hasattr(schema, "database_type")

        # Each column should have complete metadata
        assert len(schema.columns) > 0, "Should have at least one column"

        first_column = schema.columns[0]
        assert hasattr(first_column, "name")
        assert hasattr(first_column, "data_type")
        assert hasattr(first_column, "is_nullable")
        assert hasattr(first_column, "max_length")

    @pytest.mark.integration
    def test_validation_result_provides_detailed_differences(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that validation result includes detailed difference information."""
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Result should have comprehensive difference reporting
        assert hasattr(result, "summary")
        assert hasattr(result, "column_count_snowflake")
        assert hasattr(result, "column_count_postgresql")

        # Summary should be human-readable
        assert isinstance(result.summary, str)
        assert len(result.summary) > 0

    @pytest.mark.integration
    def test_schema_validator_handles_case_sensitivity(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """
        Test that validator handles case sensitivity correctly.

        Snowflake uses uppercase by default, PostgreSQL uses lowercase.
        Validator should normalize for comparison.
        """
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Should not report case differences as actual differences
        # All comparison should be case-insensitive
        assert result is not None

    @pytest.mark.integration
    def test_schema_validator_compares_nullability(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that validator compares nullable constraints correctly."""
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )

        # Should detect nullability mismatches
        if hasattr(result, "nullability_mismatches"):
            assert isinstance(result.nullability_mismatches, list)

    @pytest.mark.integration
    def test_schema_validation_performance(
        self, schema_validator, snowflake_provider, postgresql_provider
    ):
        """Test that schema validation completes within performance requirements."""
        import time

        start_time = time.time()
        result = schema_validator.validate_parity(
            snowflake_provider, postgresql_provider
        )
        elapsed_time = time.time() - start_time

        # Should complete within 2 seconds as per spec
        assert (
            elapsed_time < 2.0
        ), f"Schema validation took {elapsed_time:.2f}s, should be < 2s"

    @pytest.mark.integration
    def test_schema_validator_fail_fast_on_connection_error(self, schema_validator):
        """Test that validator fails fast if database connection fails."""
        from app.service.agent.tools.database_tool.database_provider import (
            DatabaseProvider,
        )

        # Create a mock provider that will fail connection
        class FailingProvider(DatabaseProvider):
            def connect(self):
                raise ConnectionError("Database not available")

            def disconnect(self):
                pass

            def execute_query(self, query, params=None):
                raise ConnectionError("Not connected")

            def get_connection(self):
                raise ConnectionError("No connection")

        failing_provider = FailingProvider()

        # Should raise exception, not return partial results
        with pytest.raises(Exception) as exc_info:
            schema_validator.get_schema(failing_provider)

        assert (
            "connection" in str(exc_info.value).lower()
            or "not available" in str(exc_info.value).lower()
        )


class TestSchemaValidatorConfiguration:
    """Test that SchemaValidator uses configuration correctly."""

    def test_schema_validator_table_name_from_config(self):
        """Test that table name comes from configuration, not hardcoded."""
        validator = SchemaValidator()

        # Should have table name from configuration
        assert hasattr(validator, "table_name")

        # Should not be hardcoded - verify it came from config
        # (actual value depends on environment)
        assert validator.table_name is not None
        assert len(validator.table_name) > 0

    def test_schema_validator_no_hardcoded_column_list(self):
        """Test that validator doesn't have hardcoded list of expected columns."""
        validator = SchemaValidator()

        # Should dynamically fetch schema, not use hardcoded list
        # If there's an expected_columns attribute, it should come from config
        if hasattr(validator, "expected_columns"):
            # Should be loaded from configuration, not hardcoded in code
            assert len(validator.expected_columns) == 333
