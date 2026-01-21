import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient

async def count_txs():
    client = RealSnowflakeClient()
    await client.connect()
    
    # Define window and merchant
    merchant = "Eneba"
    start_date = "2024-12-04T23:41:32" # Iso format roughly
    end_date = "2025-06-02T23:41:32"
    
    query = f"""
    SELECT COUNT(*) as total_count 
    FROM {client.transactions_table}
    WHERE MERCHANT_NAME = '{merchant}'
    AND TX_DATETIME >= '{start_date}'
    AND TX_DATETIME < '{end_date}'
    """
    
    print(f"Executing query: {query}")
    
    results = await client.execute_query(query)
    print(f"Results: {results}")
    
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(count_txs())

