#!/usr/bin/env python3
"""
Create PostgreSQL schema from Snowflake CSV schema definition.

This script reads the Tx Table Schema.csv file and creates the
transactions_enriched table in PostgreSQL with 333 columns.
"""

import asyncio
import csv
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.database_tool import get_database_provider

# Type mapping from Snowflake to PostgreSQL
TYPE_MAPPING = {
    'VARCHAR(16777216)': 'TEXT',
    'VARCHAR(26)': 'VARCHAR(26)',
    'TIMESTAMP_NTZ(9)': 'TIMESTAMP WITHOUT TIME ZONE',
    'NUMBER(38,0)': 'BIGINT',
    'NUMBER(1,0)': 'SMALLINT',
    'NUMBER(2,0)': 'SMALLINT',
    'NUMBER(9,0)': 'INTEGER',
    'NUMBER(18,0)': 'BIGINT',
    'NUMBER(19,6)': 'NUMERIC(19,6)',
    'NUMBER(24,6)': 'NUMERIC(24,6)',
    'FLOAT': 'DOUBLE PRECISION',
    'OBJECT': 'JSONB',
    'VARIANT': 'JSONB',
    'ARRAY': 'JSONB',
    'BOOLEAN': 'BOOLEAN'
}


async def create_postgres_schema():
    """Create PostgreSQL table from Snowflake CSV schema."""
    print('='*80)
    print('PostgreSQL Schema Creation from Snowflake CSV')
    print('='*80)

    # Read CSV schema
    csv_path = Path('/Users/gklainert/Documents/olorin/Tx Table Schema.csv')
    if not csv_path.exists():
        print(f'❌ ERROR: CSV file not found at {csv_path}')
        return False

    print(f'\n📄 Reading schema from: {csv_path}')

    columns = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            col_name = row['name']
            sf_type = row['type']

            # Map to PostgreSQL type
            pg_type = TYPE_MAPPING.get(sf_type, sf_type)

            # All columns are nullable in Snowflake schema
            columns.append({
                'name': col_name.lower(),  # PostgreSQL convention: lowercase
                'type': pg_type,
                'nullable': True
            })

    print(f'✅ Parsed {len(columns)} columns')

    # Generate CREATE TABLE DDL
    table_name = 'transactions_enriched'
    schema = 'public'

    ddl_lines = [
        f'CREATE TABLE IF NOT EXISTS {schema}.{table_name} ('
    ]

    for i, col in enumerate(columns):
        nullable = 'NULL' if col['nullable'] else 'NOT NULL'
        comma = ',' if i < len(columns) - 1 else ''
        ddl_lines.append(f"    {col['name']} {col['type']} {nullable}{comma}")

    ddl_lines.append(');')

    ddl = '\n'.join(ddl_lines)

    print(f'\n📋 Generated DDL for table: {schema}.{table_name}')
    print(f'   Total columns: {len(columns)}')
    print(f'   DDL length: {len(ddl):,} characters')

    # Connect to PostgreSQL
    print(f'\n🔌 Connecting to PostgreSQL...')
    pg = get_database_provider('postgresql')
    pg.connect()

    # Check if table already exists
    check_table_sql = f"""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = '{schema}'
            AND table_name = '{table_name}'
        ) as table_exists
    """

    result = await pg._execute_query_async(check_table_sql)
    table_exists = result[0]['table_exists']

    if table_exists:
        print(f'\n⚠️  WARNING: Table {schema}.{table_name} already exists')
        print(f'   Dropping existing table...')

        drop_sql = f'DROP TABLE IF EXISTS {schema}.{table_name} CASCADE'
        await pg._execute_query_async(drop_sql)
        print(f'   ✅ Existing table dropped')

    # Create table
    print(f'\n🏗️  Creating table {schema}.{table_name}...')
    await pg._execute_query_async(ddl)
    print(f'   ✅ Table created successfully')

    # Verify table creation
    verify_sql = f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = '{schema}'
        AND table_name = '{table_name}'
        ORDER BY ordinal_position
    """

    result = await pg._execute_query_async(verify_sql)
    print(f'\n✅ Verification: Found {len(result)} columns in created table')

    if len(result) != len(columns):
        print(f'   ⚠️  WARNING: Expected {len(columns)} columns, found {len(result)}')
    else:
        print(f'   ✅ Column count matches: {len(columns)}')

    # Show sample of columns
    print(f'\n📊 Sample of created columns (first 10):')
    for col in result[:10]:
        print(f"   {col['column_name']:<40} {col['data_type']:<30} {col['is_nullable']}")

    print(f'\n' + '='*80)
    print(f'✅ SUCCESS: PostgreSQL schema created')
    print(f'   Table: {schema}.{table_name}')
    print(f'   Columns: {len(result)}')
    print(f'   Ready for data migration')
    print('='*80)

    return True


if __name__ == '__main__':
    success = asyncio.run(create_postgres_schema())
    sys.exit(0 if success else 1)
