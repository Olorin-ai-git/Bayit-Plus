"""
Schema Data Models for Database Parity Validation.

Data classes representing schema structures and validation results.

Constitutional Compliance:
- NO hardcoded values
- Complete data models
- Type-safe structures
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class ColumnInfo:
    """Information about a database column."""
    name: str
    data_type: str
    is_nullable: bool
    max_length: Optional[int] = None


@dataclass
class SchemaInfo:
    """Complete schema information for a table."""
    table_name: str
    columns: List[ColumnInfo]
    database_type: str  # 'snowflake' or 'postgresql'


@dataclass
class SchemaDifference:
    """Represents a difference between two schemas."""
    difference_type: str  # 'missing_column', 'type_mismatch', 'nullability_mismatch'
    column_name: str
    snowflake_value: Any = None
    postgresql_value: Any = None


@dataclass
class TypeMismatch:
    """Type mismatch between databases."""
    column_name: str
    snowflake_type: str
    postgresql_type: str


@dataclass
class ValidationResult:
    """Result of schema parity validation."""
    is_valid: bool
    differences: List[SchemaDifference]
    missing_columns: List[str]
    type_mismatches: List[TypeMismatch]
    column_count_snowflake: int
    column_count_postgresql: int
    summary: str
    nullability_mismatches: List[SchemaDifference] = field(default_factory=list)
    detailed_report: str = ""

    def get_actionable_guidance(self) -> Dict[str, List[str]]:
        """Generate actionable guidance for resolving schema differences."""
        guidance = {
            'critical_actions': [],
            'warnings': [],
            'manual_steps': []
        }

        if self.missing_columns:
            guidance['critical_actions'].append(
                f"CRITICAL: {len(self.missing_columns)} columns missing in PostgreSQL. "
                "PostgreSQL schema must be manually updated to include all Snowflake columns."
            )
            guidance['manual_steps'].append(
                "1. Review missing columns in Snowflake INFORMATION_SCHEMA"
            )
            guidance['manual_steps'].append(
                "2. Manually add missing columns to PostgreSQL with matching types"
            )

        if self.type_mismatches:
            guidance['critical_actions'].append(
                f"CRITICAL: {len(self.type_mismatches)} type mismatches detected. "
                "Column types must match exactly between databases."
            )
            guidance['manual_steps'].append(
                "3. Review type mappings: NUMBER→NUMERIC, VARCHAR→CHARACTER VARYING, etc."
            )
            guidance['manual_steps'].append(
                "4. Manually alter PostgreSQL column types to match Snowflake"
            )

        if self.nullability_mismatches:
            guidance['warnings'].append(
                f"WARNING: {len(self.nullability_mismatches)} nullability mismatches. "
                "Columns should have consistent nullable constraints."
            )
            guidance['manual_steps'].append(
                "5. Manually update PostgreSQL NOT NULL constraints to match Snowflake"
            )

        return guidance
