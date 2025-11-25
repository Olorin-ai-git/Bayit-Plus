#!/usr/bin/env python3
"""
Direct Snowflake schema connection test.
Tests if the configured schema exists and if the user has access to it.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
from app.service.agent.tools.snowflake_tool.schema_constants import get_required_env_var
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_schema_connection():
    """Test direct connection to Snowflake schema."""

    print("\n" + "=" * 80)
    print("🔍 SNOWFLAKE SCHEMA CONNECTION TEST")
    print("=" * 80)

    # Get configuration
    database = os.getenv("SNOWFLAKE_DATABASE", "DBT")
    schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
    table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TXS")
    full_schema = f"{database}.{schema}"
    full_table = f"{database}.{schema}.{table}"

    print(f"\n📋 Configuration:")
    print(f"   Database: {database}")
    print(f"   Schema: {schema}")
    print(f"   Full Schema: {full_schema}")
    print(f"   Table: {table}")
    print(f"   Full Table: {full_table}")

    client = RealSnowflakeClient()

    try:
        # Test 1: Connection
        print(f"\n{'='*80}")
        print("TEST 1: Basic Connection")
        print(f"{'='*80}")
        print("🔗 Connecting to Snowflake...")
        await client.connect()
        print("   ✅ Connection successful!")

        # Test 2: Check current database/schema
        print(f"\n{'='*80}")
        print("TEST 2: Current Context")
        print(f"{'='*80}")
        context_query = """
        SELECT 
            CURRENT_DATABASE() as current_database,
            CURRENT_SCHEMA() as current_schema,
            CURRENT_WAREHOUSE() as current_warehouse,
            CURRENT_ROLE() as current_role,
            CURRENT_USER() as current_user
        """
        context_results = await client.execute_query(context_query)
        if context_results:
            print("   ✅ Context query successful!")
            for key, value in context_results[0].items():
                print(f"      {key}: {value}")
        else:
            print("   ❌ Context query returned no results")

        # Test 3: Check if schema exists
        print(f"\n{'='*80}")
        print(f"TEST 3: Schema Existence Check")
        print(f"{'='*80}")
        schema_check_query = f"""
        SELECT 
            SCHEMA_NAME,
            SCHEMA_OWNER
        FROM INFORMATION_SCHEMA.SCHEMATA
        WHERE CATALOG_NAME = '{database}'
        AND SCHEMA_NAME = '{schema}'
        """
        print(f"🔍 Checking if schema '{full_schema}' exists...")
        try:
            schema_results = await client.execute_query(schema_check_query)
            if schema_results and len(schema_results) > 0:
                print(f"   ✅ Schema '{full_schema}' EXISTS!")
                for key, value in schema_results[0].items():
                    print(f"      {key}: {value}")
            else:
                print(f"   ❌ Schema '{full_schema}' NOT FOUND!")
                print(f"   Checking available schemas in database '{database}'...")
                list_schemas_query = f"""
                SELECT SCHEMA_NAME
                FROM INFORMATION_SCHEMA.SCHEMATA
                WHERE CATALOG_NAME = '{database}'
                ORDER BY SCHEMA_NAME
                LIMIT 20
                """
                available_schemas = await client.execute_query(list_schemas_query)
                if available_schemas:
                    print(f"   Available schemas in '{database}':")
                    for row in available_schemas:
                        print(f"      - {row.get('SCHEMA_NAME')}")
        except Exception as e:
            error_msg = str(e)
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                print(f"   ❌ Schema authorization error: {error_msg}")
            else:
                print(f"   ❌ Error checking schema: {e}")
                raise

        # Test 4: Check schema privileges
        print(f"\n{'='*80}")
        print(f"TEST 4: Schema Privileges Check")
        print(f"{'='*80}")
        privileges_query = f"""
        SELECT 
            PRIVILEGE_TYPE,
            GRANTEE,
            GRANTED_BY
        FROM INFORMATION_SCHEMA.USAGE_PRIVILEGES
        WHERE OBJECT_CATALOG = '{database}'
        AND OBJECT_SCHEMA = '{schema}'
        AND GRANTEE = CURRENT_USER()
        """
        print(f"🔍 Checking privileges on schema '{full_schema}'...")
        try:
            priv_results = await client.execute_query(privileges_query)
            if priv_results and len(priv_results) > 0:
                print(f"   ✅ User has privileges on schema '{full_schema}':")
                for row in priv_results:
                    print(f"      Privilege: {row.get('PRIVILEGE_TYPE')}")
                    print(f"      Granted by: {row.get('GRANTED_BY')}")
            else:
                print(
                    f"   ⚠️  No explicit privileges found (may have inherited privileges)"
                )
        except Exception as e:
            print(f"   ⚠️  Could not check privileges: {e}")

        # Test 5: Try to use the schema
        print(f"\n{'='*80}")
        print(f"TEST 5: Schema Usage Test")
        print(f"{'='*80}")
        use_schema_query = f"USE SCHEMA {full_schema}"
        print(f"🔍 Attempting to USE SCHEMA '{full_schema}'...")
        try:
            await client.execute_query(use_schema_query)
            print(f"   ✅ Successfully switched to schema '{full_schema}'!")
        except Exception as e:
            error_msg = str(e)
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                print(f"   ❌ Cannot USE schema: {error_msg}")
                print(
                    f"   💡 This indicates the schema doesn't exist or user lacks USAGE privilege"
                )
            else:
                print(f"   ❌ Error using schema: {e}")

        # Test 6: Check if table exists
        print(f"\n{'='*80}")
        print(f"TEST 6: Table Existence Check")
        print(f"{'='*80}")
        table_check_query = f"""
        SELECT 
            TABLE_CATALOG,
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_CATALOG = '{database}'
        AND TABLE_SCHEMA = '{schema}'
        AND TABLE_NAME = '{table}'
        """
        print(f"🔍 Checking if table '{full_table}' exists...")
        try:
            table_results = await client.execute_query(table_check_query)
            if table_results and len(table_results) > 0:
                print(f"   ✅ Table '{full_table}' EXISTS!")
                for key, value in table_results[0].items():
                    print(f"      {key}: {value}")
            else:
                print(f"   ❌ Table '{full_table}' NOT FOUND!")
                print(f"   Checking available tables in schema '{full_schema}'...")
                list_tables_query = f"""
                SELECT TABLE_NAME, TABLE_TYPE
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_CATALOG = '{database}'
                AND TABLE_SCHEMA = '{schema}'
                ORDER BY TABLE_NAME
                LIMIT 20
                """
                try:
                    available_tables = await client.execute_query(list_tables_query)
                    if available_tables:
                        print(f"   Available tables in '{full_schema}':")
                        for row in available_tables:
                            print(
                                f"      - {row.get('TABLE_NAME')} ({row.get('TABLE_TYPE')})"
                            )
                    else:
                        print(f"   No tables found in schema '{full_schema}'")
                except Exception as e2:
                    print(f"   ⚠️  Could not list tables: {e2}")
        except Exception as e:
            error_msg = str(e)
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                print(
                    f"   ❌ Schema authorization error when checking table: {error_msg}"
                )
            else:
                print(f"   ❌ Error checking table: {e}")

        # Test 7: Try to query the table directly (bypass INFORMATION_SCHEMA)
        print(f"\n{'='*80}")
        print(f"TEST 7: Direct Table Query Test")
        print(f"{'='*80}")
        count_query = f"SELECT COUNT(*) as row_count FROM {full_table} LIMIT 1"
        print(f"🔍 Attempting to query table '{full_table}' directly...")
        try:
            count_results = await client.execute_query(count_query)
            if count_results:
                row_count = count_results[0].get("ROW_COUNT", 0)
                print(f"   ✅ Successfully queried table!")
                print(f"   Row count: {row_count}")

                # Test column count
                print(f"\n🔍 Checking column count...")
                try:
                    col_query = f"""
                    SELECT COUNT(*) as column_count
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_CATALOG = '{database}'
                    AND TABLE_SCHEMA = '{schema}'
                    AND TABLE_NAME = '{table}'
                    """
                    col_results = await client.execute_query(col_query)
                    if col_results:
                        column_count = col_results[0].get("COLUMN_COUNT", 0)
                        print(f"   ✅ Table has {column_count} columns")

                        # Get first 5 column names
                        col_names_query = f"""
                        SELECT COLUMN_NAME, DATA_TYPE
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_CATALOG = '{database}'
                        AND TABLE_SCHEMA = '{schema}'
                        AND TABLE_NAME = '{table}'
                        ORDER BY ORDINAL_POSITION
                        LIMIT 5
                        """
                        col_names = await client.execute_query(col_names_query)
                        if col_names:
                            print(f"   First 5 columns:")
                            for i, col in enumerate(col_names, 1):
                                col_name = col.get("COLUMN_NAME", "N/A")
                                col_type = col.get("DATA_TYPE", "N/A")
                                print(f"      {i}. {col_name} ({col_type})")
                except Exception as desc_e:
                    print(f"   ⚠️  Could not get column info: {desc_e}")
            else:
                print(f"   ⚠️  Query returned no results")
        except Exception as e:
            error_msg = str(e)
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                print(f"   ❌ Schema/table authorization error: {error_msg}")
                print(f"   💡 This indicates:")
                print(f"      1. Schema '{full_schema}' doesn't exist, OR")
                print(
                    f"      2. User lacks USAGE privilege on schema '{full_schema}', OR"
                )
                print(f"      3. User lacks SELECT privilege on table '{full_table}'")
            else:
                print(f"   ❌ Error querying table: {e}")
                raise

        # Test 8: Check all schemas user can access
        print(f"\n{'='*80}")
        print(f"TEST 8: All Accessible Schemas")
        print(f"{'='*80}")
        all_schemas_query = f"""
        SELECT DISTINCT SCHEMA_NAME
        FROM INFORMATION_SCHEMA.SCHEMATA
        WHERE CATALOG_NAME = '{database}'
        ORDER BY SCHEMA_NAME
        """
        print(f"🔍 Listing all schemas user can see in database '{database}'...")
        try:
            all_schemas = await client.execute_query(all_schemas_query)
            if all_schemas:
                print(f"   ✅ Found {len(all_schemas)} accessible schemas:")
                for row in all_schemas:
                    schema_name = row.get("SCHEMA_NAME")
                    print(f"      - {schema_name}")
                    if schema_name == schema:
                        print(f"        ⭐ This is the target schema!")
            else:
                print(f"   ⚠️  No schemas found")
        except Exception as e:
            print(f"   ⚠️  Could not list schemas: {e}")

        # Test 9: Try to query TXS table in different schemas
        print(f"\n{'='*80}")
        print(f"TEST 9: TXS Table in Different Schemas")
        print(f"{'='*80}")
        test_schemas = [
            "DBT_AGOLDZWEIG",
            "DBT_AKARABAEV",
            "DBT_ONBOARDING",
            "DBT_PROD",
            "PROD_DEV_TEST",
            "DBT_PROD",
        ]

        for test_schema in test_schemas:
            test_table = f"{database}.{test_schema}.TXS"
            print(f"\n🔍 Testing {test_table}...")
            try:
                test_query = f"SELECT COUNT(*) as row_count FROM {test_table} LIMIT 1"
                test_results = await client.execute_query(test_query)
                if test_results:
                    row_count = test_results[0].get("ROW_COUNT", 0)
                    # Try to get column count
                    try:
                        col_query = f"""
                        SELECT COUNT(*) as column_count
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_CATALOG = '{database}'
                        AND TABLE_SCHEMA = '{test_schema}'
                        AND TABLE_NAME = 'TXS'
                        """
                        col_results = await client.execute_query(col_query)
                        col_count = (
                            col_results[0].get("COLUMN_COUNT", 0) if col_results else 0
                        )
                        print(
                            f"   ✅ Accessible! Row count: {row_count}, Columns: {col_count}"
                        )
                    except:
                        print(f"   ✅ Accessible! Row count: {row_count}")
                else:
                    print(f"   ⚠️  Query returned no results")
            except Exception as e:
                error_msg = str(e)
                if (
                    "does not exist or not authorized" in error_msg
                    or "02000" in error_msg
                ):
                    print(f"   ❌ Not accessible: Schema/table authorization error")
                else:
                    print(f"   ❌ Error: {e}")

        # Test 10: Check DBT_PROD.OLD_TXS_TABLE
        print(f"\n{'='*80}")
        print(f"TEST 10: DBT_PROD.OLD_TXS_TABLE")
        print(f"{'='*80}")
        old_table = f"{database}.DBT_PROD.OLD_TXS_TABLE"
        print(f"🔍 Testing {old_table}...")
        try:
            test_query = f"SELECT COUNT(*) as row_count FROM {old_table} LIMIT 1"
            test_results = await client.execute_query(test_query)
            if test_results:
                row_count = test_results[0].get("ROW_COUNT", 0)
                try:
                    col_query = f"""
                    SELECT COUNT(*) as column_count
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_CATALOG = '{database}'
                    AND TABLE_SCHEMA = 'DBT_PROD'
                    AND TABLE_NAME = 'OLD_TXS_TABLE'
                    """
                    col_results = await client.execute_query(col_query)
                    col_count = (
                        col_results[0].get("COLUMN_COUNT", 0) if col_results else 0
                    )
                    print(
                        f"   ✅ Accessible! Row count: {row_count}, Columns: {col_count}"
                    )
                except:
                    print(f"   ✅ Accessible! Row count: {row_count}")
            else:
                print(f"   ⚠️  Query returned no results")
        except Exception as e:
            error_msg = str(e)
            if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                print(f"   ❌ Not accessible: Schema/table authorization error")
            else:
                print(f"   ❌ Error: {e}")

        print(f"\n{'='*80}")
        print("✅ SCHEMA CONNECTION TEST COMPLETE")
        print(f"{'='*80}\n")

    except Exception as e:
        print(f"\n{'='*80}")
        print("❌ TEST FAILED")
        print(f"{'='*80}")
        print(f"Error: {e}")
        import traceback

        print(f"\nTraceback:")
        print(traceback.format_exc())
        sys.exit(1)
    finally:
        try:
            await client.disconnect()
        except:
            pass


if __name__ == "__main__":
    import asyncio

    asyncio.run(test_schema_connection())
