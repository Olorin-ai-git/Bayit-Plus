#!/usr/bin/env python3
"""
Direct Snowflake connection test using environment variables.

Required environment variables:
  SNOWFLAKE_ACCOUNT - Snowflake account identifier
  SNOWFLAKE_USER - Snowflake username
  SNOWFLAKE_OAUTH_TOKEN - OAuth/PAT token for authentication
  SNOWFLAKE_ROLE - Role to use (default: ANALYST)
  SNOWFLAKE_WAREHOUSE - Warehouse to use (default: COMPUTE_WH)
  SNOWFLAKE_DATABASE - Database to use (default: DBT)
  SNOWFLAKE_SCHEMA - Schema to use (default: DBT_PROD)
"""

import asyncio
import os
import sys
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=5)


def get_config():
    """Load Snowflake configuration from environment variables."""
    required_vars = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_OAUTH_TOKEN"]
    missing = [var for var in required_vars if not os.environ.get(var)]

    if missing:
        print(f"❌ ERROR: Missing required environment variables: {', '.join(missing)}")
        print("\nPlease set the following environment variables:")
        print("  export SNOWFLAKE_ACCOUNT='your-account'")
        print("  export SNOWFLAKE_USER='your-user@domain.com'")
        print("  export SNOWFLAKE_OAUTH_TOKEN='your-oauth-token'")
        sys.exit(1)

    return {
        "account": os.environ["SNOWFLAKE_ACCOUNT"],
        "user": os.environ["SNOWFLAKE_USER"],
        "token": os.environ["SNOWFLAKE_OAUTH_TOKEN"],
        "role": os.environ.get("SNOWFLAKE_ROLE", "ANALYST"),
        "warehouse": os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        "database": os.environ.get("SNOWFLAKE_DATABASE", "DBT"),
        "schema": os.environ.get("SNOWFLAKE_SCHEMA", "DBT_PROD"),
        "authenticator": os.environ.get("SNOWFLAKE_AUTHENTICATOR", "oauth"),
    }


def test_connection_sync():
    """Test Snowflake connection synchronously."""
    config = get_config()

    print("\n" + "=" * 80)
    print("DIRECT SNOWFLAKE CONNECTION TEST")
    print("=" * 80)

    print("\n📋 Configuration (from environment):")
    print(f"   Account: {config['account']}")
    print(f"   User: {config['user']}")
    print(f"   Role: {config['role']}")
    print(f"   Warehouse: {config['warehouse']}")
    print(f"   Database: {config['database']}")
    print(f"   Schema: {config['schema']}")
    print(f"   Authenticator: {config['authenticator']}")
    print(f"   Token: {config['token'][:20]}...{config['token'][-10:]}")

    print("\n" + "-" * 80)

    try:
        import snowflake.connector

        print("\n🔌 Connecting to Snowflake...")

        conn_params = {
            "account": config["account"],
            "user": config["user"],
            "password": config["token"],
            "database": config["database"],
            "schema": config["schema"],
            "warehouse": config["warehouse"],
            "role": config["role"],
            "network_timeout": 300,
            "login_timeout": 60,
        }

        connection = snowflake.connector.connect(**conn_params)
        print("   ✅ Connection successful!")

        cursor = connection.cursor()
        cursor.execute("SELECT CURRENT_VERSION(), CURRENT_USER(), CURRENT_ROLE()")
        result = cursor.fetchone()
        print(f"\n📊 Connected as: {result[1]} with role {result[2]}")
        print(f"   Snowflake version: {result[0]}")

        cursor.close()
        connection.close()

        print("\n" + "=" * 80)
        print("✅ CONNECTION TEST PASSED!")
        print("=" * 80 + "\n")

        return True

    except ImportError:
        print("\n❌ ERROR: snowflake-connector-python not installed")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\n" + "=" * 80)
        print("❌ TEST FAILED!")
        print("=" * 80 + "\n")
        return False


async def test_connection_async():
    """Test Snowflake connection asynchronously."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, test_connection_sync)


if __name__ == "__main__":
    print("\n🚀 Starting Direct Snowflake Connection Test...")
    success = test_connection_sync()
    exit(0 if success else 1)
