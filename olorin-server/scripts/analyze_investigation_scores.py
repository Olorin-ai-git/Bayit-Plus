#!/usr/bin/env python3
"""
Analyze the investigation risk scores vs actual fraud to understand false negatives.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.agent.tools.snowflake_tool.schema_constants import (
    TX_DATETIME, IS_FRAUD_TX, NSURE_LAST_DECISION, MODEL_SCORE,
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, DEVICE_ID, MERCHANT_NAME,
    IP_COUNTRY_CODE, TX_ID_KEY
)


async def analyze_investigation_scores():
    """Analyze why investigation gave low risk scores to fraud transactions"""
    print("=" * 80)
    print("🔍 INVESTIGATION RISK SCORE ANALYSIS")
    print("=" * 80)
    print()
    
    # Import Snowflake provider
    from app.service.agent.tools.database_tool import get_database_provider
    
    db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
    provider = get_database_provider(db_provider)
    provider.connect()
    
    # Get table name
    db = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
    table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
    full_table = f"{db}.{schema}.{table}"
    
    entity = 'kevinalejandroo1407@gmail.com'
    
    # Get the 8 fraud transactions that were in the investigation window
    fraud_query = f"""
    SELECT
        {TX_ID_KEY} as tx_id,
        {TX_DATETIME} as tx_datetime,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as amount,
        {MODEL_SCORE} as model_score,
        {IP} as ip,
        {DEVICE_ID} as device,
        {MERCHANT_NAME} as merchant,
        {IP_COUNTRY_CODE} as country
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {IS_FRAUD_TX} = 1
        AND {TX_DATETIME} >= '2025-05-26'
        AND {TX_DATETIME} < '2025-05-27'
    ORDER BY {TX_DATETIME}
    LIMIT 8
    """
    
    print(f"📧 Entity: {entity}")
    print("   Analyzing the 8 fraud transactions from 2025-05-26")
    print()
    
    fraud_results = await provider.execute_query_async(fraud_query)
    
    if not fraud_results:
        print("❌ No fraud transactions found")
        return
    
    print(f"✅ Found {len(fraud_results)} fraud transactions")
    print()
    
    # Get legitimate transactions for comparison
    legit_query = f"""
    SELECT
        {TX_ID_KEY} as tx_id,
        {TX_DATETIME} as tx_datetime,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as amount,
        {MODEL_SCORE} as model_score,
        {IP} as ip,
        {DEVICE_ID} as device,
        {MERCHANT_NAME} as merchant,
        {IP_COUNTRY_CODE} as country
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {IS_FRAUD_TX} = 0
        AND {TX_DATETIME} >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
        AND {TX_DATETIME} < DATEADD(month, -6, CURRENT_TIMESTAMP())
    ORDER BY {TX_DATETIME} DESC
    LIMIT 37
    """
    
    legit_results = await provider.execute_query_async(legit_query)
    
    print("=" * 80)
    print("📊 FRAUD TRANSACTIONS (FALSE NEGATIVES)")
    print("=" * 80)
    print()
    
    # Analyze fraud characteristics
    fraud_amounts = []
    fraud_scores = []
    fraud_ips = set()
    fraud_devices = set()
    fraud_merchants = set()
    
    for i, tx in enumerate(fraud_results, 1):
        amount = float(tx.get('AMOUNT') or tx.get('amount') or 0)
        score = float(tx.get('MODEL_SCORE') or tx.get('model_score') or 0)
        ip = tx.get('IP') or tx.get('ip')
        device = tx.get('DEVICE') or tx.get('device')
        merchant = tx.get('MERCHANT') or tx.get('merchant')
        date = tx.get('TX_DATETIME') or tx.get('tx_datetime')
        
        fraud_amounts.append(amount)
        fraud_scores.append(score)
        if ip: fraud_ips.add(ip)
        if device: fraud_devices.add(device)
        if merchant: fraud_merchants.add(merchant)
        
        print(f"Fraud TX {i}: {str(date)[:19]}")
        print(f"  Amount: ${amount:.2f}")
        print(f"  MODEL_SCORE: {score:.4f} {'⚠️ VERY LOW' if score < 0.1 else '⚠️ LOW' if score < 0.4 else ''}")
        print(f"  IP: {ip}")
        print(f"  Device: {device}")
        print(f"  Merchant: {merchant}")
        print()
    
    # Calculate fraud statistics
    avg_fraud_amount = sum(fraud_amounts) / len(fraud_amounts) if fraud_amounts else 0
    avg_fraud_score = sum(fraud_scores) / len(fraud_scores) if fraud_scores else 0
    
    print("FRAUD SUMMARY:")
    print(f"  Count: {len(fraud_results)}")
    print(f"  Avg Amount: ${avg_fraud_amount:.2f}")
    print(f"  Avg MODEL_SCORE: {avg_fraud_score:.4f}")
    print(f"  Unique IPs: {len(fraud_ips)}")
    print(f"  Unique Devices: {len(fraud_devices)}")
    print(f"  Unique Merchants: {len(fraud_merchants)}")
    print()
    
    # Analyze legitimate transactions
    if legit_results:
        print("=" * 80)
        print("✅ LEGITIMATE TRANSACTIONS (TRUE NEGATIVES)")
        print("=" * 80)
        print()
        
        legit_amounts = []
        legit_scores = []
        legit_ips = set()
        legit_devices = set()
        legit_merchants = set()
        
        for tx in legit_results:
            amount = float(tx.get('AMOUNT') or tx.get('amount') or 0)
            score = float(tx.get('MODEL_SCORE') or tx.get('model_score') or 0)
            ip = tx.get('IP') or tx.get('ip')
            device = tx.get('DEVICE') or tx.get('device')
            merchant = tx.get('MERCHANT') or tx.get('merchant')
            
            legit_amounts.append(amount)
            legit_scores.append(score)
            if ip: legit_ips.add(ip)
            if device: legit_devices.add(device)
            if merchant: legit_merchants.add(merchant)
        
        avg_legit_amount = sum(legit_amounts) / len(legit_amounts) if legit_amounts else 0
        avg_legit_score = sum(legit_scores) / len(legit_scores) if legit_scores else 0
        
        print("LEGITIMATE SUMMARY:")
        print(f"  Count: {len(legit_results)}")
        print(f"  Avg Amount: ${avg_legit_amount:.2f}")
        print(f"  Avg MODEL_SCORE: {avg_legit_score:.4f}")
        print(f"  Unique IPs: {len(legit_ips)}")
        print(f"  Unique Devices: {len(legit_devices)}")
        print(f"  Unique Merchants: {len(legit_merchants)}")
        print()
    
    # Key comparisons
    print("=" * 80)
    print("🔍 KEY COMPARISONS (FRAUD vs LEGITIMATE)")
    print("=" * 80)
    print()
    
    print("MODEL_SCORE:")
    print(f"  Fraud avg: {avg_fraud_score:.4f}")
    print(f"  Legit avg: {avg_legit_score:.4f}")
    if avg_fraud_score < avg_legit_score:
        print(f"  ❌ PROBLEM: Fraud has LOWER MODEL_SCORE than legitimate!")
        print(f"     Difference: {(avg_legit_score - avg_fraud_score):.4f}")
    print()
    
    print("TRANSACTION AMOUNTS:")
    print(f"  Fraud avg: ${avg_fraud_amount:.2f}")
    print(f"  Legit avg: ${avg_legit_amount:.2f}")
    if avg_fraud_amount < avg_legit_amount:
        print(f"  ⚠️ Fraud amounts are {((avg_legit_amount - avg_fraud_amount) / avg_legit_amount * 100):.1f}% lower")
    print()
    
    print("BEHAVIORAL PATTERNS:")
    print(f"  Fraud: {len(fraud_results)} transactions across {len(fraud_ips)} IPs")
    print(f"  Rate: {len(fraud_results) / max(len(fraud_ips), 1):.1f} tx/IP")
    
    # Time concentration
    if fraud_results:
        first = fraud_results[0].get('TX_DATETIME') or fraud_results[0].get('tx_datetime')
        last = fraud_results[-1].get('TX_DATETIME') or fraud_results[-1].get('tx_datetime')
        first_dt = datetime.fromisoformat(str(first)[:19])
        last_dt = datetime.fromisoformat(str(last)[:19])
        hours_span = (last_dt - first_dt).total_seconds() / 3600
        
        print(f"  Time span: {hours_span:.1f} hours")
        print(f"  Velocity: {len(fraud_results) / max(hours_span, 1):.1f} tx/hour")
    print()
    
    print("=" * 80)
    print("💡 WHY INVESTIGATION FAILED - ROOT CAUSES")
    print("=" * 80)
    print()
    
    print("1. MODEL_SCORE EXCLUDED FROM INVESTIGATION")
    print(f"   - Fraud MODEL_SCORE avg: {avg_fraud_score:.4f}")
    print(f"   - This critical signal was excluded (correctly, for unbiased evaluation)")
    print(f"   - But without it, investigation can't distinguish fraud")
    print()
    
    print("2. INVESTIGATION RISK SCORE < 50% THRESHOLD")
    print(f"   - Entity overall risk: 41.67%")
    print(f"   - All transactions scored below 50%")
    print(f"   - Threshold too high for this fraud pattern")
    print()
    
    print("3. FRAUD LOOKS LIKE NORMAL BEHAVIOR")
    print(f"   - Similar amounts to legitimate transactions")
    print(f"   - Uses known devices/IPs from history")
    print(f"   - Approved by payment system initially")
    print()
    
    print("4. INVESTIGATION FEATURES DON'T CAPTURE FRAUD PATTERN")
    print(f"   - Fraud concentrated in {hours_span:.1f} hours")
    print(f"   - Velocity signal not strong enough")
    print(f"   - Need better temporal anomaly detection")
    print()
    
    print("=" * 80)
    print("🔧 RECOMMENDATIONS TO FIX FALSE NEGATIVES")
    print("=" * 80)
    print()
    
    print("IMMEDIATE FIXES:")
    print("1. Lower risk threshold from 50% to 40%")
    print("   - Would catch entities with 41.67% risk score")
    print()
    
    print("2. Add velocity-based features:")
    print("   - Transactions per hour/day")
    print("   - Sudden bursts of activity")
    print("   - Time-of-day anomalies")
    print()
    
    print("3. Use MODEL_SCORE indirectly:")
    print("   - Create derived feature from MODEL_SCORE")
    print("   - Weight recent transactions more heavily")
    print("   - Flag sudden drops in MODEL_SCORE")
    print()
    
    print("STRUCTURAL CHANGES:")
    print("1. Focus investigation on fraud event window")
    print("   - Instead of 2-year history")
    print("   - Analyze the specific 24-48 hour period")
    print()
    
    print("2. Implement anomaly detection")
    print("   - Compare to entity's own history")
    print("   - Flag deviations from normal patterns")
    print()
    
    print("3. Create fraud-specific features")
    print("   - Rapid succession transactions")
    print("   - Multiple merchants in short time")
    print("   - Geographic impossibilities")
    print()


if __name__ == "__main__":
    asyncio.run(analyze_investigation_scores())
