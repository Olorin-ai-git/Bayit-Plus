#!/usr/bin/env python3
"""
Test Snowflake connection using private key authentication.

This script tests connection to Snowflake using RSA private key file
for the manual_review_agent_ro user with read-only access.
"""
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.config.snowflake_config import load_snowflake_config
from app.service.snowflake_service import (
    SnowflakeConnectionFactory,
    SnowflakeQueryService
)


def main():
    """Test Snowflake connection and query execution."""
    print("\n" + "=" * 80)
    print("SNOWFLAKE PRIVATE KEY AUTHENTICATION TEST")
    print("=" * 80)

    try:
        # Load configuration
        print("\n📋 Loading configuration...")
        config = load_snowflake_config()

        print(f"\n✅ Configuration loaded:")
        print(f"   Account: {config.account}")
        print(f"   User: {config.user}")
        print(f"   Warehouse: {config.warehouse}")
        print(f"   Database: {config.database}")
        print(f"   Schema: {config.schema}")
        print(f"   Role: {config.role}")
        print(f"   Auth Method: {config.auth_method}")
        print(f"   Private Key Path: {config.private_key_path}")

        # Create connection factory
        print("\n🔧 Creating connection factory...")
        connection_factory = SnowflakeConnectionFactory(config)

        # Test connection
        print("\n🔌 Testing connection...")
        conn = connection_factory.create_connection()

        cursor = conn.cursor()
        cursor.execute(
            "SELECT CURRENT_VERSION(), CURRENT_DATABASE(), "
            "CURRENT_SCHEMA(), CURRENT_WAREHOUSE(), CURRENT_ROLE()"
        )
        result = cursor.fetchone()

        print(f"\n✅ Connection successful!")
        print(f"   Snowflake Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current Schema: {result[2]}")
        print(f"   Current Warehouse: {result[3]}")
        print(f"   Current Role: {result[4]}")

        cursor.close()
        conn.close()

        # Test query service
        print("\n🔍 Testing query service...")
        query_service = SnowflakeQueryService(connection_factory)

        # Test merchant statistics query
        print("\n📊 Fetching merchant statistics...")
        merchants = query_service.get_merchant_statistics()

        if merchants:
            print(f"\n✅ Retrieved {len(merchants)} merchant records")
            print("\nTop 5 merchants by transaction count:")
            for i, merchant in enumerate(merchants[:5], 1):
                print(
                    f"   {i}. {merchant['MERCHANT_NAME']} "
                    f"({merchant['MERCHANT_CATEGORY']}): "
                    f"{merchant['TRANSACTION_COUNT']} transactions, "
                    f"Risk Score: {merchant['AVG_RISK_SCORE']:.2f}"
                )
        else:
            print("⚠️  No merchant data found")

        # Test high-risk transactions query
        print("\n🚨 Fetching high-risk transactions...")
        high_risk = query_service.get_high_risk_transactions(
            risk_threshold=70.0,
            limit=10
        )

        if high_risk:
            print(f"\n✅ Retrieved {len(high_risk)} high-risk transactions")
            print("\nSample high-risk transactions:")
            for i, tx in enumerate(high_risk[:3], 1):
                print(
                    f"   {i}. {tx['TX_ID_KEY']}: "
                    f"${tx['PAID_AMOUNT_VALUE_IN_CURRENCY']:.2f} "
                    f"{tx['PAID_CURRENCY']} - "
                    f"Risk Score: {tx['MODEL_SCORE']:.2f} - "
                    f"Fraud: {tx['IS_FRAUD_TX']}"
                )
        else:
            print("⚠️  No high-risk transactions found")

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80 + "\n")

        return 0

    except Exception as e:
        print(f"\n❌ TEST FAILED!")
        print(f"   Error: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        print(f"\nTraceback:")
        traceback.print_exc()

        print("\n" + "=" * 80)
        print("❌ TEST FAILED - See error above")
        print("=" * 80 + "\n")

        return 1


if __name__ == "__main__":
    sys.exit(main())
