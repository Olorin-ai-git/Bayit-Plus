"""
Schema Validator for Database Parity Validation.

Validates that Snowflake and PostgreSQL databases have identical schemas.
Enforces 100% schema parity with 333 columns matching exactly.

Constitutional Compliance:
- NO hardcoded values - table names from configuration
- Fail-fast on schema mismatches
- Complete validation - no partial checks
"""

import os
from typing import List, Dict

from app.service.logging import get_bridge_logger
from .schema_models import (
    SchemaInfo,
    SchemaDifference,
    TypeMismatch,
    ValidationResult
)
from .schema_reporter import SchemaReporter
from .schema_introspector import SchemaIntrospector

logger = get_bridge_logger(__name__)


class SchemaValidator:
    """Validates schema parity between Snowflake and PostgreSQL."""

    # Expected column count based on project specification
    EXPECTED_COLUMN_COUNT = 333

    def __init__(self):
        """Initialize validator with configuration."""
        # Get table names from environment
        snowflake_table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')
        postgres_table = os.getenv('POSTGRES_TRANSACTIONS_TABLE', 'transactions_enriched')

        self.snowflake_table = snowflake_table
        self.postgresql_table = postgres_table
        self.table_name = postgres_table

        # Type mapping: Snowflake → PostgreSQL
        self._type_map = {
            'NUMBER': 'NUMERIC',
            'VARCHAR': 'CHARACTER VARYING',
            'TIMESTAMP_NTZ': 'TIMESTAMP',
            'VARIANT': 'JSONB',
            'ARRAY': 'ARRAY',
            'BOOLEAN': 'BOOLEAN',
            'DATE': 'DATE'
        }

        # Initialize components
        self.introspector = SchemaIntrospector(snowflake_table, postgres_table)
        self.reporter = SchemaReporter(self._type_map)

        logger.info(f"SchemaValidator initialized: SF={snowflake_table}, PG={postgres_table}")

    def get_schema(self, provider) -> SchemaInfo:
        """
        Extract schema from database provider.

        Args:
            provider: DatabaseProvider instance

        Returns:
            SchemaInfo with complete schema metadata
        """
        return self.introspector.introspect_schema(provider)

    def compare_schemas(self, schema1: SchemaInfo, schema2: SchemaInfo) -> List[SchemaDifference]:
        """Compare two schemas and return differences."""
        differences = []

        # Create column maps (normalized names)
        schema1_cols = {self._normalize_column_name(c.name): c for c in schema1.columns}
        schema2_cols = {self._normalize_column_name(c.name): c for c in schema2.columns}

        # Check for missing columns
        for norm_name, col in schema1_cols.items():
            if norm_name not in schema2_cols:
                differences.append(SchemaDifference(
                    difference_type='missing_column',
                    column_name=col.name,
                    snowflake_value=col.name,
                    postgresql_value=None
                ))

        # Check for type mismatches and nullability
        for norm_name, col1 in schema1_cols.items():
            if norm_name in schema2_cols:
                col2 = schema2_cols[norm_name]

                # Normalize types for comparison
                type1 = self._normalize_type_name(col1.data_type, schema1.database_type)
                type2 = self._normalize_type_name(col2.data_type, schema2.database_type)

                if type1 != type2:
                    differences.append(SchemaDifference(
                        difference_type='type_mismatch',
                        column_name=col1.name,
                        snowflake_value=col1.data_type,
                        postgresql_value=col2.data_type
                    ))

                if col1.is_nullable != col2.is_nullable:
                    differences.append(SchemaDifference(
                        difference_type='nullability_mismatch',
                        column_name=col1.name,
                        snowflake_value=col1.is_nullable,
                        postgresql_value=col2.is_nullable
                    ))

        return differences

    def validate_parity(self, snowflake_provider, postgresql_provider) -> ValidationResult:
        """Validate schema parity between databases."""
        if not snowflake_provider or not postgresql_provider:
            raise ValueError("Both providers required for validation")

        # Get schemas
        sf_schema = self.get_schema(snowflake_provider)
        pg_schema = self.get_schema(postgresql_provider)

        # Verify expected column count (fail-fast on specification violation)
        if len(sf_schema.columns) != self.EXPECTED_COLUMN_COUNT:
            logger.warning(
                f"⚠️  Snowflake schema has {len(sf_schema.columns)} columns, "
                f"expected {self.EXPECTED_COLUMN_COUNT} per specification"
            )

        if len(pg_schema.columns) != self.EXPECTED_COLUMN_COUNT:
            logger.warning(
                f"⚠️  PostgreSQL schema has {len(pg_schema.columns)} columns, "
                f"expected {self.EXPECTED_COLUMN_COUNT} per specification"
            )

        # Compare
        differences = self.compare_schemas(sf_schema, pg_schema)

        # Categorize differences
        missing_cols = [d.column_name for d in differences if d.difference_type == 'missing_column']
        type_mismatches = [
            TypeMismatch(d.column_name, d.snowflake_value, d.postgresql_value)
            for d in differences if d.difference_type == 'type_mismatch'
        ]
        nullability_mismatches = [d for d in differences if d.difference_type == 'nullability_mismatch']

        is_valid = len(differences) == 0
        summary = (
            f"Schema validation: {len(sf_schema.columns)} Snowflake columns, "
            f"{len(pg_schema.columns)} PostgreSQL columns. "
            f"{len(differences)} differences found."
        )

        # Generate detailed report using reporter
        detailed_report = self.reporter.generate_detailed_report(
            sf_schema, pg_schema, differences, missing_cols,
            type_mismatches, nullability_mismatches
        )

        return ValidationResult(
            is_valid=is_valid,
            differences=differences,
            missing_columns=missing_cols,
            type_mismatches=type_mismatches,
            column_count_snowflake=len(sf_schema.columns),
            column_count_postgresql=len(pg_schema.columns),
            summary=summary,
            nullability_mismatches=nullability_mismatches,
            detailed_report=detailed_report
        )

    def _normalize_column_name(self, name: str) -> str:
        """Normalize column name for case-insensitive comparison."""
        return name.upper().strip()

    def _normalize_type_name(self, type_name: str, database_type: str) -> str:
        """Normalize type names for comparison across databases."""
        normalized = type_name.upper().strip()

        # Apply type mapping for Snowflake types
        if database_type == 'snowflake':
            for sf_type, pg_type in self._type_map.items():
                if sf_type in normalized:
                    return pg_type

        # Normalize PostgreSQL types
        if database_type == 'postgresql':
            if 'CHARACTER VARYING' in normalized or 'VARCHAR' in normalized:
                return 'CHARACTER VARYING'
            if 'BIGINT' in normalized or 'INT8' in normalized:
                return 'BIGINT'
            if 'INTEGER' in normalized or 'INT4' in normalized:
                return 'INTEGER'

        return normalized
