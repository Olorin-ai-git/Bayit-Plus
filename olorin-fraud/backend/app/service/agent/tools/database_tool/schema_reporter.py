"""
Schema Validation Reporting.

Generates detailed, human-readable reports for schema differences.

Constitutional Compliance:
- NO hardcoded values
- Complete reporting implementation
- Actionable guidance
"""

from typing import Dict, List

from .schema_models import ColumnInfo, SchemaDifference, SchemaInfo, TypeMismatch


class SchemaReporter:
    """Generates detailed reports for schema validation results."""

    def __init__(self, type_mappings: Dict[str, str]):
        """
        Initialize reporter with type mappings.

        Args:
            type_mappings: Snowflake -> PostgreSQL type mapping dictionary
        """
        self.type_mappings = type_mappings

    def generate_detailed_report(
        self,
        sf_schema: SchemaInfo,
        pg_schema: SchemaInfo,
        differences: List[SchemaDifference],
        missing_cols: List[str],
        type_mismatches: List[TypeMismatch],
        nullability_mismatches: List[SchemaDifference],
    ) -> str:
        """Generate detailed human-readable report of schema differences."""
        lines = []
        lines.append("=" * 80)
        lines.append("DETAILED SCHEMA PARITY REPORT")
        lines.append("=" * 80)
        lines.append("")
        lines.append(
            f"Snowflake Table: {sf_schema.table_name} ({len(sf_schema.columns)} columns)"
        )
        lines.append(
            f"PostgreSQL Table: {pg_schema.table_name} ({len(pg_schema.columns)} columns)"
        )
        lines.append("")

        if not differences:
            lines.append("✅ PERFECT MATCH: All schemas are identical")
            lines.append("")
            return "\n".join(lines)

        lines.append(f"❌ VALIDATION FAILED: {len(differences)} differences detected")
        lines.append("")

        if missing_cols:
            lines.extend(self._format_missing_columns(missing_cols, sf_schema))

        if type_mismatches:
            lines.extend(self._format_type_mismatches(type_mismatches))

        if nullability_mismatches:
            lines.extend(self._format_nullability_mismatches(nullability_mismatches))

        lines.append("=" * 80)
        return "\n".join(lines)

    def _format_missing_columns(
        self, missing_cols: List[str], sf_schema: SchemaInfo
    ) -> List[str]:
        """Format missing columns section."""
        lines = []
        lines.append(f"MISSING COLUMNS IN POSTGRESQL ({len(missing_cols)}):")
        lines.append("-" * 80)
        for col in missing_cols:
            # Find column in Snowflake schema
            sf_col = next((c for c in sf_schema.columns if c.name == col), None)
            if sf_col:
                lines.append(f"  • {col}")
                lines.append(f"    Snowflake Type: {sf_col.data_type}")
                lines.append(f"    Nullable: {sf_col.is_nullable}")
        lines.append("")
        return lines

    def _format_type_mismatches(self, type_mismatches: List[TypeMismatch]) -> List[str]:
        """Format type mismatches section."""
        lines = []
        lines.append(f"TYPE MISMATCHES ({len(type_mismatches)}):")
        lines.append("-" * 80)
        for tm in type_mismatches:
            lines.append(f"  • {tm.column_name}")
            lines.append(f"    Snowflake: {tm.snowflake_type}")
            lines.append(f"    PostgreSQL: {tm.postgresql_type}")
            expected = self._get_expected_pg_type(tm.snowflake_type)
            lines.append(f"    Expected: {expected}")
        lines.append("")
        return lines

    def _format_nullability_mismatches(
        self, nullability_mismatches: List[SchemaDifference]
    ) -> List[str]:
        """Format nullability mismatches section."""
        lines = []
        lines.append(f"NULLABILITY MISMATCHES ({len(nullability_mismatches)}):")
        lines.append("-" * 80)
        for nm in nullability_mismatches:
            lines.append(f"  • {nm.column_name}")
            lines.append(f"    Snowflake Nullable: {nm.snowflake_value}")
            lines.append(f"    PostgreSQL Nullable: {nm.postgresql_value}")
        lines.append("")
        return lines

    def _get_expected_pg_type(self, snowflake_type: str) -> str:
        """Get expected PostgreSQL type for a Snowflake type."""
        normalized = snowflake_type.upper()
        for sf_type, pg_type in self.type_mappings.items():
            if sf_type in normalized:
                return pg_type
        return normalized
