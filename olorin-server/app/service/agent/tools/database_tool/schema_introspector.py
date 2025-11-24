"""
Schema Introspection for Database Providers.

Extracts schema metadata from Snowflake and PostgreSQL databases.

Constitutional Compliance:
- NO hardcoded values
- Complete introspection implementation
- Database-agnostic interface
"""

from typing import List
from .schema_models import ColumnInfo, SchemaInfo


class SchemaIntrospector:
    """Introspects schema metadata from database providers."""

    def __init__(self, snowflake_table: str, postgresql_table: str):
        """
        Initialize introspector with table names.

        Args:
            snowflake_table: Snowflake table name (uppercase)
            postgresql_table: PostgreSQL table name (lowercase)
        """
        self.snowflake_table = snowflake_table
        self.postgresql_table = postgresql_table

    def introspect_schema(self, provider) -> SchemaInfo:
        """
        Extract schema from database provider.

        Args:
            provider: DatabaseProvider instance

        Returns:
            SchemaInfo with complete schema metadata
        """
        database_type = self._detect_database_type(provider)

        if database_type == 'snowflake':
            return self._introspect_snowflake(provider)
        else:
            return self._introspect_postgresql(provider)

    def _detect_database_type(self, provider) -> str:
        """Detect database type from provider class name."""
        return 'snowflake' if 'Snowflake' in type(provider).__name__ else 'postgresql'

    def _introspect_snowflake(self, provider) -> SchemaInfo:
        """Introspect Snowflake schema."""
        query = f"""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '{self.snowflake_table}'
            ORDER BY ORDINAL_POSITION
        """

        results = provider.execute_query(query)
        columns = []

        for row in results:
            col = ColumnInfo(
                name=row['COLUMN_NAME'],
                data_type=row['DATA_TYPE'],
                is_nullable=(row['IS_NULLABLE'] == 'YES'),
                max_length=row.get('CHARACTER_MAXIMUM_LENGTH')
            )
            columns.append(col)

        return SchemaInfo(
            table_name=self.snowflake_table,
            columns=columns,
            database_type='snowflake'
        )

    def _introspect_postgresql(self, provider) -> SchemaInfo:
        """Introspect PostgreSQL schema."""
        query = f"""
            SELECT column_name, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = '{self.postgresql_table}'
            ORDER BY ordinal_position
        """

        results = provider.execute_query(query)
        columns = []

        for row in results:
            col = ColumnInfo(
                name=row['column_name'],
                data_type=row['data_type'],
                is_nullable=(row['is_nullable'] == True or row['is_nullable'] == 'YES'),
                max_length=row.get('character_maximum_length')
            )
            columns.append(col)

        return SchemaInfo(
            table_name=self.postgresql_table,
            columns=columns,
            database_type='postgresql'
        )
