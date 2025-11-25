#!/usr/bin/env python3
"""
Direct database query to check IP address transaction count.
Uses the existing database provider to run queries.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Load environment variables
load_dotenv()

# Set environment to skip Firebase secrets
os.environ["USE_FIREBASE_SECRETS"] = "false"


def main():
    print("\n" + "=" * 80)
    print("🔍 DIRECT DATABASE QUERY - IP: 38.252.156.103")
    print("=" * 80)

    # IP to query
    ip_address = "38.252.156.103"

    try:
        # Import after setting env var
        from app.service.agent.tools.database_tool.database_factory import (
            get_database_provider,
        )

        print(f"\n🔗 Connecting to database...")
        db_provider = get_database_provider()
        provider_type = type(db_provider).__name__
        print(f"   ✅ Using {provider_type}")

        # Get full table name
        table_name = db_provider.get_full_table_name()
        print(f"   Table: {table_name}")

        # Get database provider name for column case
        db_provider_name = os.getenv("DATABASE_PROVIDER", "snowflake").lower()

        # Build queries based on provider
        if db_provider_name == "snowflake":
            count_query = f"SELECT COUNT(*) as total_count FROM {table_name} WHERE IP = '{ip_address}'"

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

            similar_ip_query = f"""
            SELECT 
                IP,
                COUNT(*) as count,
                MIN(TX_DATETIME) as first_tx,
                MAX(TX_DATETIME) as last_tx
            FROM {table_name}
            WHERE IP LIKE '%38.252.156%'
               OR TRIM(IP) = '{ip_address}'
            GROUP BY IP
            ORDER BY count DESC
            LIMIT 10
            """
        else:
            count_query = (
                f"SELECT COUNT(*) as total_count FROM {table_name} WHERE ip = $1"
            )

            transaction_query = f"""
            SELECT
                tx_id_key,
                email,
                ip,
                paid_amount_value_in_currency,
                paid_amount_currency,
                tx_datetime,
                payment_method,
                card_brand,
                device_id,
                user_agent,
                ip_country_code,
                is_fraud_tx,
                model_score,
                nSure_last_decision as model_decision
            FROM {table_name}
            WHERE ip = $1
            ORDER BY tx_datetime DESC
            LIMIT 100
            """

            similar_ip_query = f"""
            SELECT 
                ip,
                COUNT(*) as count,
                MIN(tx_datetime) as first_tx,
                MAX(tx_datetime) as last_tx
            FROM {table_name}
            WHERE ip LIKE '%38.252.156%'
               OR TRIM(ip) = $1
            GROUP BY ip
            ORDER BY count DESC
            LIMIT 10
            """

        # Query 1: Count total transactions
        print(f"\n🔍 Query 1: Count total transactions for IP {ip_address}")
        print("-" * 80)
        print(f"SQL: {count_query}")

        if db_provider_name == "snowflake":
            count_results = db_provider.execute_query(count_query)
        else:
            count_results = db_provider.execute_query(
                count_query, params={"ip": ip_address}
            )

        total_count = count_results[0].get("total_count", 0) if count_results else 0
        print(f"   ✅ Total transactions found: {total_count}")

        # Query 2: Get transactions
        print(f"\n🔍 Query 2: Get transactions (LIMIT 100)")
        print("-" * 80)
        print(f"SQL: {transaction_query.strip()}")

        if db_provider_name == "snowflake":
            transactions = db_provider.execute_query(transaction_query)
        else:
            transactions = db_provider.execute_query(
                transaction_query, params={"ip": ip_address}
            )

        print(f"   ✅ Transactions returned: {len(transactions)}")

        if transactions:
            print(f"\n📋 Transaction Details:")
            print("-" * 80)
            for i, tx in enumerate(transactions[:5], 1):  # Show first 5
                print(f"\n   Transaction {i}:")
                print(f"      TX_ID_KEY: {tx.get('TX_ID_KEY') or tx.get('tx_id_key')}")
                print(f"      EMAIL: {tx.get('EMAIL') or tx.get('email')}")
                print(f"      IP: {tx.get('IP') or tx.get('ip')}")
                print(
                    f"      TX_DATETIME: {tx.get('TX_DATETIME') or tx.get('tx_datetime')}"
                )
                amount = tx.get("PAID_AMOUNT_VALUE_IN_CURRENCY") or tx.get(
                    "paid_amount_value_in_currency"
                )
                currency = tx.get("PAID_AMOUNT_CURRENCY") or tx.get(
                    "paid_amount_currency"
                )
                print(f"      AMOUNT: {amount} {currency}")
                print(
                    f"      MODEL_SCORE: {tx.get('MODEL_SCORE') or tx.get('model_score')}"
                )
                print(
                    f"      IS_FRAUD_TX: {tx.get('IS_FRAUD_TX') or tx.get('is_fraud_tx')}"
                )
                print(
                    f"      DECISION: {tx.get('MODEL_DECISION') or tx.get('model_decision')}"
                )

            if len(transactions) > 5:
                print(f"\n   ... and {len(transactions) - 5} more transactions")
        else:
            print(f"   ⚠️  No transactions found!")

        # Query 3: Check for similar IPs
        print(f"\n🔍 Query 3: Check for similar IPs (data quality check)")
        print("-" * 80)
        print(f"SQL: {similar_ip_query.strip()}")

        if db_provider_name == "snowflake":
            similar_results = db_provider.execute_query(similar_ip_query)
        else:
            similar_results = db_provider.execute_query(
                similar_ip_query, params={"ip": ip_address}
            )

        if similar_results:
            print(f"   ✅ Found {len(similar_results)} similar IP patterns:")
            for result in similar_results:
                ip = result.get("IP") or result.get("ip")
                count = result.get("count")
                first_tx = result.get("first_tx")
                last_tx = result.get("last_tx")
                print(
                    f"      IP: {ip} | Count: {count} | First: {first_tx} | Last: {last_tx}"
                )
        else:
            print(f"   ℹ️  No similar IPs found")

        print(f"\n" + "=" * 80)
        print(f"✅ Query Complete!")
        print(f"   Total matching transactions: {total_count}")
        print(f"   Transactions returned (LIMIT 100): {len(transactions)}")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
