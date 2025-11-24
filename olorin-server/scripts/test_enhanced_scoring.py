#!/usr/bin/env python3
"""
Test the enhanced risk scoring on known fraud transactions.
This validates that the new behavioral features can detect fraud without MODEL_SCORE.
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

from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.agent.tools.database_tool import get_database_provider
from app.service.agent.tools.snowflake_tool.schema_constants import (
    TX_DATETIME, IS_FRAUD_TX, NSURE_LAST_DECISION,
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, DEVICE_ID, MERCHANT_NAME,
    IP_COUNTRY_CODE, TX_ID_KEY
)


async def test_enhanced_scoring():
    """Test enhanced scoring on the fraud entity"""
    print("=" * 80)
    print("🧪 TESTING ENHANCED RISK SCORING (NO MODEL_SCORE)")
    print("=" * 80)
    print()
    
    # Import Snowflake provider
    db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
    provider = get_database_provider(db_provider)
    provider.connect()
    
    # Get table name
    db = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
    schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
    table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
    full_table = f"{db}.{schema}.{table}"
    
    entity = 'kevinalejandroo1407@gmail.com'
    
    # Get ALL transactions for the entity (2-year window like investigation)
    query = f"""
    SELECT
        {TX_ID_KEY} as TX_ID_KEY,
        {TX_DATETIME} as TX_DATETIME,
        {PAID_AMOUNT_VALUE_IN_CURRENCY} as AMOUNT,
        {IP} as IP,
        {DEVICE_ID} as DEVICE_ID,
        {MERCHANT_NAME} as MERCHANT,
        {IP_COUNTRY_CODE} as IP_COUNTRY_CODE,
        {IS_FRAUD_TX} as IS_FRAUD_TX
    FROM {full_table}
    WHERE EMAIL = '{entity}'
        AND UPPER({NSURE_LAST_DECISION}) = 'APPROVED'
        AND {TX_DATETIME} >= DATEADD(year, -2.5, CURRENT_TIMESTAMP())
        AND {TX_DATETIME} < DATEADD(month, -6, CURRENT_TIMESTAMP())
    ORDER BY {TX_DATETIME}
    """
    
    print(f"📧 Testing entity: {entity}")
    print(f"   Window: 2.5 years ago to 6 months ago (investigation window)")
    print()
    
    results = await provider.execute_query_async(query)
    
    if not results:
        print("❌ No transactions found")
        return
    
    print(f"✅ Found {len(results)} transactions")
    
    # Separate fraud and legitimate
    fraud_txs = [r for r in results if (r.get('IS_FRAUD_TX') or r.get('is_fraud_tx')) == 1]
    legit_txs = [r for r in results if (r.get('IS_FRAUD_TX') or r.get('is_fraud_tx')) == 0]
    
    print(f"   Fraud: {len(fraud_txs)}")
    print(f"   Legitimate: {len(legit_txs)}")
    print()
    
    # Test enhanced scoring
    scorer = EnhancedRiskScorer()
    risk_assessment = scorer.calculate_entity_risk(results, entity, 'email')
    
    print("=" * 80)
    print("📊 ENHANCED RISK SCORING RESULTS")
    print("=" * 80)
    print()
    
    print(f"Overall Risk Score: {risk_assessment['overall_risk_score']:.3f}")
    print(f"Risk Level: {risk_assessment['risk_level']}")
    print(f"Risk Threshold: {risk_assessment['risk_threshold']}")
    print(f"Is Fraud: {risk_assessment['is_fraud']}")
    print()
    
    # Show key features
    print("KEY FEATURES:")
    features = risk_assessment['features']
    print(f"  Transactions: {features.get('tx_count', 0)}")
    print(f"  Tx/hour: {features.get('tx_per_hour', 0):.2f}")
    print(f"  Max in 3h: {features.get('max_tx_in_3h', 0)}")
    print(f"  Burst score (3h): {features.get('burst_score_3h', 0):.2f}")
    print(f"  Rapid succession: {features.get('rapid_succession', 0)}")
    print(f"  Repeated amount ratio: {features.get('max_repeated_amount_ratio', 0):.2%}")
    print(f"  Single IP: {features.get('single_ip', 0)}")
    print(f"  Single device: {features.get('single_device', 0)}")
    print(f"  Single merchant: {features.get('single_merchant', 0)}")
    print()
    
    # Show anomalies
    if risk_assessment['anomalies']:
        print("ANOMALIES DETECTED:")
        for anomaly in risk_assessment['anomalies']:
            print(f"  🚨 {anomaly['type']}: {anomaly['description']}")
            print(f"     Severity: {anomaly['severity']}")
            print(f"     Risk contribution: {anomaly['risk_contribution']:.2%}")
        print()
    
    # Check transaction scores
    tx_scores = risk_assessment['transaction_scores']
    if tx_scores:
        # Count how many fraud transactions would be caught
        caught_fraud = 0
        missed_fraud = 0
        false_positives = 0
        true_negatives = 0
        
        for tx in results:
            tx_id = (tx.get('TX_ID_KEY') or tx.get('tx_id_key') or 
                    str(hash(str(tx))))
            score = tx_scores.get(tx_id, 0)
            is_fraud = (tx.get('IS_FRAUD_TX') or tx.get('is_fraud_tx')) == 1
            predicted_fraud = score >= risk_assessment['risk_threshold']
            
            if is_fraud and predicted_fraud:
                caught_fraud += 1
            elif is_fraud and not predicted_fraud:
                missed_fraud += 1
            elif not is_fraud and predicted_fraud:
                false_positives += 1
            else:
                true_negatives += 1
        
        print("=" * 80)
        print("🎯 CONFUSION MATRIX WITH ENHANCED SCORING")
        print("=" * 80)
        print()
        print(f"True Positives (caught fraud): {caught_fraud}")
        print(f"False Negatives (missed fraud): {missed_fraud}")
        print(f"False Positives: {false_positives}")
        print(f"True Negatives: {true_negatives}")
        print()
        
        if caught_fraud + missed_fraud > 0:
            recall = caught_fraud / (caught_fraud + missed_fraud)
            print(f"Recall: {recall:.1%} ({caught_fraud}/{caught_fraud + missed_fraud} fraud caught)")
        
        if caught_fraud + false_positives > 0:
            precision = caught_fraud / (caught_fraud + false_positives)
            print(f"Precision: {precision:.1%}")
    
    print()
    print("=" * 80)
    print("💡 COMPARISON TO ORIGINAL")
    print("=" * 80)
    print()
    print("Original investigation (with MODEL_SCORE excluded):")
    print("  Risk Score: 0.417 (41.7%)")
    print("  Threshold: 0.50 (50%)")
    print("  Result: ❌ MISSED ALL 8 FRAUD")
    print()
    print("Enhanced scoring (behavioral features only):")
    print(f"  Risk Score: {risk_assessment['overall_risk_score']:.3f}")
    print(f"  Threshold: {risk_assessment['risk_threshold']}")
    if risk_assessment['is_fraud']:
        print(f"  Result: ✅ WOULD FLAG AS FRAUD")
    else:
        print(f"  Result: ❌ WOULD STILL MISS")
    print()
    
    if caught_fraud > 0:
        print(f"🎉 IMPROVEMENT: Would catch {caught_fraud}/{len(fraud_txs)} fraud transactions!")
    else:
        print("⚠️ Still needs tuning to catch fraud")


if __name__ == "__main__":
    asyncio.run(test_enhanced_scoring())
