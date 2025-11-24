#!/usr/bin/env python3
"""
Analyze false negatives - why did investigations fail to detect confirmed fraud?
This script will compare fraud transactions with their investigation risk scores.
"""

import asyncio
import json
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


async def analyze_false_negatives():
    """Analyze why fraud transactions were not detected"""
    print("=" * 80)
    print("🔍 FALSE NEGATIVE ANALYSIS - WHY FRAUD WAS MISSED")
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
    
    # Analyze kevinalejandroo1407@gmail.com - the entity we investigated
    entity = 'kevinalejandroo1407@gmail.com'
    
    print(f"📧 Analyzing entity: {entity}")
    print(f"   Investigation showed: 8 false negatives (fraud missed)")
    print()
    
    # Get the fraud transactions for this entity
    fraud_query = f"""
    SELECT
        {TX_ID_KEY} as tx_id,
        {TX_DATETIME} as tx_datetime,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as amount,
        {MODEL_SCORE} as model_score,
        {IP} as ip,
        {DEVICE_ID} as device,
        {MERCHANT_NAME} as merchant,
        {IP_COUNTRY_CODE} as country,
        {IS_FRAUD_TX} as is_fraud
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {IS_FRAUD_TX} = 1
        AND {TX_DATETIME} >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
        AND {TX_DATETIME} < DATEADD(month, -6, CURRENT_TIMESTAMP())
    ORDER BY {TX_DATETIME}
    """
    
    print("🔍 Fetching fraud transactions...")
    fraud_results = await provider.execute_query_async(fraud_query)
    
    if not fraud_results:
        print("⚠️ No fraud transactions found for this entity in the investigation window")
        return
    
    print(f"✅ Found {len(fraud_results)} fraud transactions")
    print()
    
    # Get all transactions for comparison
    all_query = f"""
    SELECT
        {TX_ID_KEY} as tx_id,
        {TX_DATETIME} as tx_datetime,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as amount,
        {MODEL_SCORE} as model_score,
        {IP} as ip,
        {DEVICE_ID} as device,
        {MERCHANT_NAME} as merchant,
        {IP_COUNTRY_CODE} as country,
        {IS_FRAUD_TX} as is_fraud
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {TX_DATETIME} >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
        AND {TX_DATETIME} < DATEADD(month, -6, CURRENT_TIMESTAMP())
    ORDER BY {TX_DATETIME}
    """
    
    all_results = await provider.execute_query_async(all_query)
    
    # Analyze fraud vs non-fraud characteristics
    fraud_txs = [r for r in all_results if (r.get('IS_FRAUD') or r.get('is_fraud')) == 1]
    clean_txs = [r for r in all_results if (r.get('IS_FRAUD') or r.get('is_fraud')) == 0]
    
    print("=" * 80)
    print("📊 TRANSACTION CHARACTERISTICS COMPARISON")
    print("=" * 80)
    print()
    
    # Calculate statistics
    def get_stats(txs):
        if not txs:
            return {}
        amounts = [float(t.get('AMOUNT') or t.get('amount') or 0) for t in txs]
        scores = [float(t.get('MODEL_SCORE') or t.get('model_score') or 0) for t in txs]
        ips = set([t.get('IP') or t.get('ip') for t in txs])
        devices = set([t.get('DEVICE') or t.get('device') for t in txs])
        merchants = set([t.get('MERCHANT') or t.get('merchant') for t in txs])
        countries = set([t.get('COUNTRY') or t.get('country') for t in txs])
        
        return {
            'count': len(txs),
            'avg_amount': sum(amounts) / len(amounts) if amounts else 0,
            'max_amount': max(amounts) if amounts else 0,
            'min_amount': min(amounts) if amounts else 0,
            'avg_model_score': sum(scores) / len(scores) if scores else 0,
            'max_model_score': max(scores) if scores else 0,
            'min_model_score': min(scores) if scores else 0,
            'unique_ips': len(ips),
            'unique_devices': len(devices),
            'unique_merchants': len(merchants),
            'unique_countries': len(countries)
        }
    
    fraud_stats = get_stats(fraud_txs)
    clean_stats = get_stats(clean_txs)
    
    print("FRAUD TRANSACTIONS (False Negatives):")
    print(f"  Count: {fraud_stats.get('count', 0)}")
    print(f"  Amount: ${fraud_stats.get('avg_amount', 0):.2f} avg (${fraud_stats.get('min_amount', 0):.2f} - ${fraud_stats.get('max_amount', 0):.2f})")
    print(f"  MODEL_SCORE: {fraud_stats.get('avg_model_score', 0):.4f} avg ({fraud_stats.get('min_model_score', 0):.4f} - {fraud_stats.get('max_model_score', 0):.4f})")
    print(f"  Unique IPs: {fraud_stats.get('unique_ips', 0)}")
    print(f"  Unique Devices: {fraud_stats.get('unique_devices', 0)}")
    print(f"  Unique Merchants: {fraud_stats.get('unique_merchants', 0)}")
    print(f"  Unique Countries: {fraud_stats.get('unique_countries', 0)}")
    print()
    
    print("LEGITIMATE TRANSACTIONS (True Negatives):")
    print(f"  Count: {clean_stats.get('count', 0)}")
    print(f"  Amount: ${clean_stats.get('avg_amount', 0):.2f} avg (${clean_stats.get('min_amount', 0):.2f} - ${clean_stats.get('max_amount', 0):.2f})")
    print(f"  MODEL_SCORE: {clean_stats.get('avg_model_score', 0):.4f} avg ({clean_stats.get('min_model_score', 0):.4f} - {clean_stats.get('max_model_score', 0):.4f})")
    print(f"  Unique IPs: {clean_stats.get('unique_ips', 0)}")
    print(f"  Unique Devices: {clean_stats.get('unique_devices', 0)}")
    print(f"  Unique Merchants: {clean_stats.get('unique_merchants', 0)}")
    print(f"  Unique Countries: {clean_stats.get('unique_countries', 0)}")
    print()
    
    # Show individual fraud transactions
    print("=" * 80)
    print("🔴 FRAUD TRANSACTIONS DETAILS (Why Were These Missed?)")
    print("=" * 80)
    print()
    
    for i, tx in enumerate(fraud_txs, 1):
        tx_date = tx.get('TX_DATETIME') or tx.get('tx_datetime')
        amount = float(tx.get('AMOUNT') or tx.get('amount') or 0)
        score = float(tx.get('MODEL_SCORE') or tx.get('model_score') or 0)
        ip = tx.get('IP') or tx.get('ip')
        device = tx.get('DEVICE') or tx.get('device')
        merchant = tx.get('MERCHANT') or tx.get('merchant')
        
        print(f"Fraud Transaction {i}:")
        print(f"  Date: {str(tx_date)[:19]}")
        print(f"  Amount: ${amount:.2f}")
        print(f"  MODEL_SCORE: {score:.4f} {'⚠️ LOW' if score < 0.4 else ''}")
        print(f"  IP: {ip}")
        print(f"  Device: {device}")
        print(f"  Merchant: {merchant}")
        print()
    
    # Analyze patterns
    print("=" * 80)
    print("🔍 KEY INSIGHTS - WHY INVESTIGATION FAILED")
    print("=" * 80)
    print()
    
    # MODEL_SCORE analysis
    avg_fraud_score = fraud_stats.get('avg_model_score', 0)
    avg_clean_score = clean_stats.get('avg_model_score', 0)
    
    print("1. MODEL_SCORE ANALYSIS:")
    if avg_fraud_score < avg_clean_score:
        print(f"   ❌ Fraud transactions have LOWER MODEL_SCORE than legitimate!")
        print(f"      Fraud avg: {avg_fraud_score:.4f}")
        print(f"      Clean avg: {avg_clean_score:.4f}")
        print(f"   → Investigation excluded MODEL_SCORE (correctly, for unbiased evaluation)")
        print(f"   → But this means investigation can't use this signal")
    else:
        print(f"   ⚠️ Fraud MODEL_SCORE ({avg_fraud_score:.4f}) vs Clean ({avg_clean_score:.4f})")
    print()
    
    # Amount analysis
    print("2. TRANSACTION AMOUNTS:")
    if fraud_stats.get('avg_amount', 0) < clean_stats.get('avg_amount', 0):
        print(f"   ❌ Fraud amounts are LOWER than legitimate transactions")
        print(f"      Fraud avg: ${fraud_stats.get('avg_amount', 0):.2f}")
        print(f"      Clean avg: ${clean_stats.get('avg_amount', 0):.2f}")
        print(f"   → Small amounts may not trigger risk flags")
    print()
    
    # Diversity analysis
    print("3. BEHAVIORAL PATTERNS:")
    fraud_tx_per_ip = fraud_stats['count'] / max(fraud_stats['unique_ips'], 1)
    clean_tx_per_ip = clean_stats['count'] / max(clean_stats['unique_ips'], 1)
    
    if fraud_tx_per_ip > clean_tx_per_ip:
        print(f"   ⚠️ Fraud shows IP concentration: {fraud_tx_per_ip:.1f} tx/IP vs {clean_tx_per_ip:.1f} for clean")
    
    fraud_tx_per_device = fraud_stats['count'] / max(fraud_stats['unique_devices'], 1)
    clean_tx_per_device = clean_stats['count'] / max(clean_stats['unique_devices'], 1)
    
    if fraud_tx_per_device > clean_tx_per_device:
        print(f"   ⚠️ Fraud shows device concentration: {fraud_tx_per_device:.1f} tx/device vs {clean_tx_per_device:.1f} for clean")
    print()
    
    # Time pattern analysis
    print("4. TEMPORAL PATTERNS:")
    if fraud_txs:
        first_fraud = fraud_txs[0].get('TX_DATETIME') or fraud_txs[0].get('tx_datetime')
        last_fraud = fraud_txs[-1].get('TX_DATETIME') or fraud_txs[-1].get('tx_datetime')
        print(f"   Fraud period: {str(first_fraud)[:10]} to {str(last_fraud)[:10]}")
        
        # Check if fraud is clustered
        if len(fraud_txs) > 1:
            fraud_dates = [datetime.fromisoformat(str(tx.get('TX_DATETIME') or tx.get('tx_datetime'))[:19]) for tx in fraud_txs]
            fraud_span_days = (fraud_dates[-1] - fraud_dates[0]).days
            if fraud_span_days > 0:
                fraud_frequency = len(fraud_txs) / fraud_span_days
                print(f"   Fraud frequency: {fraud_frequency:.2f} transactions/day over {fraud_span_days} days")
    print()
    
    print("=" * 80)
    print("💡 ROOT CAUSES OF FALSE NEGATIVES")
    print("=" * 80)
    print()
    print("1. INVESTIGATION RISK SCORE < 50% THRESHOLD")
    print("   - Entity overall risk: 41.67%")
    print("   - All transactions scored below fraud threshold")
    print()
    print("2. FRAUD CHARACTERISTICS NOT DISTINCTIVE")
    print(f"   - Fraud MODEL_SCORE avg: {avg_fraud_score:.4f}")
    print(f"   - Clean MODEL_SCORE avg: {avg_clean_score:.4f}")
    print("   - Investigation cannot use MODEL_SCORE (excluded for unbiased evaluation)")
    print()
    print("3. APPROVED FRAUD LOOKS LEGITIMATE")
    print("   - These transactions passed initial approval (NSURE_LAST_DECISION = APPROVED)")
    print("   - Later marked as fraud (IS_FRAUD_TX = 1)")
    print("   - Behavioral patterns may be similar to legitimate transactions")
    print()
    
    print("=" * 80)
    print("🔧 WHAT NEEDS CHANGING")
    print("=" * 80)
    print()
    print("1. ADJUST RISK THRESHOLD")
    print("   Current: 50%")
    print("   Entity score: 41.67%")
    print("   → Consider lowering threshold to 40% or 35%")
    print()
    print("2. ENHANCE FEATURE ENGINEERING")
    print("   Add features that capture:")
    print("   - Transaction velocity (tx/hour, tx/day)")
    print("   - IP/Device concentration")
    print("   - Amount anomalies")
    print("   - Merchant diversity")
    print("   - Time-of-day patterns")
    print()
    print("3. FOCUS ON FRAUD WINDOW")
    print("   - Investigation uses 2-year window (mostly legitimate)")
    print("   - Fraud occurs in specific periods")
    print("   → Weight recent transactions more heavily")
    print("   → Focus on anomaly detection within shorter windows")
    print()
    print("4. CONSIDER HYBRID APPROACH")
    print("   - Use MODEL_SCORE as a feature (even if excluded from main analysis)")
    print("   - Combine with behavioral patterns")
    print("   - Apply different thresholds for different risk indicators")
    print()


if __name__ == "__main__":
    asyncio.run(analyze_false_negatives())
