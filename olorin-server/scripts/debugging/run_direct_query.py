#!/usr/bin/env python3
"""
Direct database query using .env connection details.
Uses RealSnowflakeClient directly to avoid import issues.
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load .env file first
env_path = Path(__file__).parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env from {env_path}")
else:
    print(f"⚠️  No .env file found at {env_path}")
    sys.exit(1)

# Set to skip Firebase secrets BEFORE any imports
os.environ['USE_FIREBASE_SECRETS'] = 'false'

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Mock the secret manager before importing
import sys
from unittest.mock import MagicMock
sys.modules['app.service.secret_manager'] = MagicMock()

def main():
    print("\n" + "="*80)
    print("🔍 DIRECT DATABASE QUERY - IP: 38.252.156.103")
    print("="*80)
    
    # Get configuration from .env
    database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
    table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
    
    print(f"\n📋 Configuration from .env:")
    print(f"   Database: {database}")
    print(f"   Schema: {schema}")
    print(f"   Table: {table}")
    
    # Build full table name
    full_table_name = f"{database}.{schema}.{table}"
    ip_address = "38.252.156.103"
    
    try:
        # Import RealSnowflakeClient directly
        from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
        
        print(f"\n🔗 Connecting via RealSnowflakeClient...")
        client = RealSnowflakeClient()
        
        # Build queries
        count_query = f"SELECT COUNT(*) as total_count FROM {full_table_name} WHERE IP = '{ip_address}'"
        
        query = f"""
        SELECT
            TX_ID_KEY,
            EMAIL,
            IP,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_AMOUNT_CURRENCY,
            TX_DATETIME,
            PAYMENT_METHOD,
            CARD_BRAND,
            DEVICE_ID,
            USER_AGENT,
            IP_COUNTRY_CODE,
            IS_FRAUD_TX,
            MODEL_SCORE,
            NSURE_LAST_DECISION as MODEL_DECISION
        FROM {full_table_name}
        WHERE IP = '{ip_address}'
        ORDER BY TX_DATETIME DESC
        LIMIT 2000
        """
        
        print(f"\n🔍 Query:")
        print("-"*80)
        print(query.strip())
        print("-"*80)
        
        # Run count query
        print(f"\n📊 Running count query...")
        count_results = asyncio.run(client.execute_query(count_query))
        total_count = count_results[0].get('total_count', 0) if count_results else 0
        print(f"   ✅ Total transactions found: {total_count}")
        
        # Run main query
        print(f"\n📊 Running main query (LIMIT 2000)...")
        transactions = asyncio.run(client.execute_query(query))
        
        print(f"   ✅ Transactions returned: {len(transactions)}")
        
        if transactions:
            print(f"\n📋 Transaction Details (showing first 10):")
            print("="*80)
            for i, tx in enumerate(transactions[:10], 1):
                print(f"\n   Transaction {i}:")
                print(f"      TX_ID_KEY: {tx.get('TX_ID_KEY')}")
                print(f"      EMAIL: {tx.get('EMAIL')}")
                print(f"      IP: {tx.get('IP')}")
                print(f"      TX_DATETIME: {tx.get('TX_DATETIME')}")
                amount = tx.get('PAID_AMOUNT_VALUE_IN_CURRENCY')
                currency = tx.get('PAID_AMOUNT_CURRENCY')
                print(f"      AMOUNT: {amount} {currency}")
                print(f"      MODEL_SCORE: {tx.get('MODEL_SCORE')}")
                print(f"      IS_FRAUD_TX: {tx.get('IS_FRAUD_TX')}")
                print(f"      DECISION: {tx.get('MODEL_DECISION')}")
            
            if len(transactions) > 10:
                print(f"\n   ... and {len(transactions) - 10} more transactions")
        else:
            print(f"   ⚠️  No transactions found!")
        
        print(f"\n" + "="*80)
        print(f"✅ Query Complete!")
        print(f"   Total matching transactions: {total_count}")
        print(f"   Transactions returned (LIMIT 2000): {len(transactions)}")
        print("="*80)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
