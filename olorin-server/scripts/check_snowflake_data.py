#!/usr/bin/env python3
"""
Check what data exists in Snowflake table.
"""

import asyncio
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def main():
    print("\n" + "="*70)
    print("📊 CHECKING SNOWFLAKE DATA")
    print("="*70)
    
    client = SnowflakeClient()
    await client.connect()
    
    # Check total records
    print("\n1. Total Records:")
    query1 = "SELECT COUNT(*) as total FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED"
    result1 = await client.execute_query(query1)
    print(f"   Total records: {result1[0]['TOTAL'] if result1 else 0}")
    
    # Check data by email
    print("\n2. Records by Email:")
    query2 = """
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        SUM(PAID_AMOUNT_VALUE) as total_amount,
        AVG(MODEL_SCORE) as avg_risk,
        SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    GROUP BY EMAIL
    ORDER BY risk_value DESC
    """
    result2 = await client.execute_query(query2)
    
    if result2:
        print(f"   {'Email':<30} {'Txns':<6} {'Amount':<12} {'Avg Risk':<10} {'Risk Value'}")
        print("   " + "-"*75)
        for row in result2:
            email = row.get('EMAIL') or 'None'
            print(f"   {email:<30} {row['TX_COUNT']:<6} ${row['TOTAL_AMOUNT']:<11,.2f} {row['AVG_RISK']:<10.4f} ${row['RISK_VALUE']:,.2f}")
    else:
        print("   No data found")
    
    # Check time range of data
    print("\n3. Time Range of Data:")
    query3 = """
    SELECT 
        MIN(TX_DATETIME) as earliest,
        MAX(TX_DATETIME) as latest,
        DATEDIFF(hour, MIN(TX_DATETIME), MAX(TX_DATETIME)) as hours_span
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    """
    result3 = await client.execute_query(query3)
    if result3 and result3[0]:
        print(f"   Earliest: {result3[0]['EARLIEST']}")
        print(f"   Latest: {result3[0]['LATEST']}")
        print(f"   Span: {result3[0]['HOURS_SPAN']} hours")
    
    # Check sample of actual data
    print("\n4. Sample Records:")
    query4 = """
    SELECT 
        TX_ID_KEY,
        EMAIL,
        PAID_AMOUNT_VALUE,
        MODEL_SCORE,
        IS_FRAUD_TX,
        TX_DATETIME
    FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    LIMIT 5
    """
    result4 = await client.execute_query(query4)
    if result4:
        for row in result4:
            print(f"   {row['TX_ID_KEY']}: {row['EMAIL']} - ${row['PAID_AMOUNT_VALUE']:.2f} (Risk: {row['MODEL_SCORE']:.2f})")
    
    await client.disconnect()
    print("\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(main())