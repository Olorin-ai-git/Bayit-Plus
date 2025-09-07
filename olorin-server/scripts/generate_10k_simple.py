#!/usr/bin/env python3
"""
Generate 10,000 diverse records for Snowflake - Simplified version.
Focuses on essential columns for risk analysis.
"""

import os
import sys
import random
import snowflake.connector
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import string

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


def generate_transactions(num_records: int = 10000):
    """Generate simplified transaction records focusing on risk analysis."""
    
    print(f"\n📊 Generating {num_records:,} transactions...")
    
    transactions = []
    
    # Email pools by risk level
    low_risk_emails = [f"user{i}@company.com" for i in range(1, 201)]
    medium_risk_emails = [f"customer{i}@gmail.com" for i in range(1, 601)]
    high_risk_emails = [f"risky{i}@tempmail.com" for i in range(1, 201)]
    
    # Combine all emails
    all_emails = low_risk_emails + medium_risk_emails + high_risk_emails
    
    # Time range (last 90 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    tx_id = 100000
    
    for i in range(num_records):
        tx_id += 1
        
        # Select email and determine risk profile
        email = random.choice(all_emails)
        
        if email in low_risk_emails:
            # Low risk profile
            risk_score = round(random.uniform(0.01, 0.35), 4)
            amount = round(random.uniform(10, 500), 2)
            is_fraud = random.random() < 0.001  # 0.1% fraud rate
        elif email in medium_risk_emails:
            # Medium risk profile
            risk_score = round(random.uniform(0.30, 0.70), 4)
            amount = round(random.uniform(100, 5000), 2)
            is_fraud = random.random() < 0.02  # 2% fraud rate
        else:
            # High risk profile
            risk_score = round(random.uniform(0.65, 0.99), 4)
            amount = round(random.uniform(500, 25000), 2)
            is_fraud = random.random() < 0.15  # 15% fraud rate
        
        # Adjust risk score if fraudulent
        if is_fraud:
            risk_score = min(0.99, risk_score + 0.3)
        
        # Generate timestamp
        tx_datetime = start_date + timedelta(
            seconds=random.randint(0, int((end_date - start_date).total_seconds()))
        )
        
        # Generate other essential fields
        device_id = f"DEV_{hash(email) % 10000:05d}_{random.randint(1, 3)}"
        ip_address = f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        
        # Transaction status based on risk
        if risk_score > 0.85:
            tx_status = 'BLOCKED'
        elif risk_score > 0.7:
            tx_status = 'REVIEW'
        else:
            tx_status = 'COMPLETED'
        
        transaction = (
            f'TX{tx_id}',  # TX_ID_KEY
            tx_datetime,  # TX_DATETIME
            email,  # EMAIL
            device_id,  # DEVICE_ID
            ip_address,  # IP_ADDRESS
            amount,  # PAID_AMOUNT_VALUE
            risk_score,  # MODEL_SCORE
            is_fraud,  # IS_FRAUD_TX
            'PURCHASE',  # TX_TYPE
            tx_status  # TX_STATUS
        )
        
        transactions.append(transaction)
        
        if (i + 1) % 1000 == 0:
            print(f"   Generated {i + 1:,} transactions...")
    
    return transactions


def insert_to_snowflake(transactions):
    """Insert transactions into Snowflake."""
    
    print(f"\n📤 Connecting to Snowflake...")
    
    conn = snowflake.connector.connect(
        account=os.getenv('SNOWFLAKE_ACCOUNT', '').replace('https://', '').replace('.snowflakecomputing.com', ''),
        user=os.getenv('SNOWFLAKE_USER'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        database='FRAUD_ANALYTICS',
        schema='PUBLIC',
        warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
        role='ACCOUNTADMIN'
    )
    
    cursor = conn.cursor()
    
    try:
        # Clear previous test data
        print("\n🗑️  Clearing existing large test datasets...")
        cursor.execute("DELETE FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED WHERE TX_ID_KEY LIKE 'TX1%'")
        
        print(f"\n📝 Inserting {len(transactions):,} transactions...")
        
        # Simple insert with just essential columns
        insert_sql = """
        INSERT INTO FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED 
        (TX_ID_KEY, TX_DATETIME, EMAIL, DEVICE_ID, IP_ADDRESS, 
         PAID_AMOUNT_VALUE, MODEL_SCORE, IS_FRAUD_TX, TX_TYPE, TX_STATUS)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # Batch insert
        batch_size = 1000
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i+batch_size]
            cursor.executemany(insert_sql, batch)
            print(f"   Inserted {min(i+batch_size, len(transactions)):,} / {len(transactions):,} records...")
        
        print("\n✅ All transactions inserted successfully!")
        
        # Show statistics
        print("\n📊 Verifying data...")
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT EMAIL) as unique_emails,
                MIN(TX_DATETIME) as earliest_tx,
                MAX(TX_DATETIME) as latest_tx,
                AVG(MODEL_SCORE) as avg_risk_score,
                SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count,
                AVG(PAID_AMOUNT_VALUE) as avg_amount,
                MAX(PAID_AMOUNT_VALUE) as max_amount,
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as total_risk_value
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
        """)
        
        stats = cursor.fetchone()
        
        print("\n" + "="*70)
        print("📈 DATABASE STATISTICS")
        print("="*70)
        print(f"Total Records: {stats[0]:,}")
        print(f"Unique Emails: {stats[1]:,}")
        print(f"Date Range: {stats[2]:%Y-%m-%d} to {stats[3]:%Y-%m-%d}")
        print(f"Average Risk Score: {stats[4]:.4f}")
        print(f"Fraud Transactions: {stats[5]:,} ({stats[5]/stats[0]*100:.2f}%)")
        print(f"Average Transaction: ${stats[6]:,.2f}")
        print(f"Maximum Transaction: ${stats[7]:,.2f}")
        print(f"Total Risk Value: ${stats[8]:,.2f}")
        
        # Show risk distribution
        print("\n📊 Risk Distribution:")
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN MODEL_SCORE < 0.3 THEN 'Low (0-0.3)'
                    WHEN MODEL_SCORE < 0.7 THEN 'Medium (0.3-0.7)'
                    ELSE 'High (0.7-1.0)'
                END as risk_level,
                COUNT(*) as count,
                AVG(PAID_AMOUNT_VALUE) as avg_amount
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            GROUP BY risk_level
            ORDER BY risk_level
        """)
        
        for row in cursor.fetchall():
            print(f"   {row[0]:<20} {row[1]:>7,} transactions (avg: ${row[2]:,.2f})")
        
        # Show top 10% calculation
        print("\n🎯 TOP 10% RISK ENTITIES (Top Risk-Weighted Values):")
        
        cursor.execute("""
            WITH risk_calc AS (
                SELECT 
                    EMAIL,
                    COUNT(*) as tx_count,
                    SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value,
                    AVG(MODEL_SCORE) as avg_risk,
                    SUM(PAID_AMOUNT_VALUE) as total_amount,
                    SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count
                FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
                WHERE TX_DATETIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
                GROUP BY EMAIL
            ),
            ranked AS (
                SELECT *,
                    ROW_NUMBER() OVER (ORDER BY risk_value DESC) as rank,
                    COUNT(*) OVER() as total_entities
                FROM risk_calc
            )
            SELECT * FROM ranked
            WHERE rank <= CEIL(total_entities * 0.10)
            ORDER BY risk_value DESC
            LIMIT 10
        """)
        
        print(f"\n{'Rank':<5} {'Email':<30} {'Risk Value':<15} {'Txns':<6} {'Avg Risk':<10} {'Frauds'}")
        print("-"*80)
        
        for row in cursor.fetchall():
            email = row[0][:28] + '..' if len(row[0]) > 30 else row[0]
            print(f"{row[6]:<5} {email:<30} ${row[2]:<14,.2f} {row[1]:<6} {row[3]:<10.4f} {row[5]}")
        
    finally:
        cursor.close()
        conn.close()
    
    print("\n" + "="*70)
    print("✅ DATA GENERATION COMPLETE!")
    print("="*70)
    print("\nTest the top 10% query with:")
    print("  poetry run python scripts/get_top_risk_entities.py --time-window 30d")
    print("  poetry run python scripts/get_top_risk_entities.py --time-window 7d --top 5")
    print("  poetry run python scripts/get_top_risk_entities.py --group-by device_id")


def main():
    """Main function."""
    print("\n" + "="*70)
    print("🚀 GENERATING 10,000 TRANSACTION RECORDS (SIMPLIFIED)")
    print("="*70)
    
    # Generate transactions
    transactions = generate_transactions(10000)
    
    # Insert to Snowflake
    insert_to_snowflake(transactions)


if __name__ == "__main__":
    main()