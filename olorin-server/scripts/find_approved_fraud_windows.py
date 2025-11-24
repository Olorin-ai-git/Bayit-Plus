#!/usr/bin/env python3
"""
Find 24-hour windows that contain APPROVED fraud transactions.
This will help us identify when fraud occurred so we can test the investigation.
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
    TX_DATETIME, IS_FRAUD_TX, NSURE_LAST_DECISION
)


async def find_fraud_windows():
    """Find 24-hour windows with approved fraud"""
    print("=" * 80)
    print("🔍 FINDING 24-HOUR WINDOWS WITH APPROVED FRAUD")
    print("=" * 80)
    print()
    
    # Import Snowflake provider
    from app.service.agent.tools.database_tool import get_database_provider
    
    db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
    provider = get_database_provider(db_provider)
    provider.connect()
    
    # Get table name
    db = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
    table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
    full_table = f"{db}.{schema}.{table}"
    
    # Query to find fraud windows
    # Group transactions by day and count approved fraud
    query = f"""
    SELECT
        DATE_TRUNC('DAY', {TX_DATETIME}) as fraud_date,
        COUNT(*) as total_approved_fraud,
        COUNT(DISTINCT EMAIL) as unique_fraud_entities,
        MIN({TX_DATETIME}) as first_fraud_time,
        MAX({TX_DATETIME}) as last_fraud_time
    FROM {full_table}
    WHERE UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {IS_FRAUD_TX} = 1
        AND EMAIL IS NOT NULL
    GROUP BY DATE_TRUNC('DAY', {TX_DATETIME})
    HAVING COUNT(*) > 0
    ORDER BY fraud_date DESC
    LIMIT 30
    """
    
    print("📊 Querying for approved fraud by day (last 30 days with fraud)...")
    print()
    
    try:
        results = await provider.execute_query_async(query)
        
        if not results:
            print("⚠️ No approved fraud found in the database!")
            print("   This could mean:")
            print("   1. All fraud was REJECTED (not APPROVED)")
            print("   2. Fraud exists but with different decision values")
            print("   3. The time range doesn't have fraud data")
            print()
            
            # Try to find ANY fraud (regardless of approval status)
            print("🔄 Searching for fraud with ANY decision status...")
            any_fraud_query = f"""
            SELECT
                DATE_TRUNC('DAY', {TX_DATETIME}) as fraud_date,
                COUNT(*) as total_fraud,
                COUNT(DISTINCT EMAIL) as unique_fraud_entities,
                SUM(CASE WHEN UPPER({NSURE_LAST_DECISION}) = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN UPPER({NSURE_LAST_DECISION}) = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN UPPER({NSURE_LAST_DECISION}) NOT IN ('APPROVED', 'REJECTED') THEN 1 ELSE 0 END) as other
            FROM {full_table}
            WHERE {IS_FRAUD_TX} = 1
                AND EMAIL IS NOT NULL
            GROUP BY DATE_TRUNC('DAY', {TX_DATETIME})
            HAVING COUNT(*) > 0
            ORDER BY fraud_date DESC
            LIMIT 30
            """
            any_fraud_results = await provider.execute_query_async(any_fraud_query)
            
            if any_fraud_results:
                print(f"✅ Found {len(any_fraud_results)} days with fraud (any decision status)")
                print()
                print("Day                  | Total | Approved | Rejected | Other | Entities")
                print("-" * 80)
                for row in any_fraud_results[:10]:
                    date = row.get('FRAUD_DATE') or row.get('fraud_date')
                    total = row.get('TOTAL_FRAUD') or row.get('total_fraud')
                    approved = row.get('APPROVED') or row.get('approved')
                    rejected = row.get('REJECTED') or row.get('rejected')
                    other = row.get('OTHER') or row.get('other')
                    entities = row.get('UNIQUE_FRAUD_ENTITIES') or row.get('unique_fraud_entities')
                    print(f"{str(date)[:10]:20} | {total:5} | {approved:8} | {rejected:8} | {other:5} | {entities:8}")
            else:
                print("❌ No fraud found at all in the database!")
            
            return
        
        print(f"✅ Found {len(results)} days with APPROVED fraud")
        print()
        print("Date                | Approved Fraud | Unique Entities | Time Range")
        print("-" * 80)
        
        for row in results:
            date = row.get('FRAUD_DATE') or row.get('fraud_date')
            count = row.get('TOTAL_APPROVED_FRAUD') or row.get('total_approved_fraud')
            entities = row.get('UNIQUE_FRAUD_ENTITIES') or row.get('unique_fraud_entities')
            first = row.get('FIRST_FRAUD_TIME') or row.get('first_fraud_time')
            last = row.get('LAST_FRAUD_TIME') or row.get('last_fraud_time')
            
            print(f"{str(date)[:10]:20} | {count:14} | {entities:15} | {str(first)[11:16]} - {str(last)[11:16]}")
        
        print()
        print("=" * 80)
        print("💡 RECOMMENDATION")
        print("=" * 80)
        
        if results:
            best_day = results[0]
            date = best_day.get('FRAUD_DATE') or best_day.get('fraud_date')
            count = best_day.get('TOTAL_APPROVED_FRAUD') or best_day.get('total_approved_fraud')
            entities = best_day.get('UNIQUE_FRAUD_ENTITIES') or best_day.get('unique_fraud_entities')
            
            print(f"Most recent day with approved fraud: {str(date)[:10]}")
            print(f"   Approved fraud transactions: {count}")
            print(f"   Unique fraud entities: {entities}")
            print()
            print("To investigate this period, update .env:")
            
            # Calculate how many months back this is from today
            fraud_date = datetime.fromisoformat(str(date)[:10])
            today = datetime.utcnow()
            months_back = ((today.year - fraud_date.year) * 12 + today.month - fraud_date.month)
            
            print(f"   ANALYZER_END_OFFSET_MONTHS={months_back}")
            print(f"   ANALYZER_TIME_WINDOW_HOURS=24")
            print()
            print("Then restart the server to investigate these fraud entities!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(find_fraud_windows())

