#!/usr/bin/env python3
"""
Find 24-hour windows with APPROVED fraud, starting from 6 months ago and searching backward.
This searches historical data to validate our investigation can detect known fraud.
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


async def find_historical_fraud():
    """Find 24-hour windows with approved fraud, starting from 6 months ago"""
    print("=" * 80)
    print("🔍 FINDING APPROVED FRAUD (6 MONTHS AGO, SEARCHING BACKWARD)")
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

    # Calculate 6 months ago
    months_back = int(os.getenv("ANALYZER_END_OFFSET_MONTHS", "6"))
    end_date = datetime.now() - timedelta(days=months_back * 30)

    print(f"📅 Search Parameters:")
    print(f"   Starting from: {end_date.strftime('%Y-%m-%d')} (6 months ago)")
    print(f"   Searching: Backward in time")
    print(f"   Looking for: APPROVED=TRUE AND IS_FRAUD_TX=1")
    print()

    # Query to find fraud windows starting from 6 months ago and going backward
    # We'll look at the previous 90 days from the 6-month mark
    search_start = end_date - timedelta(days=90)

    query = f"""
    SELECT
        DATE_TRUNC('DAY', {TX_DATETIME}) as fraud_date,
        COUNT(*) as total_approved_fraud,
        COUNT(DISTINCT EMAIL) as unique_fraud_entities,
        MIN({TX_DATETIME}) as first_fraud_time,
        MAX({TX_DATETIME}) as last_fraud_time
    FROM {full_table}
    WHERE {TX_DATETIME} >= '{search_start.strftime('%Y-%m-%d')}'
        AND {TX_DATETIME} < '{end_date.strftime('%Y-%m-%d')}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {IS_FRAUD_TX} = 1
        AND EMAIL IS NOT NULL
    GROUP BY DATE_TRUNC('DAY', {TX_DATETIME})
    HAVING COUNT(*) > 0
    ORDER BY fraud_date DESC
    LIMIT 90
    """

    print(
        f"📊 Searching period: {search_start.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} (90 days)"
    )
    print()

    try:
        results = await provider.execute_query_async(query)

        if not results:
            print("⚠️ No approved fraud found in this historical period!")
            print(
                f"   Searched: {search_start.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            )
            print()

            # Try searching earlier periods
            print("🔄 Searching earlier periods (up to 12 months ago)...")
            earlier_end = end_date - timedelta(days=90)
            earlier_start = earlier_end - timedelta(days=90)

            earlier_query = f"""
            SELECT
                DATE_TRUNC('DAY', {TX_DATETIME}) as fraud_date,
                COUNT(*) as total_approved_fraud,
                COUNT(DISTINCT EMAIL) as unique_fraud_entities
            FROM {full_table}
            WHERE {TX_DATETIME} >= '{earlier_start.strftime('%Y-%m-%d')}'
                AND {TX_DATETIME} < '{earlier_end.strftime('%Y-%m-%d')}'
                AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
                AND {IS_FRAUD_TX} = 1
                AND EMAIL IS NOT NULL
            GROUP BY DATE_TRUNC('DAY', {TX_DATETIME})
            HAVING COUNT(*) > 0
            ORDER BY fraud_date DESC
            LIMIT 30
            """

            earlier_results = await provider.execute_query_async(earlier_query)

            if earlier_results:
                print(
                    f"✅ Found {len(earlier_results)} days with approved fraud in earlier period"
                )
                print(
                    f"   Period: {earlier_start.strftime('%Y-%m-%d')} to {earlier_end.strftime('%Y-%m-%d')}"
                )
                print()
                best_day = earlier_results[0]
                date = best_day.get("FRAUD_DATE") or best_day.get("fraud_date")
                count = best_day.get("TOTAL_APPROVED_FRAUD") or best_day.get(
                    "total_approved_fraud"
                )
                entities = best_day.get("UNIQUE_FRAUD_ENTITIES") or best_day.get(
                    "unique_fraud_entities"
                )

                print(f"Most recent day in earlier period: {str(date)[:10]}")
                print(f"   Approved fraud transactions: {count}")
                print(f"   Unique fraud entities: {entities}")

                # Calculate offset
                fraud_date = datetime.fromisoformat(str(date)[:10])
                today = datetime.now()
                days_back = (today - fraud_date).days
                months_back_calc = days_back // 30

                print()
                print(f"To investigate, update env:")
                print(f"   ANALYZER_END_OFFSET_MONTHS={months_back_calc}")
            else:
                print("❌ No approved fraud found even in earlier periods")
                print("   Try checking fraud with ANY decision status")

            return

        print(
            f"✅ Found {len(results)} days with APPROVED fraud in the 6-month lookback period"
        )
        print()
        print("Date                | Approved Fraud | Unique Entities | Time Range")
        print("-" * 80)

        for row in results[:20]:
            date = row.get("FRAUD_DATE") or row.get("fraud_date")
            count = row.get("TOTAL_APPROVED_FRAUD") or row.get("total_approved_fraud")
            entities = row.get("UNIQUE_FRAUD_ENTITIES") or row.get(
                "unique_fraud_entities"
            )
            first = row.get("FIRST_FRAUD_TIME") or row.get("first_fraud_time")
            last = row.get("LAST_FRAUD_TIME") or row.get("last_fraud_time")

            print(
                f"{str(date)[:10]:20} | {count:14} | {entities:15} | {str(first)[11:16]} - {str(last)[11:16]}"
            )

        print()
        print("=" * 80)
        print("💡 RECOMMENDATION")
        print("=" * 80)

        if results:
            best_day = results[0]
            date = best_day.get("FRAUD_DATE") or best_day.get("fraud_date")
            count = best_day.get("TOTAL_APPROVED_FRAUD") or best_day.get(
                "total_approved_fraud"
            )
            entities = best_day.get("UNIQUE_FRAUD_ENTITIES") or best_day.get(
                "unique_fraud_entities"
            )

            print(
                f"Most recent day with approved fraud (before 6 months ago): {str(date)[:10]}"
            )
            print(f"   Approved fraud transactions: {count}")
            print(f"   Unique fraud entities: {entities}")
            print()

            # Calculate exact offset needed
            fraud_date = datetime.fromisoformat(str(date)[:10])
            today = datetime.now()
            days_back = (today - fraud_date).days
            months_back_calc = days_back // 30

            print("To investigate this period, update env:")
            print(f"   ANALYZER_END_OFFSET_MONTHS={months_back_calc}")
            print(f"   ANALYZER_TIME_WINDOW_HOURS=24")
            print()
            print(
                f"This will investigate the 24-hour window ending on {fraud_date.strftime('%Y-%m-%d')}"
            )
            print(
                f"All {entities} fraud entities from that day will be investigated over a 2-year lookback"
            )

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(find_historical_fraud())
