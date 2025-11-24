#!/usr/bin/env python3
"""
Test fraud detection on random historical 24-hour windows.
Goes back 7+ months to test on completely unseen data.
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.agent.tools.database_tool import get_database_provider


async def find_fraud_in_window(provider, window_start: datetime, window_end: datetime):
    """Find entities with fraud in a specific window"""
    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as fraud_count,
        COUNT(DISTINCT DEVICE_ID) as unique_devices,
        COUNT(DISTINCT IP) as unique_ips,
        MIN(TX_DATETIME) as first_fraud,
        MAX(TX_DATETIME) as last_fraud,
        SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount
    FROM DBT.DBT_PROD.TXS
    WHERE TX_DATETIME >= '{window_start.strftime('%Y-%m-%d %H:%M:%S')}'
        AND TX_DATETIME < '{window_end.strftime('%Y-%m-%d %H:%M:%S')}'
        AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        AND IS_FRAUD_TX = 1
        AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    ORDER BY fraud_count DESC
    LIMIT 10
    """
    
    return await provider.execute_query_async(query)


async def get_entity_transactions(provider, email: str, window_start: datetime, context_days: int = 60):
    """Get all transactions for an entity with context window"""
    context_start = window_start - timedelta(days=context_days)
    context_end = window_start + timedelta(days=context_days)
    
    query = f"""
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
    WHERE EMAIL = '{email}'
        AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        AND TX_DATETIME >= '{context_start.strftime('%Y-%m-%d %H:%M:%S')}'
        AND TX_DATETIME <= '{context_end.strftime('%Y-%m-%d %H:%M:%S')}'
    ORDER BY TX_DATETIME
    """
    
    return await provider.execute_query_async(query)


async def test_window(window_start: datetime, window_end: datetime):
    """Test a single 24-hour window"""
    print("=" * 80)
    print(f"🔍 TESTING WINDOW: {window_start.strftime('%Y-%m-%d')} ({window_start.strftime('%A')})")
    print("=" * 80)
    print()
    
    provider = get_database_provider('snowflake')
    provider.connect()
    
    # Find fraud entities
    fraud_entities = await find_fraud_in_window(provider, window_start, window_end)
    
    if not fraud_entities:
        print("⚠️  No fraud found in this window")
        print()
        return None
    
    print(f"✅ Found {len(fraud_entities)} entities with fraud")
    print()
    
    # Test top 3 entities
    results = []
    for i, entity_info in enumerate(fraud_entities[:3], 1):
        email = entity_info.get('EMAIL')
        fraud_count = entity_info.get('FRAUD_COUNT')
        total_amount = entity_info.get('TOTAL_AMOUNT', 0)
        
        print(f"Testing {i}/3: {email}")
        print(f"  Fraud in window: {fraud_count} transactions, ${total_amount:.2f}")
        
        # Get entity transactions
        transactions = await get_entity_transactions(provider, email, window_start)
        
        if not transactions:
            print(f"  ⚠️  No transactions found in context window")
            print()
            continue
        
        fraud_txs = [t for t in transactions if t.get('IS_FRAUD_TX') == 1]
        legit_txs = [t for t in transactions if t.get('IS_FRAUD_TX') == 0]
        
        print(f"  Total transactions: {len(transactions)} ({len(fraud_txs)} fraud, {len(legit_txs)} legitimate)")
        
        # Calculate enhanced risk
        scorer = EnhancedRiskScorer()
        risk_assessment = scorer.calculate_entity_risk(transactions, email, 'email')
        
        # Calculate confusion matrix
        tx_scores = risk_assessment['transaction_scores']
        threshold = risk_assessment['risk_threshold']
        
        tp = fp = tn = fn = 0
        for tx in transactions:
            tx_id = tx.get('TX_ID_KEY')
            score = tx_scores.get(tx_id, 0)
            is_fraud = tx.get('IS_FRAUD_TX') == 1
            predicted_fraud = score >= threshold
            
            if is_fraud and predicted_fraud:
                tp += 1
            elif is_fraud and not predicted_fraud:
                fn += 1
            elif not is_fraud and predicted_fraud:
                fp += 1
            else:
                tn += 1
        
        recall = tp / len(fraud_txs) if fraud_txs else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        result_status = "✅" if recall >= 0.8 else "⚠️" if recall >= 0.5 else "❌"
        
        print(f"  {result_status} Risk Score: {risk_assessment['overall_risk_score']:.3f} (threshold: {threshold:.3f})")
        print(f"  {result_status} Recall: {recall:.1%} ({tp}/{len(fraud_txs)} fraud caught)")
        print(f"     Precision: {precision:.1%}, F1: {f1:.1%}")
        
        if risk_assessment['anomalies']:
            print(f"     Anomalies: {len(risk_assessment['anomalies'])} detected")
            for anomaly in risk_assessment['anomalies'][:3]:
                print(f"       🚨 {anomaly['type']}: {anomaly['description']}")
        
        print()
        
        results.append({
            'email': email,
            'fraud_count': fraud_count,
            'total_transactions': len(transactions),
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'tp': tp,
            'fn': fn,
            'fp': fp,
            'tn': tn,
            'risk_score': risk_assessment['overall_risk_score'],
            'threshold': threshold
        })
    
    return results


async def test_random_historical_windows(num_windows: int = 10, min_months_ago: int = 7):
    """Test on random historical windows going back 7+ months"""
    print("=" * 80)
    print("🎲 RANDOM HISTORICAL WINDOW TESTING")
    print("=" * 80)
    print()
    print(f"Testing {num_windows} random 24-hour windows")
    print(f"Date range: {min_months_ago}+ months ago")
    print()
    
    # Generate random dates going back 7-12 months
    today = datetime.now()
    earliest_date = today - timedelta(days=365)  # 12 months ago
    latest_date = today - timedelta(days=min_months_ago * 30)  # 7 months ago
    
    # Generate random dates
    date_range_days = (latest_date - earliest_date).days
    random_dates = []
    
    for _ in range(num_windows):
        random_offset = random.randint(0, date_range_days)
        random_date = earliest_date + timedelta(days=random_offset)
        # Set to midnight
        random_date = random_date.replace(hour=0, minute=0, second=0, microsecond=0)
        random_dates.append(random_date)
    
    # Sort dates (oldest first)
    random_dates.sort()
    
    print("Selected random dates:")
    for i, date in enumerate(random_dates, 1):
        days_ago = (today - date).days
        print(f"  {i}. {date.strftime('%Y-%m-%d (%A)')} ({days_ago} days ago)")
    print()
    
    # Test each window
    all_results = []
    total_tp = total_fn = total_fp = total_tn = 0
    windows_with_fraud = 0
    
    for window_start in random_dates:
        window_end = window_start + timedelta(days=1)
        
        results = await test_window(window_start, window_end)
        
        if results:
            windows_with_fraud += 1
            all_results.extend(results)
            
            for r in results:
                total_tp += r['tp']
                total_fn += r['fn']
                total_fp += r['fp']
                total_tn += r['tn']
    
    # Final summary
    print()
    print("=" * 80)
    print("📊 FINAL SUMMARY")
    print("=" * 80)
    print()
    
    print(f"Windows Tested: {num_windows}")
    print(f"Windows with Fraud: {windows_with_fraud}")
    print(f"Entities Tested: {len(all_results)}")
    print()
    
    if all_results:
        print("AGGREGATED CONFUSION MATRIX:")
        print(f"  True Positives:   {total_tp:4d}")
        print(f"  False Negatives:  {total_fn:4d}")
        print(f"  False Positives:  {total_fp:4d}")
        print(f"  True Negatives:   {total_tn:4d}")
        print()
        
        total_fraud = total_tp + total_fn
        if total_fraud > 0:
            overall_recall = total_tp / total_fraud
            overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
            overall_f1 = 2 * (overall_precision * overall_recall) / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0
            
            print("OVERALL PERFORMANCE:")
            print(f"  Recall:    {overall_recall:.1%}")
            print(f"  Precision: {overall_precision:.1%}")
            print(f"  F1 Score:  {overall_f1:.1%}")
            print()
            
            # Per-entity averages
            avg_recall = sum(r['recall'] for r in all_results) / len(all_results)
            avg_precision_list = [r['precision'] for r in all_results if r['precision'] > 0]
            avg_precision = sum(avg_precision_list) / len(avg_precision_list) if avg_precision_list else 0
            avg_f1_list = [r['f1'] for r in all_results if r['f1'] > 0]
            avg_f1 = sum(avg_f1_list) / len(avg_f1_list) if avg_f1_list else 0
            
            print("PER-ENTITY AVERAGES:")
            print(f"  Avg Recall:    {avg_recall:.1%}")
            print(f"  Avg Precision: {avg_precision:.1%}")
            print(f"  Avg F1 Score:  {avg_f1:.1%}")
            print()
            
            # Performance distribution
            high_recall = sum(1 for r in all_results if r['recall'] >= 0.8)
            medium_recall = sum(1 for r in all_results if 0.5 <= r['recall'] < 0.8)
            low_recall = sum(1 for r in all_results if r['recall'] < 0.5)
            
            print("RECALL DISTRIBUTION:")
            print(f"  High (≥80%):     {high_recall:3d} entities ({high_recall/len(all_results)*100:.1f}%)")
            print(f"  Medium (50-80%): {medium_recall:3d} entities ({medium_recall/len(all_results)*100:.1f}%)")
            print(f"  Low (<50%):      {low_recall:3d} entities ({low_recall/len(all_results)*100:.1f}%)")
            print()
            
            # Rating
            if overall_recall >= 0.90:
                rating = "🏆 EXCELLENT"
            elif overall_recall >= 0.80:
                rating = "✅ VERY GOOD"
            elif overall_recall >= 0.70:
                rating = "✅ GOOD"
            elif overall_recall >= 0.60:
                rating = "⚠️  FAIR"
            else:
                rating = "❌ NEEDS IMPROVEMENT"
            
            print(f"RATING: {rating}")
            print()
            
            if overall_recall < 1.0:
                missed_percentage = (1 - overall_recall) * 100
                print(f"⚠️  Missing {missed_percentage:.1f}% of fraud ({total_fn} transactions)")
                print(f"   Consider: Lower threshold or refine features")
            else:
                print(f"🎉 PERFECT! Caught ALL {total_fraud} fraud transactions!")
    else:
        print("⚠️  No fraud found in any of the tested windows")
        print("   Try different date range or more windows")
    
    print()
    print("=" * 80)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test on random historical windows')
    parser.add_argument('--windows', type=int, default=10, help='Number of random windows to test')
    parser.add_argument('--min-months', type=int, default=7, help='Minimum months back (default: 7)')
    
    args = parser.parse_args()
    
    await test_random_historical_windows(args.windows, args.min_months)


if __name__ == "__main__":
    asyncio.run(main())

