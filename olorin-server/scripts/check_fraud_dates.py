#!/usr/bin/env python3
"""
Check the actual dates of fraud transactions for the investigated entities.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.service.agent.tools.snowflake_tool.schema_constants import (
    IS_FRAUD_TX,
    NSURE_LAST_DECISION,
    TX_DATETIME,
)


async def check_fraud_dates():
    """Check when fraud actually occurred for the entity"""
    print("=" * 80)
    print("🔍 CHECKING FRAUD TRANSACTION DATES")
    print("=" * 80)
    print()

    # Import Snowflake provider
    from app.service.agent.tools.database_tool import get_database_provider

    db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
    provider = get_database_provider(db_provider)
    provider.connect()

    # Get table name
    db = os.getenv("SNOWFLAKE_DATABASE", "DBT")
    schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
    table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TXS")
    full_table = f"{db}.{schema}.{table}"

    entity = "kevinalejandroo1407@gmail.com"

    # First, check ALL fraud transactions for this entity (no date filter)
    query = f"""
    SELECT
        {TX_DATETIME} as tx_datetime,
        {IS_FRAUD_TX} as is_fraud,
        {NSURE_LAST_DECISION} as decision,
        COUNT(*) as count
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND {IS_FRAUD_TX} = 1
    GROUP BY {TX_DATETIME}, {IS_FRAUD_TX}, {NSURE_LAST_DECISION}
    ORDER BY {TX_DATETIME}
    """

    print(f"📧 Entity: {entity}")
    print()
    print("Checking ALL fraud transactions (no date filter)...")

    results = await provider.execute_query_async(query)

    if not results:
        print("❌ No fraud transactions found for this entity at all!")
        return

    print(f"✅ Found {len(results)} fraud transaction dates")
    print()

    # Show the dates
    print("FRAUD TRANSACTION DATES:")
    print("-" * 40)
    for row in results:
        date = row.get("TX_DATETIME") or row.get("tx_datetime")
        decision = row.get("DECISION") or row.get("decision")
        count = row.get("COUNT") or row.get("count")
        print(f"  {str(date)[:19]} - Decision: {decision} - Count: {count}")
    print()

    # Check the investigation window
    print("=" * 80)
    print("📅 INVESTIGATION WINDOW ANALYSIS")
    print("=" * 80)
    print()

    # The investigation used: 2.5 years ago to 6 months ago
    investigation_end = datetime.now() - timedelta(days=6 * 30)  # 6 months ago
    investigation_start = datetime.now() - timedelta(
        days=int(2.5 * 365)
    )  # 2.5 years ago

    print(f"Investigation window:")
    print(f"  Start: {investigation_start.strftime('%Y-%m-%d')}")
    print(f"  End:   {investigation_end.strftime('%Y-%m-%d')}")
    print()

    # Check if fraud dates fall within investigation window
    if results:
        first_fraud = results[0].get("TX_DATETIME") or results[0].get("tx_datetime")
        last_fraud = results[-1].get("TX_DATETIME") or results[-1].get("tx_datetime")

        first_fraud_dt = datetime.fromisoformat(str(first_fraud)[:19])
        last_fraud_dt = datetime.fromisoformat(str(last_fraud)[:19])

        print("Fraud transaction dates:")
        print(f"  First: {first_fraud_dt.strftime('%Y-%m-%d')}")
        print(f"  Last:  {last_fraud_dt.strftime('%Y-%m-%d')}")
        print()

        if first_fraud_dt > investigation_end:
            print("❌ PROBLEM: All fraud occurred AFTER the investigation window!")
            print(f"   Fraud started: {first_fraud_dt.strftime('%Y-%m-%d')}")
            print(f"   Investigation ended: {investigation_end.strftime('%Y-%m-%d')}")
            print(f"   Gap: {(first_fraud_dt - investigation_end).days} days")
        elif last_fraud_dt < investigation_start:
            print("❌ PROBLEM: All fraud occurred BEFORE the investigation window!")
        else:
            print("✅ Fraud dates overlap with investigation window")

            # Count fraud within window
            fraud_in_window = 0
            fraud_outside = 0

            for row in results:
                date = row.get("TX_DATETIME") or row.get("tx_datetime")
                date_dt = datetime.fromisoformat(str(date)[:19])
                count = row.get("COUNT") or row.get("count")

                if investigation_start <= date_dt <= investigation_end:
                    fraud_in_window += count
                else:
                    fraud_outside += count

            print(f"   Fraud IN investigation window: {fraud_in_window}")
            print(f"   Fraud OUTSIDE window: {fraud_outside}")

    print()
    print("=" * 80)
    print("💡 KEY FINDING")
    print("=" * 80)
    print()

    # The analyzer looked at 2025-05-26 (6 months ago)
    analyzer_date = datetime.now() - timedelta(days=6 * 30)
    print(f"Analyzer date: {analyzer_date.strftime('%Y-%m-%d')} (6 months ago)")
    print(f"This is when the analyzer found the fraud entities")
    print()

    if results:
        # Check if fraud is on the analyzer date
        analyzer_fraud = [
            r
            for r in results
            if str(r.get("TX_DATETIME") or r.get("tx_datetime"))[:10]
            == analyzer_date.strftime("%Y-%m-%d")
        ]

        if analyzer_fraud:
            print(
                f"✅ Fraud found on analyzer date: {sum(r.get('COUNT') or r.get('count') for r in analyzer_fraud)} transactions"
            )
        else:
            print("⚠️ No fraud on the exact analyzer date")
            print("   The fraud may be in the 24-hour window around that date")


if __name__ == "__main__":
    asyncio.run(check_fraud_dates())
