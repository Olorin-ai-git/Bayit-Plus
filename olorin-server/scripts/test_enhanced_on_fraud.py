#!/usr/bin/env python3
"""
Test enhanced scoring directly on the fraud transactions.
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.agent.tools.database_tool import get_database_provider


async def test_on_fraud():
    """Test enhanced scoring on actual fraud window"""
    print("=" * 80)
    print("🧪 TESTING ENHANCED SCORING ON ACTUAL FRAUD WINDOW")
    print("=" * 80)
    print()
    
    provider = get_database_provider('snowflake')
    provider.connect()
    
    entity = 'kevinalejandroo1407@gmail.com'
    
    # Get transactions including the fraud period
    query = """
    SELECT
        TX_ID_KEY,
        TX_DATETIME,
        PAID_AMOUNT_VALUE_IN_CURRENCY as AMOUNT,
        IP,
        DEVICE_ID,
        MERCHANT_NAME as MERCHANT,
        IP_COUNTRY_CODE,
        IS_FRAUD_TX
    FROM DBT.DBT_PROD.TXS
    WHERE EMAIL = 'kevinalejandroo1407@gmail.com'
        AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        AND TX_DATETIME >= '2025-04-01'
        AND TX_DATETIME <= '2025-05-27'
    ORDER BY TX_DATETIME
    """
    
    print(f"📧 Testing entity: {entity}")
    print(f"   Window: 2025-04-01 to 2025-05-27 (includes fraud)")
    print()
    
    results = await provider.execute_query_async(query)
    
    print(f"✅ Found {len(results)} transactions")
    
    fraud_txs = [r for r in results if r.get('IS_FRAUD_TX') == 1]
    legit_txs = [r for r in results if r.get('IS_FRAUD_TX') == 0]
    
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
    print(f"Is Fraud: {'✅ YES' if risk_assessment['is_fraud'] else '❌ NO'}")
    print()
    
    # Show key features
    print("KEY FEATURES DETECTED:")
    features = risk_assessment['features']
    
    # Highlight high-risk features
    if features.get('burst_score_3h', 0) > 2:
        print(f"  🚨 BURST DETECTED: {features.get('max_tx_in_3h', 0)} transactions in 3 hours")
    
    if features.get('max_repeated_amount_ratio', 0) > 0.5:
        print(f"  🚨 REPEATED AMOUNTS: {features.get('max_repeated_amount_count', 0)} identical amounts")
    
    if features.get('rapid_succession', 0) > 0:
        print(f"  🚨 RAPID SUCCESSION: Min interval {features.get('min_interval_minutes', 0):.1f} minutes")
    
    if features.get('single_merchant', 0) > 0 and features.get('tx_count', 0) > 5:
        print(f"  🚨 SINGLE MERCHANT: All {features.get('tx_count', 0)} transactions at same merchant")
    
    print()
    print(f"  Transaction count: {features.get('tx_count', 0)}")
    print(f"  Tx/hour: {features.get('tx_per_hour', 0):.2f}")
    print(f"  Burst score (3h): {features.get('burst_score_3h', 0):.2f}")
    print(f"  Unique IPs: {features.get('unique_ips', 0)}")
    print(f"  Unique devices: {features.get('unique_devices', 0)}")
    print()
    
    # Check per-transaction scores
    tx_scores = risk_assessment['transaction_scores']
    
    # Show fraud transaction scores
    print("FRAUD TRANSACTION SCORES:")
    for tx in fraud_txs[:5]:  # Show first 5
        tx_id = tx.get('TX_ID_KEY')
        score = tx_scores.get(tx_id, 0)
        date = str(tx.get('TX_DATETIME'))[:19]
        amount = tx.get('AMOUNT')
        
        flag = "✅ CAUGHT" if score >= risk_assessment['risk_threshold'] else "❌ MISSED"
        print(f"  {date} ${amount:.2f} - Score: {score:.3f} {flag}")
    
    if len(fraud_txs) > 5:
        print(f"  ... and {len(fraud_txs) - 5} more")
    print()
    
    # Calculate metrics
    caught_fraud = sum(1 for tx in fraud_txs 
                      if tx_scores.get(tx.get('TX_ID_KEY'), 0) >= risk_assessment['risk_threshold'])
    missed_fraud = len(fraud_txs) - caught_fraud
    
    false_positives = sum(1 for tx in legit_txs 
                          if tx_scores.get(tx.get('TX_ID_KEY'), 0) >= risk_assessment['risk_threshold'])
    true_negatives = len(legit_txs) - false_positives
    
    print("=" * 80)
    print("🎯 PERFORMANCE METRICS")
    print("=" * 80)
    print()
    print(f"True Positives (caught fraud): {caught_fraud}/{len(fraud_txs)}")
    print(f"False Negatives (missed fraud): {missed_fraud}/{len(fraud_txs)}")
    print(f"False Positives: {false_positives}/{len(legit_txs)}")
    print(f"True Negatives: {true_negatives}/{len(legit_txs)}")
    print()
    
    if len(fraud_txs) > 0:
        recall = caught_fraud / len(fraud_txs)
        print(f"RECALL: {recall:.1%} fraud detected")
        
        if caught_fraud + false_positives > 0:
            precision = caught_fraud / (caught_fraud + false_positives)
            print(f"PRECISION: {precision:.1%}")
            
            if precision + recall > 0:
                f1 = 2 * (precision * recall) / (precision + recall)
                print(f"F1 SCORE: {f1:.1%}")
    
    print()
    print("=" * 80)
    print("💡 SUMMARY")
    print("=" * 80)
    print()
    
    if caught_fraud > 0:
        print(f"✅ SUCCESS! Enhanced scoring would catch {caught_fraud}/{len(fraud_txs)} fraud transactions")
        print(f"   Without using MODEL_SCORE at all!")
    else:
        print(f"❌ Enhanced scoring still needs tuning")
        print(f"   Consider adjusting weights or thresholds")


if __name__ == "__main__":
    asyncio.run(test_on_fraud())
