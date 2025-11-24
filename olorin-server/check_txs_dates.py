#!/usr/bin/env python3
"""
Check the date range of records in TXS table.
"""
import sys
import os
import asyncio
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def check_txs_dates():
    """Check date range in TXS table."""
    print("\n" + "=" * 80)
    print("CHECKING TXS TABLE DATE RANGE")
    print("=" * 80)
    
    # Check configuration
    print("\n📋 Configuration:")
    print(f"   DATABASE_PROVIDER: {os.getenv('DATABASE_PROVIDER', 'NOT SET')}")
    print(f"   SNOWFLAKE_DATABASE: {os.getenv('SNOWFLAKE_DATABASE', 'NOT SET')}")
    print(f"   SNOWFLAKE_SCHEMA: {os.getenv('SNOWFLAKE_SCHEMA', 'NOT SET')}")
    print(f"   SNOWFLAKE_TRANSACTIONS_TABLE: {os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'NOT SET')}")
    
    try:
        db_provider = os.getenv('DATABASE_PROVIDER', 'postgresql')
        client = get_database_provider(db_provider)
        
        print(f"\n🔌 Connecting to {db_provider.upper()}...")
        client.connect()
        
        # Get table name
        table_name = client.get_full_table_name()
        print(f"   Table: {table_name}")
        
        # Check date range
        print("\n📅 Checking date range...")
        
        # For Snowflake, use TX_DATETIME; for PostgreSQL, use tx_datetime
        datetime_col = 'TX_DATETIME' if db_provider.lower() == 'snowflake' else 'tx_datetime'
        
        query = f"""
        SELECT 
            COUNT(*) as total_records,
            MIN({datetime_col}) as earliest_date,
            MAX({datetime_col}) as latest_date,
            DATEDIFF(day, MIN({datetime_col}), MAX({datetime_col})) as days_span,
            DATEDIFF(hour, MAX({datetime_col}), CURRENT_TIMESTAMP()) as hours_since_latest
        FROM {table_name}
        WHERE {datetime_col} IS NOT NULL
        """
        
        print(f"   Query: {query[:200]}...")
        results = client.execute_query(query)
        
        if results:
            r = results[0]
            print(f"\n✅ Results:")
            print(f"   Total records: {r.get('TOTAL_RECORDS') or r.get('total_records', 0):,}")
            print(f"   Earliest date: {r.get('EARLIEST_DATE') or r.get('earliest_date', 'N/A')}")
            print(f"   Latest date: {r.get('LATEST_DATE') or r.get('latest_date', 'N/A')}")
            print(f"   Date span: {r.get('DAYS_SPAN') or r.get('days_span', 0)} days")
            hours_since = r.get('HOURS_SINCE_LATEST') or r.get('hours_since_latest', 0)
            print(f"   Hours since latest: {hours_since}")
            
            if hours_since > 24:
                print(f"\n⚠️  WARNING: Latest record is {hours_since} hours old ({hours_since/24:.1f} days)")
                print(f"   Risk analyzer with 24h window will find no data!")
            else:
                print(f"\n✅ Latest record is recent ({hours_since} hours old)")
        
        # Check records in last 24 hours
        print("\n📊 Checking records in last 24 hours...")
        query_24h = f"""
        SELECT 
            COUNT(*) as records_24h
        FROM {table_name}
        WHERE {datetime_col} >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
        """
        
        results_24h = client.execute_query(query_24h)
        if results_24h:
            count_24h = results_24h[0].get('RECORDS_24H') or results_24h[0].get('records_24h', 0)
            print(f"   Records in last 24h: {count_24h:,}")
        
        # Check records in last 7 days
        print("\n📊 Checking records in last 7 days...")
        query_7d = f"""
        SELECT 
            COUNT(*) as records_7d
        FROM {table_name}
        WHERE {datetime_col} >= DATEADD(day, -7, CURRENT_TIMESTAMP())
        """
        
        results_7d = client.execute_query(query_7d)
        if results_7d:
            count_7d = results_7d[0].get('RECORDS_7D') or results_7d[0].get('records_7d', 0)
            print(f"   Records in last 7d: {count_7d:,}")
        
        # Sample some recent records
        print("\n📋 Sample of 5 most recent records:")
        query_sample = f"""
        SELECT 
            {datetime_col},
            EMAIL,
            IP,
            DEVICE_ID,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            MODEL_SCORE
        FROM {table_name}
        WHERE {datetime_col} IS NOT NULL
        ORDER BY {datetime_col} DESC
        LIMIT 5
        """
        
        results_sample = client.execute_query(query_sample)
        if results_sample:
            for i, row in enumerate(results_sample, 1):
                dt = row.get('TX_DATETIME') or row.get('tx_datetime', 'N/A')
                email = row.get('EMAIL') or row.get('email', 'N/A')
                ip = row.get('IP') or row.get('ip', 'N/A')
                amount = row.get('PAID_AMOUNT_VALUE_IN_CURRENCY') or row.get('paid_amount_value_in_currency', 0)
                print(f"   {i}. {dt} | {email[:30]:<30} | ${amount:,.2f}")
        
        print("\n" + "=" * 80)
        print("✅ DATE CHECK COMPLETED")
        print("=" * 80 + "\n")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ CHECK FAILED!")
        print(f"   Error: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        print(f"\nTraceback:")
        traceback.print_exc()
        return 1
    finally:
        try:
            await client.disconnect()
        except:
            pass


if __name__ == "__main__":
    exit_code = asyncio.run(check_txs_dates())
    sys.exit(exit_code)
