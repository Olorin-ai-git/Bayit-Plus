#!/usr/bin/env python3
"""
Test Snowflake SQL queries directly to identify compilation errors.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient

async def test_sql_queries():
    """Test all SQL queries that might be causing compilation errors."""
    
    # Test the risk entities query that's causing issues
    client = RealSnowflakeClient()
    
    try:
        await client.connect("FRAUD_ANALYTICS", "PUBLIC")
        print("✅ Connected to Snowflake successfully")
        
        # Test 1: Simple query first
        simple_query = """
        SELECT COUNT(*) as record_count 
        FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED 
        LIMIT 1
        """
        
        print("🔍 Testing simple count query...")
        results = await client.execute_query(simple_query, limit=1)
        print(f"✅ Simple query works: {results}")
        
        # Test 2: Risk entities query that was failing
        print("🔍 Testing risk entities query...")
        results = await client.get_top_risk_entities(
            time_window_hours=24,
            group_by='IP',
            top_percentage=0.1,
            min_transactions=1
        )
        print(f"✅ Risk entities query works: found {len(results)} entities")
        
        # Test 3: Transaction details query  
        print("🔍 Testing transaction details query...")
        entity_query = """
        SELECT TX_ID_KEY, EMAIL, IP, MODEL_SCORE, IS_FRAUD_TX
        FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED 
        WHERE IP = '102.159.115.190'
        LIMIT 5
        """
        
        results = await client.execute_query(entity_query, limit=5)
        print(f"✅ Transaction details query works: found {len(results)} transactions")
        
    except Exception as e:
        print(f"❌ SQL Error: {e}")
        print(f"Error type: {type(e)}")
        
        # Try to identify the specific problematic query
        if "syntax error" in str(e).lower():
            print("🔍 This is a SQL syntax error - need to fix the query structure")
        elif "invalid identifier" in str(e).lower():
            print("🔍 This is an invalid column name error - need to check column names")
        elif "compilation error" in str(e).lower():
            print("🔍 This is a SQL compilation error - need to check SQL syntax")
            
    finally:
        await client.disconnect()
        print("🔌 Disconnected from Snowflake")

if __name__ == "__main__":
    # Only run if USE_SNOWFLAKE=true
    if os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true':
        print("🚀 Testing Snowflake SQL queries in LIVE mode...")
        asyncio.run(test_sql_queries())
    else:
        print("❌ Set USE_SNOWFLAKE=true to run SQL tests")