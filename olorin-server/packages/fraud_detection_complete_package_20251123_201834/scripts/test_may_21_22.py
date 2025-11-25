#!/usr/bin/env python3
"""
Test enhanced fraud detection on May 21-22 window.
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer


async def test_may_21_22():
    """Test on May 21-22 window"""
    print("=" * 80)
    print("🧪 TESTING MAY 21-22 WINDOW")
    print("=" * 80)
    print()

    provider = get_database_provider("snowflake")
    provider.connect()

    # First, find which entities have fraud on May 21-22
    fraud_entities_query = """
    SELECT 
        EMAIL,
        COUNT(*) as fraud_count,
        COUNT(DISTINCT IP) as unique_ips,
        COUNT(DISTINCT DEVICE_ID) as unique_devices,
        MIN(TX_DATETIME) as first_fraud,
        MAX(TX_DATETIME) as last_fraud
    FROM DBT.DBT_PROD.TXS
    WHERE TX_DATETIME >= '2025-05-21'
        AND TX_DATETIME < '2025-05-23'
        AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        AND IS_FRAUD_TX = 1
        AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    ORDER BY fraud_count DESC
    LIMIT 10
    """

    print("📅 Date Range: May 21-22, 2025")
    print("🔍 Finding entities with fraud in this window...")
    print()

    fraud_entities = await provider.execute_query_async(fraud_entities_query)

    if not fraud_entities:
        print("❌ No fraud found in May 21-22 window")
        return

    print(f"✅ Found {len(fraud_entities)} entities with fraud")
    print()
    print("Top fraud entities:")
    for i, entity in enumerate(fraud_entities[:5], 1):
        email = entity.get("EMAIL")
        count = entity.get("FRAUD_COUNT")
        ips = entity.get("UNIQUE_IPS")
        devices = entity.get("UNIQUE_DEVICES")
        first = str(entity.get("FIRST_FRAUD"))[:19]
        last = str(entity.get("LAST_FRAUD"))[:19]

        print(f"{i}. {email}")
        print(f"   Fraud count: {count}")
        print(f"   Unique IPs: {ips}, Devices: {devices}")
        print(f"   Period: {first} to {last}")
        print()

    # Test on the top fraud entity
    test_entity = fraud_entities[0].get("EMAIL")

    print("=" * 80)
    print(f"📧 TESTING ON: {test_entity}")
    print("=" * 80)
    print()

    # Get all transactions for this entity in May
    entity_query = f"""
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
    WHERE EMAIL = '{test_entity}'
        AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        AND TX_DATETIME >= '2025-05-01'
        AND TX_DATETIME < '2025-05-31'
    ORDER BY TX_DATETIME
    """

    results = await provider.execute_query_async(entity_query)

    print(f"✅ Found {len(results)} transactions in May")

    fraud_txs = [r for r in results if r.get("IS_FRAUD_TX") == 1]
    legit_txs = [r for r in results if r.get("IS_FRAUD_TX") == 0]

    print(f"   Fraud: {len(fraud_txs)}")
    print(f"   Legitimate: {len(legit_txs)}")
    print()

    # Show fraud transaction details
    print("FRAUD TRANSACTIONS:")
    for tx in fraud_txs[:10]:
        date = str(tx.get("TX_DATETIME"))[:19]
        amount = tx.get("AMOUNT")
        ip = tx.get("IP")
        device = str(tx.get("DEVICE_ID"))[:36]
        merchant = tx.get("MERCHANT")

        print(f"  {date} - ${amount:.2f} - {merchant}")
        print(f"    IP: {ip}")
        print(f"    Device: {device}")

    if len(fraud_txs) > 10:
        print(f"  ... and {len(fraud_txs) - 10} more")
    print()

    # Test enhanced scoring
    print("=" * 80)
    print("🎯 ENHANCED RISK SCORING")
    print("=" * 80)
    print()

    scorer = EnhancedRiskScorer()
    risk_assessment = scorer.calculate_entity_risk(results, test_entity, "email")

    print(f"Overall Risk Score: {risk_assessment['overall_risk_score']:.3f}")
    print(f"Risk Level: {risk_assessment['risk_level']}")
    print(f"Risk Threshold: {risk_assessment['risk_threshold']}")
    print(f"Is Fraud: {'✅ YES' if risk_assessment['is_fraud'] else '❌ NO'}")
    print()

    # Show key features
    print("KEY FEATURES DETECTED:")
    features = risk_assessment["features"]

    if features.get("burst_score_3h", 0) > 2:
        print(f"  🚨 BURST: {features.get('max_tx_in_3h', 0)} transactions in 3 hours")

    if features.get("max_repeated_amount_ratio", 0) > 0.5:
        print(
            f"  🚨 REPEATED AMOUNTS: {features.get('max_repeated_amount_count', 0)} identical"
        )

    if features.get("rapid_succession", 0) > 0:
        print(
            f"  🚨 RAPID: Min interval {features.get('min_interval_minutes', 0):.1f} minutes"
        )

    if features.get("single_ip", 0) > 0:
        print(f"  🚨 SINGLE IP: All from 1 IP address")

    if features.get("single_device", 0) > 0:
        print(f"  🚨 SINGLE DEVICE: All from 1 device")

    print()
    print(f"  Total transactions: {features.get('tx_count', 0)}")
    print(f"  Velocity: {features.get('tx_per_hour', 0):.2f} tx/hour")
    print(f"  Unique IPs: {features.get('unique_ips', 0)}")
    print(f"  Unique devices: {features.get('unique_devices', 0)}")
    print(f"  Unique merchants: {features.get('unique_merchants', 0)}")
    print()

    # Show anomalies
    if risk_assessment["anomalies"]:
        print("ANOMALIES DETECTED:")
        for anomaly in risk_assessment["anomalies"]:
            print(f"  🚨 {anomaly['type']}: {anomaly['description']}")
            print(
                f"     Severity: {anomaly['severity']}, Risk: {anomaly['risk_contribution']:.1%}"
            )
        print()

    # Calculate confusion matrix
    tx_scores = risk_assessment["transaction_scores"]
    threshold = risk_assessment["risk_threshold"]

    caught_fraud = 0
    missed_fraud = 0
    false_positives = 0
    true_negatives = 0

    fraud_scores = []

    for tx in results:
        tx_id = tx.get("TX_ID_KEY")
        score = tx_scores.get(tx_id, 0)
        is_fraud = tx.get("IS_FRAUD_TX") == 1
        predicted_fraud = score >= threshold

        if is_fraud:
            fraud_scores.append(score)
            if predicted_fraud:
                caught_fraud += 1
            else:
                missed_fraud += 1
        else:
            if predicted_fraud:
                false_positives += 1
            else:
                true_negatives += 1

    print("=" * 80)
    print("📊 CONFUSION MATRIX")
    print("=" * 80)
    print()
    print(f"True Positives (caught fraud):  {caught_fraud:3d}/{len(fraud_txs)}")
    print(f"False Negatives (missed fraud): {missed_fraud:3d}/{len(fraud_txs)}")
    print(f"False Positives:                {false_positives:3d}/{len(legit_txs)}")
    print(f"True Negatives:                 {true_negatives:3d}/{len(legit_txs)}")
    print()

    if len(fraud_txs) > 0:
        recall = caught_fraud / len(fraud_txs)
        print(
            f"RECALL:    {recall:6.1%} ({caught_fraud}/{len(fraud_txs)} fraud detected)"
        )

    if caught_fraud + false_positives > 0:
        precision = caught_fraud / (caught_fraud + false_positives)
        print(f"PRECISION: {precision:6.1%}")

        if precision + recall > 0:
            f1 = 2 * (precision * recall) / (precision + recall)
            print(f"F1 SCORE:  {f1:6.1%}")

    print()

    # Show fraud score distribution
    if fraud_scores:
        print("FRAUD TRANSACTION SCORE DISTRIBUTION:")
        print(f"  Min:  {min(fraud_scores):.3f}")
        print(f"  Avg:  {sum(fraud_scores)/len(fraud_scores):.3f}")
        print(f"  Max:  {max(fraud_scores):.3f}")
        print(f"  Threshold: {threshold:.3f}")
        print()

        # Show individual fraud scores
        print("FRAUD TRANSACTIONS (with scores):")
        for tx in fraud_txs[:8]:
            tx_id = tx.get("TX_ID_KEY")
            score = tx_scores.get(tx_id, 0)
            date = str(tx.get("TX_DATETIME"))[:19]
            amount = tx.get("AMOUNT")

            flag = "✅" if score >= threshold else "❌"
            print(f"  {flag} {date} ${amount:6.2f} - Score: {score:.3f}")

        if len(fraud_txs) > 8:
            print(f"  ... and {len(fraud_txs) - 8} more")

    print()
    print("=" * 80)
    print("💡 RESULT")
    print("=" * 80)
    print()

    if caught_fraud == len(fraud_txs):
        print(f"🎉 PERFECT! Caught ALL {caught_fraud} fraud transactions!")
    elif caught_fraud > 0:
        print(
            f"✅ SUCCESS! Caught {caught_fraud}/{len(fraud_txs)} fraud ({recall:.1%} recall)"
        )
    else:
        print(f"❌ FAILED: Missed all fraud in this window")

    print(f"   Precision: {precision:.1%} ({false_positives} false positives)")
    print()


if __name__ == "__main__":
    asyncio.run(test_may_21_22())
