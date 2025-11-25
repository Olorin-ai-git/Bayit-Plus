#!/usr/bin/env python3
"""
Direct Snowflake connection test using exact credentials provided.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=5)

# Exact credentials as provided
ACCOUNT = "ETMZUSX-LW98386"
USER = "ZIV@NSURE.AI"
TOKEN = "eyJraWQiOiI0MDk2MTEwNTM0MjkwMjIiLCJhbGciOiJFUzI1NiJ9.eyJwIjoiMjQ0MTQ3OTI6NjI1MDE2ODU4MSIsImlzcyI6IlNGOjEwMTYiLCJleHAiOjE3OTQwMDE5Mzd9.2ywyaGMWiP0m_KzG0jJgRBlgogoqm5ebiAUK-kLrlqHr6e4AplJS3tBMPXbMozyNiECEZZ32mBpS3SrW1jHJig"
ROLE = "ANALYST"
WAREHOUSE = "COMPUTE_WH"
DATABASE = "DBT"
SCHEMA = "DBT_PROD"
AUTHENTICATOR = "oauth"


def test_connection_sync():
    """Test Snowflake connection synchronously."""

    print("\n" + "=" * 80)
    print("DIRECT SNOWFLAKE CONNECTION TEST")
    print("=" * 80)

    print("\n📋 Using Exact Credentials Provided:")
    print(f"   Account: {ACCOUNT}")
    print(f"   User: {USER}")
    print(f"   Role: {ROLE}")
    print(f"   Warehouse: {WAREHOUSE}")
    print(f"   Database: {DATABASE}")
    print(f"   Schema: {SCHEMA}")
    print(f"   Authenticator: {AUTHENTICATOR}")
    print(f"   Token: {TOKEN[:50]}...{TOKEN[-20:]}")

    print("\n" + "-" * 80)

    try:
        import snowflake.connector

        print("\n🔗 Attempting connection...")
        print("   This may take 30-60 seconds...")

        # Build connection parameters exactly as provided
        conn_params = {
            "account": ACCOUNT,
            "user": USER,
            "authenticator": AUTHENTICATOR,
            "token": TOKEN,
            "database": DATABASE,
            "schema": SCHEMA,
            "warehouse": WAREHOUSE,
            "role": ROLE,
            "network_timeout": 300,
            "login_timeout": 60,
            # SSL/TLS configuration
            "disable_ocsp_checks": True,  # Replaces deprecated insecure_mode
            "ocsp_response_cache_filename": None,
            "client_session_keep_alive": True,
            "client_request_mfa_token": False,
            "session_parameters": {"PYTHON_CONNECTOR_QUERY_RESULT_FORMAT": "json"},
        }

        print("\n📦 Connection Parameters:")
        for key, value in conn_params.items():
            if key == "token":
                print(f"   {key}: {value[:50]}...{value[-20:]}")
            elif key == "session_parameters":
                print(f"   {key}: {value}")
            else:
                print(f"   {key}: {value}")

        print("\n🔌 Connecting to Snowflake...")
        connection = snowflake.connector.connect(**conn_params)

        print("   ✅ Connection successful!")

        # Test query
        print("\n🔍 Running test query...")
        cursor = connection.cursor()
        cursor.execute(
            "SELECT CURRENT_VERSION() as version, CURRENT_DATABASE() as db, CURRENT_SCHEMA() as schema, CURRENT_WAREHOUSE() as warehouse, CURRENT_ROLE() as role"
        )

        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Query successful!")
        print("\n📊 Results:")
        for key, value in zip(columns, results[0]):
            print(f"      {key}: {value}")

        # Test table access
        print("\n🔍 Testing table access...")
        cursor.execute("SELECT COUNT(*) as count FROM DBT.DBT_PROD.TXS")
        count_result = cursor.fetchone()
        print(f"   ✅ Table accessible! Row count: {count_result[0]:,}")

        # Get sample row
        print("\n🔍 Fetching sample row...")
        cursor.execute("SELECT * FROM DBT.DBT_PROD.TXS LIMIT 1")
        sample = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Sample data retrieved!")
        print(f"   📊 Columns: {len(columns)}")
        print(f"   First 10 columns: {', '.join(columns[:10])}")

        # Cleanup
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

        # Print detailed error information
        if hasattr(e, "errno"):
            print(f"   Error Code: {e.errno}")
        if hasattr(e, "sqlstate"):
            print(f"   SQL State: {e.sqlstate}")
        if hasattr(e, "msg"):
            print(f"   Message: {e.msg}")

        print("\n" + "=" * 80)
        print("❌ TEST FAILED!")
        print("=" * 80 + "\n")

        return False


if __name__ == "__main__":
    print("\n🚀 Starting Direct Snowflake Connection Test...")
    success = test_connection_sync()
    exit(0 if success else 1)
