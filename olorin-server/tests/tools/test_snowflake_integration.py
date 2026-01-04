#!/usr/bin/env python3
"""
Snowflake Integration Test
Tests the Snowflake data warehouse tool integration
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeTool


async def test_snowflake_basic_connection():
    """Test basic Snowflake connection and query execution."""
    print("🔍 Testing Snowflake Basic Connection")

    try:
        snowflake_tool = SnowflakeTool()

        # Test basic connection
        result = await snowflake_tool.arun("SELECT CURRENT_VERSION() as version")
        print(f"✅ Snowflake Version: {result}")

        return True

    except Exception as e:
        print(f"❌ Snowflake connection test failed: {e}")
        return False


async def test_snowflake_fraud_queries():
    """Test fraud detection related queries."""
    print("\n🔍 Testing Snowflake Fraud Detection Queries")

    try:
        snowflake_tool = SnowflakeTool()

        # Sample fraud detection queries
        queries = [
            "SELECT COUNT(*) as transaction_count FROM transactions WHERE amount > 10000",
            "SELECT DISTINCT device_id FROM user_sessions WHERE login_failures > 5",
            "SELECT ip, COUNT(*) as login_attempts FROM authentication_logs GROUP BY ip HAVING COUNT(*) > 100",
        ]

        for i, query in enumerate(queries, 1):
            print(f"\n  Query {i}: {query}")
            try:
                result = await snowflake_tool.arun(query)
                print(f"  ✅ Result: {result}")
            except Exception as e:
                print(f"  ❌ Query failed: {e}")

        return True

    except Exception as e:
        print(f"❌ Fraud queries test failed: {e}")
        return False


async def main():
    """Main test execution."""
    print("=" * 60)
    print("🛠️  SNOWFLAKE INTEGRATION TEST SUITE")
    print("=" * 60)

    test_results = []

    # Run tests
    test_results.append(await test_snowflake_basic_connection())
    test_results.append(await test_snowflake_fraud_queries())

    # Summary
    passed = sum(test_results)
    total = len(test_results)

    print(f"\n📊 Test Summary:")
    print(f"   Passed: {passed}/{total}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")

    return 0 if passed == total else 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
