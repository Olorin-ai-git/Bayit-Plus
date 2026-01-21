#!/usr/bin/env python3
"""
Test Snowflake connection using OAuth token from .env configuration.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
from app.service.logging import get_bridge_logger

# Load environment variables
env_path = project_root / ".env"
load_dotenv(env_path)

logger = get_bridge_logger(__name__)


async def test_snowflake_connection():
    """Test Snowflake connection and run basic queries."""

    print("\n" + "=" * 80)
    print("SNOWFLAKE CONNECTION TEST")
    print("=" * 80)

    # Display configuration (without sensitive data)
    print("\n📋 Configuration:")
    print(f"   Account: {os.getenv('SNOWFLAKE_ACCOUNT')}")
    print(f"   User: {os.getenv('SNOWFLAKE_USER')}")
    print(f"   Database: {os.getenv('SNOWFLAKE_DATABASE')}")
    print(f"   Schema: {os.getenv('SNOWFLAKE_SCHEMA')}")
    print(f"   Warehouse: {os.getenv('SNOWFLAKE_WAREHOUSE')}")
    print(f"   Role: {os.getenv('SNOWFLAKE_ROLE')}")
    print(f"   Auth Method: {os.getenv('SNOWFLAKE_AUTHENTICATOR')}")
    print(f"   Table: {os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE')}")

    # Check if OAuth token is present
    token = os.getenv("SNOWFLAKE_OAUTH_TOKEN")
    if token:
        print(
            f"   OAuth Token: {'*' * 20}...{token[-10:] if len(token) > 10 else '***'}"
        )
    else:
        print("   ❌ ERROR: No OAuth token found!")
        return False

    print("\n" + "-" * 80)

    try:
        # Initialize client
        print("\n🔧 Initializing Snowflake client...")
        client = RealSnowflakeClient()

        # Test 1: Connection
        print("\n🔗 Test 1: Testing connection...")
        await client.connect()
        print("   ✅ Connection successful!")

        # Test 2: Version query
        print("\n🔍 Test 2: Checking Snowflake version...")
        version_query = "SELECT CURRENT_VERSION() as version, CURRENT_DATABASE() as database, CURRENT_SCHEMA() as schema"
        version_results = await client.execute_query(version_query)

        if version_results:
            print("   ✅ Version query successful!")
            for key, value in version_results[0].items():
                print(f"      {key}: {value}")
        else:
            print("   ❌ Version query returned no results")

        # Test 3: Table existence check
        print(
            f"\n🔍 Test 3: Checking if table '{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE')}' exists..."
        )
        table_check_query = f"""
        SELECT COUNT(*) as table_exists
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '{os.getenv('SNOWFLAKE_SCHEMA')}'
        AND TABLE_NAME = '{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE')}'
        """
        table_results = await client.execute_query(table_check_query)

        if table_results and table_results[0]["TABLE_EXISTS"] > 0:
            print(f"   ✅ Table '{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE')}' exists!")
        else:
            print(
                f"   ⚠️  Table '{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE')}' not found in schema '{os.getenv('SNOWFLAKE_SCHEMA')}'"
            )

        # Test 4: Row count
        print(f"\n🔍 Test 4: Getting row count from table...")
        full_table_name = client.get_full_table_name()
        count_query = f"SELECT COUNT(*) as row_count FROM {full_table_name}"
        count_results = await client.execute_query(count_query)

        if count_results:
            row_count = count_results[0]["ROW_COUNT"]
            print(f"   ✅ Table contains {row_count:,} rows")
        else:
            print("   ❌ Could not get row count")

        # Test 5: Sample data
        print(f"\n🔍 Test 5: Fetching sample data (1 row)...")
        sample_query = f"SELECT * FROM {full_table_name} LIMIT 1"
        sample_results = await client.execute_query(sample_query)

        if sample_results:
            print(f"   ✅ Sample data retrieved successfully!")
            print(f"   📊 Columns found: {', '.join(sample_results[0].keys())}")
            print(f"\n   Sample row:")
            for key, value in sample_results[0].items():
                # Truncate long values
                str_value = str(value)
                if len(str_value) > 50:
                    str_value = str_value[:47] + "..."
                print(f"      {key}: {str_value}")
        else:
            print("   ❌ No sample data retrieved")

        # Cleanup
        print("\n🔌 Disconnecting...")
        await client.disconnect()
        print("   ✅ Disconnected successfully!")

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80 + "\n")

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        logger.error(f"Snowflake connection test failed: {e}", exc_info=True)

        print("\n" + "=" * 80)
        print("❌ TESTS FAILED!")
        print("=" * 80 + "\n")

        return False


async def test_snowflake_query():
    """Test a specific query against Snowflake."""

    print("\n" + "=" * 80)
    print("SNOWFLAKE QUERY TEST")
    print("=" * 80)

    try:
        client = RealSnowflakeClient()
        await client.connect()

        # Test get_top_risk_entities method
        print("\n🔍 Testing get_top_risk_entities method...")
        print(
            "   Parameters: time_window_hours=24, group_by='EMAIL', top_percentage=0.10"
        )

        results = await client.get_top_risk_entities(
            time_window_hours=24,
            group_by="EMAIL",
            top_percentage=0.10,
            min_transactions=1,
        )

        print(f"\n   ✅ Query completed successfully!")
        print(f"   📊 Found {len(results)} high-risk entities")

        if results:
            print("\n   Top 5 results:")
            for i, result in enumerate(results[:5], 1):
                print(f"\n   {i}. Entity: {result.get('ENTITY', 'N/A')}")
                print(
                    f"      Transaction Count: {result.get('TRANSACTION_COUNT', 0):,}"
                )
                print(f"      Total Amount: ${result.get('TOTAL_AMOUNT', 0):,.2f}")
                print(f"      Avg Risk Score: {result.get('AVG_RISK_SCORE', 0):.2f}")
                print(
                    f"      Risk-Weighted Value: ${result.get('RISK_WEIGHTED_VALUE', 0):,.2f}"
                )
                print(f"      Max Risk Score: {result.get('MAX_RISK_SCORE', 0):.2f}")
                print(f"      Fraud Count: {result.get('FRAUD_COUNT', 0)}")

        await client.disconnect()

        print("\n" + "=" * 80)
        print("✅ QUERY TEST PASSED!")
        print("=" * 80 + "\n")

        return True

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        logger.error(f"Snowflake query test failed: {e}", exc_info=True)

        print("\n" + "=" * 80)
        print("❌ QUERY TEST FAILED!")
        print("=" * 80 + "\n")

        return False


if __name__ == "__main__":
    print("\n🚀 Starting Snowflake Connection Tests...")

    # Run connection test
    connection_success = asyncio.run(test_snowflake_connection())

    # If connection successful, run query test
    if connection_success:
        print("\n" + "=" * 80)
        print("Running additional query tests...")
        print("=" * 80)
        query_success = asyncio.run(test_snowflake_query())
    else:
        print("\n⚠️  Skipping query tests due to connection failure")
        query_success = False

    # Summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    print(f"   Connection Test: {'✅ PASSED' if connection_success else '❌ FAILED'}")
    print(
        f"   Query Test: {'✅ PASSED' if query_success else '❌ FAILED' if connection_success else '⏭️  SKIPPED'}"
    )
    print("=" * 80 + "\n")

    sys.exit(0 if connection_success and query_success else 1)
