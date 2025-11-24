#!/usr/bin/env python3
"""
Test Snowflake query directly to verify MODEL_SCORE filter
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import asyncio
from app.service.agent.tools.database_tool import get_database_provider

async def main():
    # Get Snowflake client
    client = get_database_provider()
    
    client.connect()
    
    # Test query with MODEL_SCORE filter
    query = """
    WITH risk_calculations AS (
        SELECT
            EMAIL as entity,
            COUNT(*) as transaction_count,
            AVG(MODEL_SCORE) as avg_risk_score
        FROM DBT.DBT_PROD.TXS
        WHERE TX_DATETIME >= DATEADD(day, -1, DATEADD(hour, -0, DATEADD(day, -180, CURRENT_TIMESTAMP()))) 
          AND TX_DATETIME < DATEADD(day, -180, CURRENT_TIMESTAMP())
          AND EMAIL IS NOT NULL
          AND MODEL_SCORE IS NOT NULL
          AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        GROUP BY EMAIL
        HAVING COUNT(*) >= 1
            AND AVG(MODEL_SCORE) > 0.4
    )
    SELECT * FROM risk_calculations
    ORDER BY transaction_count DESC
    LIMIT 10
    """
    
    print("Testing MODEL_SCORE > 0.4 filter directly on Snowflake...")
    print()
    
    results = await client.execute_query_async(query)
    
    if results:
        print(f"✅ Found {len(results)} entities with AVG(MODEL_SCORE) > 0.4")
        print()
        print(f"{'Email':<40} {'Txs':<8} {'Avg Score':<12}")
        print("="*60)
        for r in results[:10]:
            email = r.get('ENTITY', r.get('entity', 'unknown'))
            tx_count = r.get('TRANSACTION_COUNT', r.get('transaction_count', 0))
            avg_score = r.get('AVG_RISK_SCORE', r.get('avg_risk_score', 0))
            print(f"{email:<40} {tx_count:<8} {avg_score:<12.3f}")
    else:
        print("❌ No results - filter is working (no entities have AVG(MODEL_SCORE) > 0.4)")
        print()
        print("Let's check if there's ANY data in this time window...")
        
        # Test without MODEL_SCORE filter
        query2 = """
        SELECT
            EMAIL as entity,
            COUNT(*) as transaction_count,
            AVG(MODEL_SCORE) as avg_risk_score
        FROM DBT.DBT_PROD.TXS
        WHERE TX_DATETIME >= DATEADD(day, -1, DATEADD(hour, -0, DATEADD(day, -180, CURRENT_TIMESTAMP()))) 
          AND TX_DATETIME < DATEADD(day, -180, CURRENT_TIMESTAMP())
          AND EMAIL IS NOT NULL
          AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        GROUP BY EMAIL
        ORDER BY transaction_count DESC
        LIMIT 10
        """
        
        results2 = await client.execute_query_async(query2)
        
        if results2:
            print(f"✅ Found {len(results2)} entities WITHOUT MODEL_SCORE filter")
            print()
            print(f"{'Email':<40} {'Txs':<8} {'Avg Score':<12}")
            print("="*60)
            for r in results2[:10]:
                email = r.get('ENTITY', r.get('entity', 'unknown'))
                tx_count = r.get('TRANSACTION_COUNT', r.get('transaction_count', 0))
                avg_score = r.get('AVG_RISK_SCORE', r.get('avg_risk_score', 0))
                print(f"{email:<40} {tx_count:<8} {avg_score:<12.3f}")
        else:
            print("❌ No data at all in this time window")
    
    await client.disconnect_async()

if __name__ == "__main__":
    asyncio.run(main())

