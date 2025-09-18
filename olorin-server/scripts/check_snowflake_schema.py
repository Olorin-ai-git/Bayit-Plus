#!/usr/bin/env python
"""Check Snowflake table schema."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Set environment variables
os.environ["USE_SNOWFLAKE"] = "true"

import snowflake.connector

def main():
    """Check Snowflake table schema."""
    
    # Get settings from environment variables
    account = os.getenv('SNOWFLAKE_ACCOUNT')
    user = os.getenv('SNOWFLAKE_USER')
    password = os.getenv('SNOWFLAKE_PASSWORD')
    database = os.getenv('SNOWFLAKE_DATABASE', 'OLORIN_FRAUD_DB')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
    warehouse = os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH')
    role = os.getenv('SNOWFLAKE_ROLE', 'FRAUD_ANALYST_ROLE')
    
    print(f"Connecting to Snowflake account: {account}")
    
    # Create connection
    conn = snowflake.connector.connect(
        account=account,
        user=user,
        password=password,
        database=database,
        schema=schema,
        warehouse=warehouse,
        role=role
    )
    
    try:
        cursor = conn.cursor()
        
        # Get column information
        table_name = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')
        query = f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND table_schema = '{schema}'
        AND table_catalog = '{database}'
        ORDER BY ordinal_position
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"Columns in {table_name} table:")
        print("-" * 60)
        for col_name, data_type, nullable in results:
            print(f"  {col_name:<30} {data_type:<20} {'NULL' if nullable == 'YES' else 'NOT NULL'}")
        
        # Also check if GMV exists
        print("\n" + "-" * 60)
        if any(col[0] == 'GMV' for col in results):
            print("✅ GMV column exists")
        else:
            print("❌ GMV column does NOT exist")
            
        # Check for similar columns
        print("\nColumns that might be GMV equivalent:")
        for col_name, data_type, _ in results:
            if 'AMOUNT' in col_name.upper() or 'VALUE' in col_name.upper() or 'TOTAL' in col_name.upper():
                print(f"  - {col_name} ({data_type})")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()