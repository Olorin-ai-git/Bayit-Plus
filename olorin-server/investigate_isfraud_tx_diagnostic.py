#!/usr/bin/env python3
"""
Diagnostic script to investigate IS_FRAUD_TX NULL values in Snowflake.

This script checks:
1. Whether IS_FRAUD_TX column exists and its data type
2. Overall distribution of IS_FRAUD_TX values (NULL, 0, 1)
3. Sample transactions with their IS_FRAUD_TX values
4. Whether recent transactions have IS_FRAUD_TX populated
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def check_column_exists_and_type(db_provider, table_name: str) -> dict:
    """Check if IS_FRAUD_TX column exists and its data type."""
    query = f"""
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '{db_provider.schema.upper()}'
      AND TABLE_NAME = '{table_name.upper()}'
      AND COLUMN_NAME = 'IS_FRAUD_TX'
    """
    
    logger.info(f"🔍 Checking column definition for IS_FRAUD_TX...")
    logger.info(f"Query: {query}")
    
    is_async = hasattr(db_provider.execute_query, '__code__') and 'async' in str(db_provider.execute_query)
    
    try:
        if is_async:
            results = await db_provider.execute_query(query)
        else:
            results = db_provider.execute_query(query)
        
        if results:
            logger.info(f"✅ Column found: {results[0]}")
            return results[0]
        else:
            logger.warning("⚠️ IS_FRAUD_TX column not found in INFORMATION_SCHEMA")
            return {}
    except Exception as e:
        logger.error(f"❌ Error checking column: {e}", exc_info=True)
        return {}


async def check_overall_distribution(db_provider, table_name: str) -> dict:
    """Check overall distribution of IS_FRAUD_TX values."""
    query = f"""
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
    
    logger.info(f"📊 Checking overall IS_FRAUD_TX distribution...")
    logger.info(f"Query: {query}")
    
    is_async = hasattr(db_provider.execute_query, '__code__') and 'async' in str(db_provider.execute_query)
    
    try:
        if is_async:
            results = await db_provider.execute_query(query)
        else:
            results = db_provider.execute_query(query)
        
        if results:
            row = results[0]
            logger.info(f"✅ Distribution results:")
            logger.info(f"   Total transactions: {row.get('TOTAL_TRANSACTIONS') or row.get('total_transactions', 0)}")
            logger.info(f"   Non-NULL IS_FRAUD_TX: {row.get('NON_NULL_COUNT') or row.get('non_null_count', 0)}")
            logger.info(f"   NULL IS_FRAUD_TX: {row.get('NULL_COUNT') or row.get('null_count', 0)}")
            logger.info(f"   Fraud (IS_FRAUD_TX=1): {row.get('FRAUD_COUNT') or row.get('fraud_count', 0)}")
            logger.info(f"   Not Fraud (IS_FRAUD_TX=0): {row.get('NOT_FRAUD_COUNT') or row.get('not_fraud_count', 0)}")
            logger.info(f"   Earliest transaction: {row.get('EARLIEST_TX') or row.get('earliest_tx')}")
            logger.info(f"   Latest transaction: {row.get('LATEST_TX') or row.get('latest_tx')}")
            return row
        else:
            logger.warning("⚠️ No results returned")
            return {}
    except Exception as e:
        logger.error(f"❌ Error checking distribution: {e}", exc_info=True)
        return {}


async def check_recent_transactions(db_provider, table_name: str, days: int = 30) -> list:
    """Check IS_FRAUD_TX values for recent transactions."""
    utc = pytz.UTC
    cutoff_date = datetime.now(utc) - timedelta(days=days)
    cutoff_str = cutoff_date.strftime('%Y-%m-%d %H:%M:%S')
    
    query = f"""
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
    
    logger.info(f"🔍 Checking recent transactions (last {days} days)...")
    logger.info(f"Query: {query}")
    
    is_async = hasattr(db_provider.execute_query, '__code__') and 'async' in str(db_provider.execute_query)
    
    try:
        if is_async:
            results = await db_provider.execute_query(query)
        else:
            results = db_provider.execute_query(query)
        
        if results:
            logger.info(f"✅ Found {len(results)} recent transactions")
            
            # Analyze results
            null_count = 0
            fraud_count = 0
            not_fraud_count = 0
            
            logger.info(f"\n📋 Sample transactions (first 10):")
            for i, row in enumerate(results[:10]):
                tx_id = row.get('TX_ID_KEY') or row.get('tx_id_key')
                tx_datetime = row.get('TX_DATETIME') or row.get('tx_datetime')
                is_fraud = row.get('IS_FRAUD_TX') or row.get('is_fraud_tx')
                decision = row.get('NSURE_LAST_DECISION') or row.get('nsure_last_decision')
                email = row.get('EMAIL') or row.get('email')
                
                if is_fraud is None:
                    null_count += 1
                    status = "NULL"
                elif is_fraud == 1 or is_fraud == '1' or is_fraud is True:
                    fraud_count += 1
                    status = "FRAUD (1)"
                else:
                    not_fraud_count += 1
                    status = f"NOT FRAUD ({is_fraud})"
                
                logger.info(f"   {i+1}. TX_ID={tx_id[:20]}..., Date={tx_datetime}, IS_FRAUD_TX={status}, Decision={decision}, Email={email[:30] if email else 'N/A'}...")
            
            # Count all results
            for row in results:
                is_fraud = row.get('IS_FRAUD_TX') or row.get('is_fraud_tx')
                if is_fraud is None:
                    null_count += 1
                elif is_fraud == 1 or is_fraud == '1' or is_fraud is True:
                    fraud_count += 1
                else:
                    not_fraud_count += 1
            
            logger.info(f"\n📊 Summary of {len(results)} recent transactions:")
            logger.info(f"   NULL: {null_count}")
            logger.info(f"   Fraud (1): {fraud_count}")
            logger.info(f"   Not Fraud (0): {not_fraud_count}")
            
            return results
        else:
            logger.warning("⚠️ No recent transactions found")
            return []
    except Exception as e:
        logger.error(f"❌ Error checking recent transactions: {e}", exc_info=True)
        return []


async def check_approved_transactions(db_provider, table_name: str) -> dict:
    """Check IS_FRAUD_TX distribution specifically for APPROVED transactions."""
    query = f"""
    SELECT 
        COUNT(*) as total_approved,
        COUNT(IS_FRAUD_TX) as non_null_count,
        COUNT(*) - COUNT(IS_FRAUD_TX) as null_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as not_fraud_count
    FROM {table_name}
    WHERE UPPER(NSURE_LAST_DECISION) = 'APPROVED'
    """
    
    logger.info(f"📊 Checking IS_FRAUD_TX distribution for APPROVED transactions...")
    logger.info(f"Query: {query}")
    
    is_async = hasattr(db_provider.execute_query, '__code__') and 'async' in str(db_provider.execute_query)
    
    try:
        if is_async:
            results = await db_provider.execute_query(query)
        else:
            results = db_provider.execute_query(query)
        
        if results:
            row = results[0]
            logger.info(f"✅ APPROVED transactions distribution:")
            logger.info(f"   Total APPROVED: {row.get('TOTAL_APPROVED') or row.get('total_approved', 0)}")
            logger.info(f"   Non-NULL IS_FRAUD_TX: {row.get('NON_NULL_COUNT') or row.get('non_null_count', 0)}")
            logger.info(f"   NULL IS_FRAUD_TX: {row.get('NULL_COUNT') or row.get('null_count', 0)}")
            logger.info(f"   Fraud (IS_FRAUD_TX=1): {row.get('FRAUD_COUNT') or row.get('fraud_count', 0)}")
            logger.info(f"   Not Fraud (IS_FRAUD_TX=0): {row.get('NOT_FRAUD_COUNT') or row.get('not_fraud_count', 0)}")
            return row
        else:
            logger.warning("⚠️ No results returned")
            return {}
    except Exception as e:
        logger.error(f"❌ Error checking APPROVED transactions: {e}", exc_info=True)
        return {}


async def main():
    """Run all diagnostic checks."""
    logger.info("=" * 80)
    logger.info("IS_FRAUD_TX Diagnostic Investigation")
    logger.info("=" * 80)
    
    # Get database provider
    db_provider = get_database_provider()
    db_provider.connect()
    
    table_name = db_provider.get_full_table_name()
    logger.info(f"📋 Table: {table_name}")
    logger.info(f"📋 Schema: {db_provider.schema}")
    logger.info("")
    
    # Check 1: Column definition
    logger.info("=" * 80)
    logger.info("CHECK 1: Column Definition")
    logger.info("=" * 80)
    column_info = await check_column_exists_and_type(db_provider, table_name)
    logger.info("")
    
    # Check 2: Overall distribution
    logger.info("=" * 80)
    logger.info("CHECK 2: Overall Distribution")
    logger.info("=" * 80)
    overall_dist = await check_overall_distribution(db_provider, table_name)
    logger.info("")
    
    # Check 3: Recent transactions
    logger.info("=" * 80)
    logger.info("CHECK 3: Recent Transactions (Last 30 Days)")
    logger.info("=" * 80)
    recent_txs = await check_recent_transactions(db_provider, table_name, days=30)
    logger.info("")
    
    # Check 4: APPROVED transactions specifically
    logger.info("=" * 80)
    logger.info("CHECK 4: APPROVED Transactions Distribution")
    logger.info("=" * 80)
    approved_dist = await check_approved_transactions(db_provider, table_name)
    logger.info("")
    
    # Summary
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    
    if column_info:
        logger.info(f"✅ Column exists: {column_info.get('DATA_TYPE') or column_info.get('data_type')}")
        logger.info(f"   Nullable: {column_info.get('IS_NULLABLE') or column_info.get('is_nullable')}")
    
    if overall_dist:
        total = overall_dist.get('TOTAL_TRANSACTIONS') or overall_dist.get('total_transactions', 0)
        null_count = overall_dist.get('NULL_COUNT') or overall_dist.get('null_count', 0)
        non_null = overall_dist.get('NON_NULL_COUNT') or overall_dist.get('non_null_count', 0)
        
        if total > 0:
            null_pct = (null_count / total) * 100
            logger.info(f"📊 Overall: {null_count}/{total} ({null_pct:.1f}%) have NULL IS_FRAUD_TX")
            logger.info(f"   {non_null}/{total} ({100-null_pct:.1f}%) have non-NULL values")
    
    if approved_dist:
        total_approved = approved_dist.get('TOTAL_APPROVED') or approved_dist.get('total_approved', 0)
        null_approved = approved_dist.get('NULL_COUNT') or approved_dist.get('null_count', 0)
        
        if total_approved > 0:
            null_pct = (null_approved / total_approved) * 100
            logger.info(f"📊 APPROVED: {null_approved}/{total_approved} ({null_pct:.1f}%) have NULL IS_FRAUD_TX")
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("Diagnostic complete")
    logger.info("=" * 80)
    
    # Disconnect
    db_provider.disconnect()


if __name__ == "__main__":
    asyncio.run(main())

