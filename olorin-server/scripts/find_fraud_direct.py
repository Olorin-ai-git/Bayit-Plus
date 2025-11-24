#!/usr/bin/env python3
"""
Direct Snowflake Fraud Finder
Queries Snowflake directly without async complexity
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Try to import snowflake connector directly
try:
    import snowflake.connector
except ImportError:
    print("ERROR: snowflake-connector-python not installed")
    print("Install with: poetry add snowflake-connector-python")
    sys.exit(1)

# Connection details from env
account = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('.snowflakecomputing.com', '').replace('https://', '')
user = os.getenv('SNOWFLAKE_USER')
password = os.getenv('SNOWFLAKE_PASSWORD')
database = 'DBT'
schema = 'DBT_PROD'
table = 'TXS'
warehouse = os.getenv('SNOWFLAKE_WAREHOUSE', 'manual_review_agent_wh')

# Check if using private key auth
private_key_path = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', '/Users/olorin/Documents/rsa_key.p8')
use_private_key = os.path.exists(private_key_path)

print(f"")
print(f"╔{'═'*63}╗")
print(f"║{'DIRECT SNOWFLAKE FRAUD FINDER':^63}║")
print(f"╚{'═'*63}╝")
print(f"")

if not account or not user:
    print("ERROR: SNOWFLAKE_ACCOUNT and SNOWFLAKE_USER must be set in .env")
    sys.exit(1)

print(f"Connecting to Snowflake: {account}")
print(f"User: {user}")
print(f"Auth: {'Private Key' if use_private_key else 'Password'}")
print("")

# Connect
try:
    if use_private_key:
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import serialization
        
        with open(private_key_path, "rb") as key_file:
            p_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
                backend=default_backend()
            )
        
        pkb = p_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        conn = snowflake.connector.connect(
            user=user,
            account=account,
            private_key=pkb,
            warehouse=warehouse,
            database=database,
            schema=schema
        )
    else:
        conn = snowflake.connector.connect(
            user=user,
            password=password,
            account=account,
            warehouse=warehouse,
            database=database,
            schema=schema
        )
    
    print("✅ Connected to Snowflake")
    print("")
    
    # Search parameters
    days_to_search = int(os.getenv('DAYS_TO_SEARCH', '365'))
    start_offset_days = int(os.getenv('START_OFFSET_DAYS', '180'))
    
    print(f"Search Parameters:")
    print(f"  Start: {start_offset_days} days ago (~{start_offset_days/30:.1f} months)")
    print(f"  Duration: {days_to_search} days")
    print(f"  Window: 24 hours per iteration")
    print(f"")
    
    # Search backwards
    now = datetime.now()  # Using timezone-aware would be better but this works
    fraud_found = False
    current_offset = start_offset_days
    
    while current_offset < (start_offset_days + days_to_search) and not fraud_found:
        # Calculate 24H window
        window_end = now - timedelta(days=current_offset)
        window_start = window_end - timedelta(hours=24)
        
        # Query for fraud in this window
        query = f"""
        SELECT 
            EMAIL,
            COUNT(*) as total_txs,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
            SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as non_fraud_count
        FROM {database}.{schema}.{table}
        WHERE TX_DATETIME >= '{window_start.isoformat()}'
          AND TX_DATETIME < '{window_end.isoformat()}'
          AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
          AND EMAIL IS NOT NULL
        GROUP BY EMAIL
        HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
        ORDER BY fraud_count DESC
        LIMIT 10
        """
        
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        
        if results:
            fraud_found = True
            total_fraud = sum(row[2] for row in results)
            
            print(f"")
            print(f"🎉 FRAUD FOUND!")
            print(f"   Window: {window_start.date()} to {window_end.date()}")
            print(f"   Offset: {current_offset} days ago (~{current_offset/30:.1f} months)")
            print(f"   Entities with fraud: {len(results)}")
            print(f"   Total fraud transactions: {total_fraud}")
            print(f"")
            print(f"   Top entities:")
            for i, row in enumerate(results[:5], 1):
                email, total, fraud, clean = row
                print(f"   {i}. {email}: {fraud} fraud, {clean} clean ({total} total)")
            print(f"")
            print(f"{'━'*65}")
            print(f"")
            print(f"✅ To investigate these entities, update .env:")
            print(f"   ANALYZER_END_OFFSET_MONTHS={int(current_offset/30)}")
            print(f"   STARTUP_ANALYSIS_TOP_N_ENTITIES=5")
            print(f"")
            print(f"Then restart the server:")
            print(f"   poetry run python -m app.local_server")
            print(f"")
            
            # Save to file
            with open('fraud_window_found.txt', 'w') as f:
                f.write(f"ANALYZER_END_OFFSET_MONTHS={int(current_offset/30)}\n")
                f.write(f"# Found at {current_offset} days ago\n")
                f.write(f"# Window: {window_start.date()} to {window_end.date()}\n")
                f.write(f"# Entities with fraud: {len(results)}\n")
                for i, row in enumerate(results[:10], 1):
                    email, total, fraud, clean = row
                    f.write(f"# {i}. {email}: {fraud} fraud, {clean} clean\n")
            
            print(f"📄 Results saved to: fraud_window_found.txt")
            print(f"")
            break
        else:
            if current_offset % 10 == 0:
                print(f"[Day {current_offset}/{start_offset_days + days_to_search}] No fraud... continuing backwards")
            current_offset += 1
    
    if not fraud_found:
        print(f"")
        print(f"⚠️  No fraud found in {days_to_search} days")
        print(f"   Searched from {start_offset_days} to {current_offset} days ago")
        print(f"   Dataset appears to be very clean!")
        print(f"   Try searching further back or checking data quality")
        print(f"")
    
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

