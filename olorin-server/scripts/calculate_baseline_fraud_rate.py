#!/usr/bin/env python3
"""
Calculate baseline fraud rate in the dataset to understand if 2% precision is good or bad
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

ACCOUNT = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('.snowflakecomputing.com', '').replace('https://', '')
USER = os.getenv('SNOWFLAKE_USER')
DATABASE = 'DBT'
SCHEMA = 'DBT_PROD'
WAREHOUSE = os.getenv('SNOWFLAKE_WAREHOUSE', 'manual_review_agent_wh')
PRIVATE_KEY_PATH = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', '/Users/olorin/Documents/rsa_key.p8')

def get_connection():
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        p_key = serialization.load_pem_private_key(
            key_file.read(), password=None, backend=default_backend()
        )
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return snowflake.connector.connect(
        user=USER, account=ACCOUNT, private_key=pkb,
        warehouse=WAREHOUSE, database=DATABASE, schema=SCHEMA
    )

def main():
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--start-offset-days', type=int, default=180)
    parser.add_argument('--num-windows', type=int, default=30)
    args = parser.parse_args()
    
    print(f"\n╔{'═'*78}╗")
    print(f"║{'BASELINE FRAUD RATE CALCULATOR':^78}║")
    print(f"╚{'═'*78}╝\n")
    
    conn = get_connection()
    
    try:
        # Calculate for each window
        for i in range(args.num_windows):
            offset = args.start_offset_days + i
            now = datetime.now()
            window_end = now - timedelta(days=offset)
            window_start = window_end - timedelta(hours=24)
            
            # Get total entities and fraud entities
            query = f"""
            SELECT 
                COUNT(DISTINCT EMAIL) as total_entities,
                SUM(CASE WHEN has_fraud THEN 1 ELSE 0 END) as fraud_entities,
                SUM(total_txs) as total_txs,
                SUM(fraud_txs) as total_fraud_txs
            FROM (
                SELECT 
                    EMAIL,
                    COUNT(*) as total_txs,
                    SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_txs,
                    CASE WHEN SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END as has_fraud
                FROM {DATABASE}.{SCHEMA}.TXS
                WHERE TX_DATETIME >= '{window_start.isoformat()}'
                  AND TX_DATETIME < '{window_end.isoformat()}'
                  AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
                  AND EMAIL IS NOT NULL
                GROUP BY EMAIL
            )
            """
            
            cursor = conn.cursor()
            cursor.execute(query)
            result = cursor.fetchone()
            cursor.close()
            
            if result:
                total_entities, fraud_entities, total_txs, total_fraud_txs = result
                
                if total_entities and total_entities > 0:
                    entity_fraud_rate = (fraud_entities / total_entities) * 100
                    tx_fraud_rate = (total_fraud_txs / total_txs) * 100 if total_txs > 0 else 0
                    
                    if fraud_entities > 0:
                        print(f"Window {i+1} ({window_start.date()}):")
                        print(f"  Total entities: {total_entities:,}")
                        print(f"  Fraud entities: {fraud_entities} ({entity_fraud_rate:.2f}%)")
                        print(f"  Total transactions: {total_txs:,}")
                        print(f"  Fraud transactions: {total_fraud_txs} ({tx_fraud_rate:.2f}%)")
                        print()
        
        # Calculate aggregate for all windows
        offset_start = args.start_offset_days
        offset_end = args.start_offset_days + args.num_windows
        
        now = datetime.now()
        range_end = now - timedelta(days=offset_start)
        range_start = now - timedelta(days=offset_end)
        
        query = f"""
        SELECT 
            COUNT(DISTINCT EMAIL) as total_entities,
            SUM(CASE WHEN has_fraud THEN 1 ELSE 0 END) as fraud_entities,
            SUM(total_txs) as total_txs,
            SUM(fraud_txs) as total_fraud_txs
        FROM (
            SELECT 
                EMAIL,
                COUNT(*) as total_txs,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_txs,
                CASE WHEN SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END as has_fraud
            FROM {DATABASE}.{SCHEMA}.TXS
            WHERE TX_DATETIME >= '{range_start.isoformat()}'
              AND TX_DATETIME < '{range_end.isoformat()}'
              AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
              AND EMAIL IS NOT NULL
            GROUP BY EMAIL
        )
        """
        
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            total_entities, fraud_entities, total_txs, total_fraud_txs = result
            
            entity_fraud_rate = (fraud_entities / total_entities) * 100 if total_entities > 0 else 0
            tx_fraud_rate = (total_fraud_txs / total_txs) * 100 if total_txs > 0 else 0
            
            print(f"{'='*78}")
            print(f"AGGREGATE BASELINE (all {args.num_windows} windows)")
            print(f"{'='*78}")
            print(f"Total entities: {total_entities:,}")
            print(f"Fraud entities: {fraud_entities} ({entity_fraud_rate:.2f}%)")
            print(f"Total transactions: {total_txs:,}")
            print(f"Fraud transactions: {total_fraud_txs} ({tx_fraud_rate:.2f}%)")
            print()
            print(f"BASELINE ENTITY FRAUD RATE: {entity_fraud_rate:.2f}%")
            print(f"BASELINE TRANSACTION FRAUD RATE: {tx_fraud_rate:.2f}%")
            print()
            print(f"{'─'*78}")
            print(f"INTERPRETATION:")
            print(f"{'─'*78}")
            print(f"If we randomly select 50 entities, we'd expect:")
            print(f"  • {50 * entity_fraud_rate / 100:.1f} entities with fraud")
            print(f"  • Precision: {entity_fraud_rate:.2f}%")
            print()
            print(f"Our best analyzer achieved:")
            print(f"  • 39/1500 fraud entities = 2.6% precision")
            print()
            if entity_fraud_rate > 0:
                lift = 2.6 / entity_fraud_rate
                print(f"LIFT: {lift:.1f}x better than random!")
                print()
                if lift > 2:
                    print(f"✅ Analyzer is significantly better than random")
                elif lift > 1.5:
                    print(f"⚠️  Analyzer is somewhat better than random")
                else:
                    print(f"❌ Analyzer is barely better than random")
            print(f"{'='*78}\n")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()

