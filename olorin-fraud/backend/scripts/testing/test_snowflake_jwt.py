#!/usr/bin/env python3
"""
Test Snowflake connection using JWT authentication with private key.
This script demonstrates proper JWT authentication without hardcoded credentials.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization


def test_snowflake_jwt_connection():
    """Test Snowflake connection using JWT authentication with private key."""

    print("\n" + "=" * 80)
    print("SNOWFLAKE JWT CONNECTION TEST")
    print("=" * 80)

    # Configuration from environment or defaults for testing
    account = os.getenv("SNOWFLAKE_ACCOUNT", "ETMZUSX-LW98386")
    user = os.getenv("SNOWFLAKE_USER", "ZIV@NSURE.AI")
    warehouse = os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH")
    database = os.getenv("SNOWFLAKE_DATABASE", "DBT")
    schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
    role = os.getenv("SNOWFLAKE_ROLE", "ANALYST")

    # Private key should come from environment or secure storage
    private_key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
    private_key_content = os.getenv("SNOWFLAKE_PRIVATE_KEY")

    print("\n📋 Configuration:")
    print(f"   Account: {account}")
    print(f"   User: {user}")
    print(f"   Warehouse: {warehouse}")
    print(f"   Database: {database}")
    print(f"   Schema: {schema}")
    print(f"   Role: {role}")
    print(f"   Private Key Path: {private_key_path or 'Not set'}")
    print(f"   Private Key Content: {'Set' if private_key_content else 'Not set'}")

    if not private_key_path and not private_key_content:
        print("\n❌ ERROR: No private key provided!")
        print(
            "   Set either SNOWFLAKE_PRIVATE_KEY_PATH or SNOWFLAKE_PRIVATE_KEY environment variable"
        )
        return False

    print("\n" + "-" * 80)

    try:
        # Load private key
        if private_key_path:
            print(f"\n🔑 Loading private key from file: {private_key_path}")
            with open(private_key_path, "rb") as key_file:
                private_key_pem = key_file.read()
        else:
            print("\n🔑 Loading private key from environment variable")
            private_key_pem = private_key_content.encode()

        # Parse the private key
        print("   Parsing private key...")
        private_key = serialization.load_pem_private_key(
            private_key_pem, password=None, backend=default_backend()
        )

        # Convert to DER format for Snowflake
        print("   Converting to DER format...")
        private_key_der = private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        print("   ✅ Private key loaded successfully!")

        # Build connection parameters
        connection_params = {
            "account": account,
            "user": user,
            "warehouse": warehouse,
            "database": database,
            "schema": schema,
            "role": role,
            "private_key": private_key_der,
            "authenticator": "SNOWFLAKE_JWT",
            "network_timeout": 300,
            "login_timeout": 60,
            "client_session_keep_alive": True,
        }

        print("\n📦 Connection Parameters:")
        for key, value in connection_params.items():
            if key == "private_key":
                print(f"   {key}: <DER encoded key>")
            else:
                print(f"   {key}: {value}")

        print("\n🔌 Connecting to Snowflake with JWT authentication...")
        connection = snowflake.connector.connect(**connection_params)
        print("   ✅ Connection successful!")

        # Test query
        print("\n🔍 Running test query...")
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

        # Test table access
        print(f"\n🔍 Testing table access...")
        cursor.execute(
            f"SELECT COUNT(*) as count FROM {database}.{schema}.TRANSACTIONS_ENRICHED"
        )
        count_result = cursor.fetchone()
        print(f"   ✅ Table accessible! Row count: {count_result[0]:,}")

        # Get sample row
        print(f"\n🔍 Fetching sample data...")
        cursor.execute(
            f"SELECT * FROM {database}.{schema}.TRANSACTIONS_ENRICHED LIMIT 1"
        )
        sample = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]

        print("   ✅ Sample data retrieved!")
        print(f"   📊 Total columns: {len(columns)}")
        print(f"   First 10 columns: {', '.join(columns[:10])}")

        # Cleanup
        cursor.close()
        connection.close()

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80 + "\n")

        return True

    except FileNotFoundError as e:
        print(f"\n❌ ERROR: Private key file not found: {e}")
        return False

    except ValueError as e:
        print(f"\n❌ ERROR: Invalid private key format: {e}")
        print("   Make sure the private key is in PEM format")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(f"\n📋 Error Type: {type(e).__name__}")

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
    print("\n🚀 Starting Snowflake JWT Connection Test...")
    success = test_snowflake_jwt_connection()
    exit(0 if success else 1)
