#!/usr/bin/env python3
"""
Query to find transactions with IS_FRAUD_TX=true and APPROVED=true, grouped by month over the past year.
"""

import os
import sys
import asyncio
import inspect
from datetime import datetime, timedelta
import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def query_fraud_approved_monthly():
    """Query transactions with IS_FRAUD_TX=1 and APPROVED=true, grouped by month."""
    db_provider = get_database_provider()
    db_provider.connect()
    
    table_name = db_provider.get_full_table_name()
    
    # Calculate date range: past year from today
    utc = pytz.UTC
    now = datetime.now(utc)
    one_year_ago = now - timedelta(days=365)
    
    # Format dates for SQL
    start_date = one_year_ago.strftime('%Y-%m-%d %H:%M:%S')
    end_date = now.strftime('%Y-%m-%d %H:%M:%S')
    
    query = f"""
    SELECT 
        DATE_TRUNC('month', TX_DATETIME) as month,
        COUNT(*) as transaction_count,
        SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
        COUNT(DISTINCT EMAIL) as unique_emails,
        COUNT(DISTINCT TX_ID_KEY) as unique_transactions
    FROM {table_name}
    WHERE IS_FRAUD_TX = 1
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND TX_DATETIME >= '{start_date}'
      AND TX_DATETIME < '{end_date}'
    GROUP BY DATE_TRUNC('month', TX_DATETIME)
    ORDER BY month DESC
    """
    
    print("=" * 85)
    print("Fraud + Approved Transactions Monthly Report (Past Year)")
    print("=" * 85)
    print(f"\n📊 Querying fraud + approved transactions by month (past year)")
    print(f"   Date range: {start_date} to {end_date}")
    print(f"   Table: {table_name}")
    print(f"\nQuery:\n{query}\n")
    logger.info(f"📊 Querying fraud + approved transactions by month (past year)")
    logger.info(f"   Date range: {start_date} to {end_date}")
    logger.info(f"   Table: {table_name}")
    logger.info(f"\nQuery:\n{query}\n")
    
    # Check if execute_query is async
    is_async = inspect.iscoroutinefunction(db_provider.execute_query)
    
    try:
        if is_async:
            print("Using async query execution...")
            results = await db_provider.execute_query(query)
        else:
            print("Using sync query execution...")
            results = db_provider.execute_query(query)
        
        if results:
            print(f"\n✅ Results: {len(results)} months found\n")
            print(f"{'Month':<20} {'Count':<15} {'Total Amount':<20} {'Unique Emails':<15} {'Unique TXs':<15}")
            print("-" * 85)
            logger.info(f"\n✅ Results: {len(results)} months found\n")
            logger.info(f"{'Month':<20} {'Count':<15} {'Total Amount':<20} {'Unique Emails':<15} {'Unique TXs':<15}")
            logger.info("-" * 85)
            
            total_count = 0
            total_amount = 0
            total_unique_emails = set()
            total_unique_txs = set()
            
            for row in results:
                month = row.get('MONTH') or row.get('month')
                count = row.get('TRANSACTION_COUNT') or row.get('transaction_count', 0)
                amount = row.get('TOTAL_AMOUNT') or row.get('total_amount', 0)
                unique_emails = row.get('UNIQUE_EMAILS') or row.get('unique_emails', 0)
                unique_txs = row.get('UNIQUE_TRANSACTIONS') or row.get('unique_transactions', 0)
                
                # Format month for display
                if month:
                    if isinstance(month, str):
                        month_str = month[:7]  # YYYY-MM
                    else:
                        month_str = str(month)[:7]
                else:
                    month_str = "Unknown"
                
                # Format amount
                if amount:
                    amount_str = f"${amount:,.2f}"
                else:
                    amount_str = "$0.00"
                
                print(f"{month_str:<20} {count:<15} {amount_str:<20} {unique_emails:<15} {unique_txs:<15}")
                logger.info(f"{month_str:<20} {count:<15} {amount_str:<20} {unique_emails:<15} {unique_txs:<15}")
                
                total_count += count
                total_amount += amount or 0
                if unique_emails:
                    total_unique_emails.add(unique_emails)
                if unique_txs:
                    total_unique_txs.add(unique_txs)
            
            print("-" * 85)
            print(f"{'TOTAL':<20} {total_count:<15} ${total_amount:,.2f}")
            print(f"\n📊 Summary:")
            print(f"   Total transactions: {total_count:,}")
            print(f"   Total amount: ${total_amount:,.2f}")
            print(f"   Months with data: {len(results)}")
            logger.info("-" * 85)
            logger.info(f"{'TOTAL':<20} {total_count:<15} ${total_amount:,.2f}")
            logger.info(f"\n📊 Summary:")
            logger.info(f"   Total transactions: {total_count:,}")
            logger.info(f"   Total amount: ${total_amount:,.2f}")
            logger.info(f"   Months with data: {len(results)}")
            
            return results
        else:
            print("⚠️ No results returned")
            logger.warning("⚠️ No results returned")
            return []
    except Exception as e:
        print(f"❌ Error executing query: {e}")
        import traceback
        traceback.print_exc()
        logger.error(f"❌ Error executing query: {e}", exc_info=True)
        return []
    finally:
        try:
            # Handle async disconnect properly
            if hasattr(db_provider, '_client') and hasattr(db_provider._client, 'disconnect'):
                if asyncio.iscoroutinefunction(db_provider._client.disconnect):
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            # If loop is running, schedule disconnect
                            asyncio.create_task(db_provider._client.disconnect())
                        else:
                            asyncio.run(db_provider._client.disconnect())
                    except Exception:
                        pass  # Ignore disconnect errors
                else:
                    db_provider.disconnect()
            else:
                db_provider.disconnect()
        except Exception as e:
            logger.warning(f"⚠️ Error disconnecting: {e}")


async def main():
    """Main entry point."""
    results = await query_fraud_approved_monthly()
    
    print("\n" + "=" * 85)
    print("Query completed")
    print("=" * 85)
    logger.info("\n" + "=" * 85)
    logger.info("Query completed")
    logger.info("=" * 85)


if __name__ == "__main__":
    asyncio.run(main())

