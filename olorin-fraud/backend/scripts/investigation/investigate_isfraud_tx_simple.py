#!/usr/bin/env python3
"""
Simple diagnostic script to investigate IS_FRAUD_TX NULL values in Snowflake.

This script directly uses the Snowflake client to avoid dependency issues.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta

import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Direct import of Snowflake client to avoid dependency chain
from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient


async def main():
    """Run diagnostic checks."""
    print("=" * 80)
    print("IS_FRAUD_TX Diagnostic Investigation")
    print("=" * 80)

    # Initialize client
    client = RealSnowflakeClient()

    # Connect
    print("\n🔗 Connecting to Snowflake...")
    await client.connect()
    print("✅ Connected")

    # Get table name
    table_name = client.get_full_table_name()
    print(f"\n📋 Table: {table_name}")
    print(f"📋 Database: {client.database}")
    print(f"📋 Schema: {client.schema}")

    # Check 1: Column definition
    print("\n" + "=" * 80)
    print("CHECK 1: Column Definition")
    print("=" * 80)

    column_query = f"""
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '{client.schema.upper()}'
      AND TABLE_NAME = '{table_name.split(".")[-1].upper()}'
      AND COLUMN_NAME = 'IS_FRAUD_TX'
    """

    print(f"Query: {column_query}")
    try:
        column_results = await client.execute_query(column_query)
        if column_results:
            print(f"✅ Column found: {column_results[0]}")
        else:
            print("⚠️ Column not found in INFORMATION_SCHEMA")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Check 2: Overall distribution
    print("\n" + "=" * 80)
    print("CHECK 2: Overall Distribution")
    print("=" * 80)

    dist_query = f"""
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(IS_FRAUD_TX) as non_null_count,
        COUNT(*) - COUNT(IS_FRAUD_TX) as null_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as not_fraud_count,
        MIN(TX_DATETIME) as earliest_tx,
        MAX(TX_DATETIME) as latest_tx
    FROM {table_name}
    """

    print(f"Query: {dist_query}")
    try:
        dist_results = await client.execute_query(dist_query)
        if dist_results:
            row = dist_results[0]
            total = row.get("TOTAL_TRANSACTIONS") or row.get("total_transactions", 0)
            non_null = row.get("NON_NULL_COUNT") or row.get("non_null_count", 0)
            null_count = row.get("NULL_COUNT") or row.get("null_count", 0)
            fraud = row.get("FRAUD_COUNT") or row.get("fraud_count", 0)
            not_fraud = row.get("NOT_FRAUD_COUNT") or row.get("not_fraud_count", 0)

            print(f"\n✅ Results:")
            print(f"   Total transactions: {total}")
            print(f"   Non-NULL IS_FRAUD_TX: {non_null}")
            print(f"   NULL IS_FRAUD_TX: {null_count}")
            print(f"   Fraud (IS_FRAUD_TX=1): {fraud}")
            print(f"   Not Fraud (IS_FRAUD_TX=0): {not_fraud}")
            print(
                f"   Earliest transaction: {row.get('EARLIEST_TX') or row.get('earliest_tx')}"
            )
            print(
                f"   Latest transaction: {row.get('LATEST_TX') or row.get('latest_tx')}"
            )

            if total > 0:
                null_pct = (null_count / total) * 100
                print(
                    f"\n   📊 {null_count}/{total} ({null_pct:.1f}%) have NULL IS_FRAUD_TX"
                )
        else:
            print("⚠️ No results returned")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Check 3: Recent transactions
    print("\n" + "=" * 80)
    print("CHECK 3: Recent Transactions (Last 30 Days)")
    print("=" * 80)

    utc = pytz.UTC
    cutoff_date = datetime.now(utc) - timedelta(days=30)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d %H:%M:%S")

    recent_query = f"""
    SELECT 
        TX_ID_KEY,
        TX_DATETIME,
        IS_FRAUD_TX,
        NSURE_LAST_DECISION,
        EMAIL
    FROM {table_name}
    WHERE TX_DATETIME >= '{cutoff_str}'
    ORDER BY TX_DATETIME DESC
    LIMIT 100
    """

    print(f"Query: {recent_query}")
    try:
        recent_results = await client.execute_query(recent_query)
        if recent_results:
            print(f"\n✅ Found {len(recent_results)} recent transactions")

            null_count = 0
            fraud_count = 0
            not_fraud_count = 0

            print(f"\n📋 Sample transactions (first 10):")
            for i, row in enumerate(recent_results[:10]):
                tx_id = row.get("TX_ID_KEY") or row.get("tx_id_key")
                tx_datetime = row.get("TX_DATETIME") or row.get("tx_datetime")
                is_fraud = row.get("IS_FRAUD_TX") or row.get("is_fraud_tx")
                decision = row.get("NSURE_LAST_DECISION") or row.get(
                    "nsure_last_decision"
                )
                email = row.get("EMAIL") or row.get("email")

                if is_fraud is None:
                    null_count += 1
                    status = "NULL"
                elif is_fraud == 1 or is_fraud == "1" or is_fraud is True:
                    fraud_count += 1
                    status = "FRAUD (1)"
                else:
                    not_fraud_count += 1
                    status = f"NOT FRAUD ({is_fraud})"

                print(
                    f"   {i+1}. TX_ID={str(tx_id)[:20]}..., Date={tx_datetime}, IS_FRAUD_TX={status}, Decision={decision}, Email={str(email)[:30] if email else 'N/A'}..."
                )

            # Count all results
            for row in recent_results:
                is_fraud = row.get("IS_FRAUD_TX") or row.get("is_fraud_tx")
                if is_fraud is None:
                    null_count += 1
                elif is_fraud == 1 or is_fraud == "1" or is_fraud is True:
                    fraud_count += 1
                else:
                    not_fraud_count += 1

            print(f"\n📊 Summary of {len(recent_results)} recent transactions:")
            print(f"   NULL: {null_count}")
            print(f"   Fraud (1): {fraud_count}")
            print(f"   Not Fraud (0): {not_fraud_count}")
        else:
            print("⚠️ No recent transactions found")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Check 4: APPROVED transactions
    print("\n" + "=" * 80)
    print("CHECK 4: APPROVED Transactions Distribution")
    print("=" * 80)

    approved_query = f"""
    SELECT 
        COUNT(*) as total_approved,
        COUNT(IS_FRAUD_TX) as non_null_count,
        COUNT(*) - COUNT(IS_FRAUD_TX) as null_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as not_fraud_count
    FROM {table_name}
    WHERE UPPER(NSURE_LAST_DECISION) = 'APPROVED'
    """

    print(f"Query: {approved_query}")
    try:
        approved_results = await client.execute_query(approved_query)
        if approved_results:
            row = approved_results[0]
            total_approved = row.get("TOTAL_APPROVED") or row.get("total_approved", 0)
            non_null = row.get("NON_NULL_COUNT") or row.get("non_null_count", 0)
            null_count = row.get("NULL_COUNT") or row.get("null_count", 0)
            fraud = row.get("FRAUD_COUNT") or row.get("fraud_count", 0)
            not_fraud = row.get("NOT_FRAUD_COUNT") or row.get("not_fraud_count", 0)

            print(f"\n✅ APPROVED transactions distribution:")
            print(f"   Total APPROVED: {total_approved}")
            print(f"   Non-NULL IS_FRAUD_TX: {non_null}")
            print(f"   NULL IS_FRAUD_TX: {null_count}")
            print(f"   Fraud (IS_FRAUD_TX=1): {fraud}")
            print(f"   Not Fraud (IS_FRAUD_TX=0): {not_fraud}")

            if total_approved > 0:
                null_pct = (null_count / total_approved) * 100
                print(
                    f"\n   📊 {null_count}/{total_approved} ({null_pct:.1f}%) have NULL IS_FRAUD_TX"
                )
        else:
            print("⚠️ No results returned")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print("Diagnostic complete")
    print("=" * 80)

    # Disconnect
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
