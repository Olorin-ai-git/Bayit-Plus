"""
Unit tests for SchemaValidator.

Tests schema comparison logic in isolation without database connections.

Following TDD: These tests MUST FAIL until SchemaValidator is implemented.

Constitutional Compliance:
- NO mocks for business logic - only for external dependencies
- Complete test coverage for all methods
- Fail-fast validation
"""

from typing import Any, Dict, List
from unittest.mock import MagicMock, Mock

import pytest

from app.service.agent.tools.database_tool.schema_models import (
    ColumnInfo,
    SchemaDifference,
    SchemaInfo,
    TypeMismatch,
    ValidationResult,
)
from app.service.agent.tools.database_tool.schema_validator import SchemaValidator


class TestSchemaValidatorInit:
    """Test SchemaValidator initialization."""

    def test_schema_validator_can_be_instantiated(self):
        """Test that SchemaValidator can be created."""
        validator = SchemaValidator()
        assert validator is not None

    def test_schema_validator_loads_table_name_from_config(self):
        """Test that table name comes from configuration."""
        validator = SchemaValidator()

        # Should have table_name attribute loaded from config
        assert hasattr(validator, "table_name")
        assert isinstance(validator.table_name, str)
        assert len(validator.table_name) > 0


class TestSchemaInfoDataClass:
    """Test SchemaInfo data class."""

    def test_schema_info_creation(self):
        """Test creating SchemaInfo instance."""
        columns = [
            ColumnInfo(
                name="id", data_type="INTEGER", is_nullable=False, max_length=None
            ),
            ColumnInfo(
                name="email", data_type="VARCHAR", is_nullable=True, max_length=255
            ),
        ]

        schema = SchemaInfo(
            table_name="users", columns=columns, database_type="postgresql"
        )

        assert schema.table_name == "users"
        assert len(schema.columns) == 2
        assert schema.database_type == "postgresql"


class TestColumnInfoDataClass:
    """Test ColumnInfo data class."""

    def test_column_info_creation(self):
        """Test creating ColumnInfo instance."""
        column = ColumnInfo(
            name="user_id", data_type="BIGINT", is_nullable=False, max_length=None
        )

        assert column.name == "user_id"
        assert column.data_type == "BIGINT"
        assert column.is_nullable is False
        assert column.max_length is None

    def test_column_info_with_max_length(self):
        """Test ColumnInfo with max_length for VARCHAR."""
        column = ColumnInfo(
            name="description", data_type="VARCHAR", is_nullable=True, max_length=1000
        )

        assert column.max_length == 1000


class TestValidationResultDataClass:
    """Test ValidationResult data class."""

    def test_validation_result_success(self):
        """Test ValidationResult for successful validation."""
        result = ValidationResult(
            is_valid=True,
            differences=[],
            missing_columns=[],
            type_mismatches=[],
            column_count_snowflake=333,
            column_count_postgresql=333,
            summary="All 333 columns match perfectly",
        )

        assert result.is_valid is True
        assert len(result.differences) == 0
        assert len(result.missing_columns) == 0


class TestSchemaValidator:
    """Test SchemaValidator core functionality."""

    @pytest.fixture
    def mock_snowflake_provider(self):
        """Create mock Snowflake provider."""
        provider = Mock()
        provider.execute_query = Mock(
            return_value=[
                {"COLUMN_NAME": "ID", "DATA_TYPE": "NUMBER", "IS_NULLABLE": "NO"},
                {"COLUMN_NAME": "EMAIL", "DATA_TYPE": "VARCHAR", "IS_NULLABLE": "YES"},
            ]
        )
        return provider

    @pytest.fixture
    def mock_postgresql_provider(self):
        """Create mock PostgreSQL provider."""
        provider = Mock()
        provider.execute_query = Mock(
            return_value=[
                {"column_name": "id", "data_type": "bigint", "is_nullable": False},
                {
                    "column_name": "email",
                    "data_type": "character varying",
                    "is_nullable": True,
                },
            ]
        )
        return provider

    def test_get_schema_snowflake(self, mock_snowflake_provider):
        """Test extracting schema from Snowflake."""
        validator = SchemaValidator()
        schema = validator.get_schema(mock_snowflake_provider)

        assert isinstance(schema, SchemaInfo)
        assert len(schema.columns) == 2
        assert schema.database_type == "snowflake"

    def test_get_schema_postgresql(self, mock_postgresql_provider):
        """Test extracting schema from PostgreSQL."""
        validator = SchemaValidator()
        schema = validator.get_schema(mock_postgresql_provider)

        assert isinstance(schema, SchemaInfo)
        assert len(schema.columns) == 2
        assert schema.database_type == "postgresql"

    def test_compare_schemas_identical(self):
        """Test comparing two identical schemas."""
        validator = SchemaValidator()

        schema1 = SchemaInfo(
            table_name="test",
            columns=[
                ColumnInfo("id", "INTEGER", False, None),
                ColumnInfo("name", "VARCHAR", True, 255),
            ],
            database_type="snowflake",
        )

        schema2 = SchemaInfo(
            table_name="test",
            columns=[
                ColumnInfo("id", "INTEGER", False, None),
                ColumnInfo("name", "VARCHAR", True, 255),
            ],
            database_type="postgresql",
        )

        differences = validator.compare_schemas(schema1, schema2)

        assert isinstance(differences, list)
        assert len(differences) == 0, "Identical schemas should have no differences"

    def test_compare_schemas_missing_column(self):
        """Test detecting missing columns."""
        validator = SchemaValidator()

        schema1 = SchemaInfo(
            table_name="test",
            columns=[
                ColumnInfo("id", "INTEGER", False, None),
                ColumnInfo("name", "VARCHAR", True, 255),
                ColumnInfo("email", "VARCHAR", True, 255),
            ],
            database_type="snowflake",
        )

        schema2 = SchemaInfo(
            table_name="test",
            columns=[
                ColumnInfo("id", "INTEGER", False, None),
                ColumnInfo("name", "VARCHAR", True, 255),
                # Missing 'email' column
            ],
            database_type="postgresql",
        )

        differences = validator.compare_schemas(schema1, schema2)

        assert len(differences) > 0, "Should detect missing column"
        # Should have a difference for missing 'email' column
        missing_cols = [d for d in differences if d.difference_type == "missing_column"]
        assert len(missing_cols) == 1
        assert missing_cols[0].column_name == "email"

    def test_compare_schemas_type_mismatch(self):
        """Test detecting type mismatches."""
        validator = SchemaValidator()

        schema1 = SchemaInfo(
            table_name="test",
            columns=[ColumnInfo("amount", "DECIMAL", False, None)],
            database_type="snowflake",
        )

        schema2 = SchemaInfo(
            table_name="test",
            columns=[ColumnInfo("amount", "INTEGER", False, None)],  # Wrong type
            database_type="postgresql",
        )

        differences = validator.compare_schemas(schema1, schema2)

        assert len(differences) > 0, "Should detect type mismatch"
        type_mismatches = [
            d for d in differences if d.difference_type == "type_mismatch"
        ]
        assert len(type_mismatches) == 1

    def test_validate_parity_success(
        self, mock_snowflake_provider, mock_postgresql_provider
    ):
        """Test successful schema parity validation."""
        validator = SchemaValidator()

        result = validator.validate_parity(
            mock_snowflake_provider, mock_postgresql_provider
        )

        assert isinstance(result, ValidationResult)
        assert hasattr(result, "is_valid")
        assert hasattr(result, "differences")
        assert hasattr(result, "summary")

    def test_normalize_column_name(self):
        """Test column name normalization (case insensitive)."""
        validator = SchemaValidator()

        # Snowflake uses uppercase, PostgreSQL uses lowercase
        # Normalization should make them comparable
        normalized_upper = validator._normalize_column_name("USER_ID")
        normalized_lower = validator._normalize_column_name("user_id")
        normalized_mixed = validator._normalize_column_name("User_Id")

        # All should normalize to same value
        assert normalized_upper == normalized_lower == normalized_mixed

    def test_normalize_type_name(self):
        """Test type name normalization."""
        validator = SchemaValidator()

        # Different databases use different type names for same concept
        # NUMBER (Snowflake) → NUMERIC (PostgreSQL)
        # VARCHAR (Snowflake) → CHARACTER VARYING (PostgreSQL)

        # Should map equivalent types
        snowflake_type = validator._normalize_type_name("NUMBER", "snowflake")
        postgresql_type = validator._normalize_type_name("BIGINT", "postgresql")

        # Both should map to comparable type
        assert snowflake_type is not None
        assert postgresql_type is not None


class TestSchemaValidatorErrorHandling:
    """Test error handling in SchemaValidator."""

    def test_get_schema_fails_fast_on_query_error(self):
        """Test that get_schema fails fast if query fails."""
        validator = SchemaValidator()

        failing_provider = Mock()
        failing_provider.execute_query = Mock(side_effect=Exception("Query failed"))

        with pytest.raises(Exception) as exc_info:
            validator.get_schema(failing_provider)

        assert "query failed" in str(exc_info.value).lower()

    def test_validate_parity_requires_both_providers(self):
        """Test that validate_parity requires both providers."""
        validator = SchemaValidator()

        with pytest.raises(Exception):
            validator.validate_parity(None, None)


class TestSchemaValidatorConfiguration:
    """Test configuration loading in SchemaValidator."""

    def test_table_name_from_environment(self):
        """Test that table name comes from environment configuration."""
        import os

        # Table name should be configurable via environment
        # Not hardcoded
        validator = SchemaValidator()

        # Should have loaded table name
        assert validator.table_name is not None

        # For Snowflake: TRANSACTIONS_ENRICHED
        # For PostgreSQL: transactions_enriched
        # Should handle case normalization
