#!/usr/bin/env python3
"""
Add more test data to Snowflake with varied timestamps.
"""

import os
from datetime import datetime, timedelta
from pathlib import Path
import sys
import snowflake.connector
from dotenv import load_dotenv
import random

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


def main():
    print("\n" + "="*70)
    print("📝 ADDING MORE TEST DATA TO SNOWFLAKE")
    print("="*70)
    
    # Connect to Snowflake
    conn = snowflake.connector.connect(
        account=os.getenv('SNOWFLAKE_ACCOUNT', '').replace('https://', '').replace('.snowflakecomputing.com', ''),
        user=os.getenv('SNOWFLAKE_USER'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        database='FRAUD_ANALYTICS',
        schema='PUBLIC',
        warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
        role=os.getenv('SNOWFLAKE_ROLE', 'FRAUD_ANALYST_ROLE')
    )
    
    cursor = conn.cursor()
    
    # Generate test data for the last 7 days
    test_data = []
    tx_id = 1000
    
    # High-risk entities (top 10%)
    high_risk_emails = [
        'fraudster1@darkweb.com',
        'scammer2@fake.com',
        'criminal3@stolen.com'
    ]
    
    # Medium-risk entities
    medium_risk_emails = [
        'suspicious1@gmail.com',
        'risky2@yahoo.com',
        'alert3@hotmail.com',
        'watch4@outlook.com'
    ]
    
    # Low-risk entities
    low_risk_emails = [
        'normal1@company.com',
        'regular2@business.com',
        'customer3@gmail.com',
        'user4@yahoo.com',
        'client5@outlook.com'
    ]
    
    now = datetime.now()
    
    # Generate transactions for each group
    for days_ago in range(7):
        tx_date = now - timedelta(days=days_ago)
        
        # High-risk transactions (high scores, high amounts)
        for email in high_risk_emails:
            for _ in range(random.randint(5, 10)):  # More transactions
                tx_id += 1
                amount = random.uniform(5000, 50000)
                risk_score = random.uniform(0.85, 0.99)
                test_data.append((
                    f'TX{tx_id}',
                    tx_date - timedelta(hours=random.randint(0, 23)),
                    email,
                    f'DEV{tx_id}',
                    f'192.168.{random.randint(1, 255)}.{random.randint(1, 255)}',
                    amount,
                    risk_score,
                    random.choice([True, False, False]),  # Some fraud
                    'PURCHASE',
                    'COMPLETED'
                ))
        
        # Medium-risk transactions
        for email in medium_risk_emails:
            for _ in range(random.randint(2, 5)):
                tx_id += 1
                amount = random.uniform(1000, 10000)
                risk_score = random.uniform(0.4, 0.7)
                test_data.append((
                    f'TX{tx_id}',
                    tx_date - timedelta(hours=random.randint(0, 23)),
                    email,
                    f'DEV{tx_id}',
                    f'192.168.{random.randint(1, 255)}.{random.randint(1, 255)}',
                    amount,
                    risk_score,
                    False,
                    'PURCHASE',
                    'COMPLETED'
                ))
        
        # Low-risk transactions
        for email in low_risk_emails:
            for _ in range(random.randint(1, 3)):
                tx_id += 1
                amount = random.uniform(10, 1000)
                risk_score = random.uniform(0.01, 0.3)
                test_data.append((
                    f'TX{tx_id}',
                    tx_date - timedelta(hours=random.randint(0, 23)),
                    email,
                    f'DEV{tx_id}',
                    f'192.168.{random.randint(1, 255)}.{random.randint(1, 255)}',
                    amount,
                    risk_score,
                    False,
                    'PURCHASE',
                    'COMPLETED'
                ))
    
    # Insert the data
    print(f"\nInserting {len(test_data)} transactions...")
    
    insert_sql = """
    INSERT INTO FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED 
    (TX_ID_KEY, TX_DATETIME, EMAIL, DEVICE_ID, IP_ADDRESS, 
     PAID_AMOUNT_VALUE, MODEL_SCORE, IS_FRAUD_TX, TX_TYPE, TX_STATUS)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    cursor.executemany(insert_sql, test_data)
    
    print(f"✅ Successfully inserted {len(test_data)} transactions")
    
    # Verify the data
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT EMAIL) as unique_emails,
            MIN(TX_DATETIME) as earliest,
            MAX(TX_DATETIME) as latest,
            AVG(MODEL_SCORE) as avg_risk,
            SUM(PAID_AMOUNT_VALUE) as total_amount
        FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
    """)
    
    stats = cursor.fetchone()
    print("\n📊 Updated Database Statistics:")
    print(f"   Total Transactions: {stats[0]:,}")
    print(f"   Unique Emails: {stats[1]}")
    print(f"   Date Range: {stats[2]} to {stats[3]}")
    print(f"   Average Risk Score: {stats[4]:.4f}")
    print(f"   Total Transaction Amount: ${stats[5]:,.2f}")
    
    # Show top risk entities
    cursor.execute("""
        SELECT 
            EMAIL,
            COUNT(*) as tx_count,
            SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_value,
            AVG(MODEL_SCORE) as avg_risk
        FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
        WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
        GROUP BY EMAIL
        ORDER BY risk_value DESC
        LIMIT 5
    """)
    
    print("\n🎯 Top 5 Risk Entities (Last 7 Days):")
    print(f"   {'Email':<30} {'Txns':<6} {'Risk Value':<15} {'Avg Risk'}")
    print("   " + "-"*70)
    
    for row in cursor.fetchall():
        print(f"   {row[0]:<30} {row[1]:<6} ${row[2]:<14,.2f} {row[3]:.4f}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*70)
    print("✅ Test data added successfully!")
    print("Now you can run: poetry run python scripts/get_top_risk_entities.py")
    print("="*70)


if __name__ == "__main__":
    main()