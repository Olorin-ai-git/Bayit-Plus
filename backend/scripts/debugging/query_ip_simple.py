#!/usr/bin/env python3
"""
Simple direct query using Snowflake provider directly.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load environment first
load_dotenv()

# Set to skip Firebase before any imports
os.environ["USE_FIREBASE_SECRETS"] = "false"

# Add parent directory to path AFTER setting env
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def main():
    print("\n" + "=" * 80)
    print("🔍 DIRECT DATABASE QUERY - IP: 38.252.156.103")
    print("=" * 80)

    ip_address = "38.252.156.103"

    try:
        # Import directly
        from app.service.agent.tools.database_tool.snowflake_provider import (
            SnowflakeProvider,
        )

        print(f"\n🔗 Initializing Snowflake provider...")
        provider = SnowflakeProvider()

        table_name = provider.get_full_table_name()
        print(f"   ✅ Table: {table_name}")

        # Query 1: Count
        count_query = f"SELECT COUNT(*) as total_count FROM {table_name} WHERE IP = '{ip_address}'"
        print(f"\n🔍 Query 1: Count")
        print(f"SQL: {count_query}")

        count_results = provider.execute_query(count_query)
        total_count = count_results[0].get("total_count", 0) if count_results else 0
        print(f"   ✅ Total: {total_count}")

        # Query 2: Get transactions
        transaction_query = f"""
        SELECT
            TX_ID_KEY,
            EMAIL,
            IP,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_AMOUNT_CURRENCY,
            TX_DATETIME,
            PAYMENT_METHOD,
            CARD_BRAND,
            DEVICE_ID,
            USER_AGENT,
            IP_COUNTRY_CODE,
            IS_FRAUD_TX,
            MODEL_SCORE,
            NSURE_LAST_DECISION as MODEL_DECISION
        FROM {table_name}
        WHERE IP = '{ip_address}'
        ORDER BY TX_DATETIME DESC
        LIMIT 100
        """

        print(f"\n🔍 Query 2: Get transactions")
        print(f"SQL: {transaction_query.strip()}")

        transactions = provider.execute_query(transaction_query)
        print(f"   ✅ Returned: {len(transactions)} transactions")

        if transactions:
            print(f"\n📋 First transaction:")
            tx = transactions[0]
            for key, value in tx.items():
                print(f"   {key}: {value}")

        print(f"\n" + "=" * 80)
        print(f"✅ Total matching: {total_count} | Returned: {len(transactions)}")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
