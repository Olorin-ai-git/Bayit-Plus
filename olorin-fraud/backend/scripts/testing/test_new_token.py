#!/usr/bin/env python3
"""
Test Snowflake OAuth token connection.

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

import snowflake.connector


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
    }


def main():
    """Test Snowflake OAuth token connection."""
    config = get_config()

    print("🔗 Testing OAuth token connection...")
    print(f"   Account: {config['account']}")
    print(f"   User: {config['user']}")
    print(f"   Token: {config['token'][:20]}...{config['token'][-10:]}")

    try:
        conn = snowflake.connector.connect(
            account=config["account"],
            user=config["user"],
            authenticator="oauth",
            token=config["token"],
            database=config["database"],
            schema=config["schema"],
            warehouse=config["warehouse"],
            role=config["role"],
            disable_ocsp_checks=True,
            ocsp_response_cache_filename=None,
            client_session_keep_alive=True,
        )

        print("✅ Connection successful!")

        cursor = conn.cursor()
        cursor.execute(
            "SELECT CURRENT_VERSION(), CURRENT_DATABASE(), CURRENT_SCHEMA()"
        )
        result = cursor.fetchone()

        print(f"   Version: {result[0]}")
        print(f"   Database: {result[1]}")
        print(f"   Schema: {result[2]}")

        cursor.close()
        conn.close()

        print("\n✅ ALL TESTS PASSED! OAuth token is valid!")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"   Type: {type(e).__name__}")
        sys.exit(1)


if __name__ == "__main__":
    main()
