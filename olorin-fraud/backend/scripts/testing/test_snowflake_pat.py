#!/usr/bin/env python3
"""
Test Snowflake connection using Personal Access Token (PAT).

Required environment variables:
  SNOWFLAKE_ACCOUNT - Snowflake account identifier
  SNOWFLAKE_USER - Snowflake username
  SNOWFLAKE_OAUTH_TOKEN - OAuth/PAT token for authentication
  SNOWFLAKE_ROLE - Role to use (default: ANALYST)
  SNOWFLAKE_WAREHOUSE - Warehouse to use (default: COMPUTE_WH)
  SNOWFLAKE_DATABASE - Database to use (default: DBT)
  SNOWFLAKE_SCHEMA - Schema to use (default: DBT_PROD)
"""

import os
import sys


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
        "pat_token": os.environ["SNOWFLAKE_OAUTH_TOKEN"],
        "role": os.environ.get("SNOWFLAKE_ROLE", "ANALYST"),
        "warehouse": os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        "database": os.environ.get("SNOWFLAKE_DATABASE", "DBT"),
        "schema": os.environ.get("SNOWFLAKE_SCHEMA", "DBT_PROD"),
    }


def test_pat_connection():
    """Test Snowflake connection using Personal Access Token."""
    config = get_config()

    print("\n" + "=" * 80)
    print("SNOWFLAKE PAT CONNECTION TEST")
    print("=" * 80)

    print("\n📋 Configuration:")
    print(f"   Account: {config['account']}")
    print(f"   User: {config['user']}")
    print(f"   Role: {config['role']}")
    print(f"   Warehouse: {config['warehouse']}")
    print(f"   Database: {config['database']}")
    print(f"   Schema: {config['schema']}")
    print(f"   PAT Token: {config['pat_token'][:20]}...{config['pat_token'][-10:]}")

    print("\n" + "-" * 80)

    try:
        import snowflake.connector

        print("\n🔗 Attempting PAT connection...")

        conn_params = {
            "account": config["account"],
            "user": config["user"],
            "password": config["pat_token"],
            "database": config["database"],
            "schema": config["schema"],
            "warehouse": config["warehouse"],
            "role": config["role"],
            "network_timeout": 300,
            "login_timeout": 60,
            "client_session_keep_alive": True,
        }

        print("\n🔌 Connecting to Snowflake...")
        connection = snowflake.connector.connect(**conn_params)
        print("   ✅ Connection successful!")

        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT
                CURRENT_VERSION() as version,
                CURRENT_DATABASE() as db,
                CURRENT_SCHEMA() as schema,
                CURRENT_WAREHOUSE() as warehouse,
                CURRENT_ROLE() as role,
                CURRENT_USER() as user
        """
        )

        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Query successful!")
        print("\n📊 Session Info:")
        for key, value in zip(columns, results[0]):
            print(f"      {key}: {value}")

        cursor.close()
        connection.close()

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80 + "\n")

        return True

    except ImportError:
        print("\n❌ ERROR: snowflake-connector-python not installed")
        print("   Run: poetry add snowflake-connector-python")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(f"\n📋 Error Type: {type(e).__name__}")
        print("\n" + "=" * 80)
        print("❌ TEST FAILED!")
        print("=" * 80 + "\n")
        return False


if __name__ == "__main__":
    print("\n🚀 Starting Snowflake PAT Connection Test...")
    success = test_pat_connection()
    exit(0 if success else 1)
