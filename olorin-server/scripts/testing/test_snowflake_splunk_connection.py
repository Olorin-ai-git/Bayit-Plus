#!/usr/bin/env python3
"""
Test Snowflake connection for Splunk using private key authentication.

Credentials:
- Private key: /Users/gklainert/rsa_key.p8
- Username: manual_review_agent_ro
- Warehouse: manual_review_agent_wh
- Database: DBT
- Schema: DBT_PROD
"""
import sys
import os
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization


def load_private_key(key_path: str, passphrase: str = None) -> bytes:
    """Load RSA private key from file."""
    try:
        with open(key_path, "rb") as key_file:
            private_key_data = key_file.read()

        # Determine if passphrase is needed
        passphrase_bytes = None
        if passphrase:
            passphrase_bytes = passphrase.encode()

        # Load the private key
        private_key = serialization.load_pem_private_key(
            private_key_data,
            password=passphrase_bytes,
            backend=default_backend()
        )

        # Serialize to DER format for Snowflake
        return private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
    except Exception as e:
        raise ValueError(f"Failed to load private key from {key_path}: {e}")


def test_connection(account: str = None, role: str = None, passphrase: str = None):
    """Test Snowflake connection with provided credentials."""
    print("\n" + "=" * 80)
    print("SNOWFLAKE CONNECTION TEST FOR SPLUNK")
    print("=" * 80)

    # Configuration
    private_key_path = "/Users/gklainert/rsa_key.p8"
    username = "manual_review_agent_ro"
    warehouse = "manual_review_agent_wh"
    database = "DBT"
    schema = "DBT_PROD"
    
    # Get account from parameter, environment, or raise error
    account = account or os.getenv("SNOWFLAKE_ACCOUNT")
    if not account:
        raise ValueError(
            "Snowflake account is required. Set SNOWFLAKE_ACCOUNT environment variable "
            "or pass as argument: --account <account>"
        )
    
    # Get role from parameter, environment, or use default
    role = role or os.getenv("SNOWFLAKE_ROLE", "PUBLIC")
    
    # Get passphrase from parameter or environment
    passphrase = passphrase or os.getenv("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE")

    print(f"\n📋 Configuration:")
    print(f"   Account: {account}")
    print(f"   User: {username}")
    print(f"   Warehouse: {warehouse}")
    print(f"   Database: {database}")
    print(f"   Schema: {schema}")
    print(f"   Role: {role}")
    print(f"   Private Key: {private_key_path}")

    # Check if key file exists
    key_path = Path(private_key_path)
    if not key_path.exists():
        print(f"\n❌ ERROR: Private key file not found: {private_key_path}")
        print(f"   Please verify the path is correct.")
        return 1

    try:
        # Load private key
        print(f"\n🔑 Loading private key...")
        private_key = load_private_key(private_key_path, passphrase)
        print(f"   ✅ Private key loaded successfully")

        # Build connection parameters
        print(f"\n🔌 Connecting to Snowflake...")
        conn_params = {
            "account": account,
            "user": username,
            "private_key": private_key,
            "warehouse": warehouse,
            "database": database,
            "schema": schema,
            "role": role,
        }

        # Connect
        conn = snowflake.connector.connect(**conn_params)
        print(f"   ✅ Connection established successfully!")

        # Test query
        cursor = conn.cursor()
        
        # Get current session info
        print(f"\n📊 Current session information:")
        cursor.execute(
            "SELECT CURRENT_VERSION(), CURRENT_DATABASE(), "
            "CURRENT_SCHEMA(), CURRENT_WAREHOUSE(), CURRENT_ROLE(), CURRENT_USER()"
        )
        result = cursor.fetchone()
        print(f"   Snowflake Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current Schema: {result[2]}")
        print(f"   Current Warehouse: {result[3]}")
        print(f"   Current Role: {result[4]}")
        print(f"   Current User: {result[5]}")

        # Test querying the schema
        print(f"\n🔍 Testing database access...")
        cursor.execute(f"SHOW TABLES IN SCHEMA {database}.{schema}")
        tables = cursor.fetchall()
        print(f"   ✅ Found {len(tables)} tables in {database}.{schema}")
        
        if tables:
            print(f"\n   Sample tables:")
            for i, table in enumerate(tables[:10], 1):
                table_name = table[1] if len(table) > 1 else str(table[0])
                print(f"      {i}. {table_name}")

        # Test querying TRANSACTIONS_ENRICHED if it exists
        print(f"\n📈 Testing TRANSACTIONS_ENRICHED table...")
        try:
            cursor.execute(
                f"SELECT COUNT(*) as row_count FROM {database}.{schema}.TRANSACTIONS_ENRICHED"
            )
            count_result = cursor.fetchone()
            row_count = count_result[0] if count_result else 0
            print(f"   ✅ Table exists with {row_count:,} rows")
            
            # Get sample columns
            cursor.execute(
                f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                f"WHERE TABLE_SCHEMA = '{schema}' AND TABLE_NAME = 'TRANSACTIONS_ENRICHED' "
                f"ORDER BY ORDINAL_POSITION LIMIT 10"
            )
            columns = cursor.fetchall()
            if columns:
                print(f"\n   Sample columns:")
                for col in columns:
                    print(f"      - {col[0]} ({col[1]})")
        except Exception as e:
            print(f"   ⚠️  Could not query TRANSACTIONS_ENRICHED: {e}")

        # Close connection
        cursor.close()
        conn.close()
        print(f"\n✅ Connection closed successfully")

        print("\n" + "=" * 80)
        print("✅ CONNECTION TEST PASSED!")
        print("=" * 80 + "\n")

        return 0

    except snowflake.connector.errors.ProgrammingError as e:
        print(f"\n❌ Snowflake Programming Error:")
        print(f"   Error Code: {e.errno}")
        print(f"   SQL State: {e.sqlstate}")
        print(f"   Message: {e.msg}")
        import traceback
        traceback.print_exc()
        return 1

    except snowflake.connector.errors.DatabaseError as e:
        print(f"\n❌ Snowflake Database Error:")
        print(f"   Error Code: {e.errno}")
        print(f"   SQL State: {e.sqlstate}")
        print(f"   Message: {e.msg}")
        import traceback
        traceback.print_exc()
        return 1

    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"   Error: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        print(f"\nTraceback:")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Snowflake connection for Splunk")
    parser.add_argument(
        "--account",
        type=str,
        help="Snowflake account (e.g., xy12345.us-east-1)",
        default=None
    )
    parser.add_argument(
        "--role",
        type=str,
        help="Snowflake role (default: PUBLIC)",
        default=None
    )
    parser.add_argument(
        "--passphrase",
        type=str,
        help="Private key passphrase (if required)",
        default=None
    )
    
    args = parser.parse_args()
    
    sys.exit(test_connection(
        account=args.account,
        role=args.role,
        passphrase=args.passphrase
    ))

