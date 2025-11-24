#!/usr/bin/env python3
"""
Systematic fraud detection testing across multiple 24-hour windows.
Tests backwards in time, identifies missed patterns, and adjusts detection.
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.agent.tools.database_tool import get_database_provider


class SystematicFraudTester:
    """Systematic testing framework for fraud detection"""
    
    def __init__(self):
        self.provider = None
        self.scorer = EnhancedRiskScorer()
        self.results = []
        self.missed_patterns = []
        
    async def initialize(self):
        """Initialize database connection"""
        self.provider = get_database_provider('snowflake')
        self.provider.connect()
    
    async def get_fraud_entities_in_window(self, window_start: datetime, window_end: datetime):
        """Get entities with fraud in a specific 24-hour window"""
        query = f"""
        SELECT 
            EMAIL,
            COUNT(*) as fraud_count,
            COUNT(DISTINCT DEVICE_ID) as unique_devices,
            COUNT(DISTINCT IP) as unique_ips,
            AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
            MIN(TX_DATETIME) as first_fraud,
            MAX(TX_DATETIME) as last_fraud
        FROM DBT.DBT_PROD.TXS
        WHERE TX_DATETIME >= '{window_start.strftime('%Y-%m-%d %H:%M:%S')}'
            AND TX_DATETIME < '{window_end.strftime('%Y-%m-%d %H:%M:%S')}'
            AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
            AND IS_FRAUD_TX = 1
            AND EMAIL IS NOT NULL
        GROUP BY EMAIL
        ORDER BY fraud_count DESC
        LIMIT 20
        """
        
        return await self.provider.execute_query_async(query)
    
    async def get_entity_transactions(self, email: str, fraud_window_start: datetime, context_days: int = 60):
        """Get all transactions for an entity with context window around fraud"""
        # Get transactions from context_days before the fraud window START to context_days after
        window_start = fraud_window_start - timedelta(days=context_days)
        window_end = fraud_window_start + timedelta(days=context_days)
        
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
            AND TX_DATETIME >= '{window_start.strftime('%Y-%m-%d %H:%M:%S')}'
            AND TX_DATETIME <= '{window_end.strftime('%Y-%m-%d %H:%M:%S')}'
        ORDER BY TX_DATETIME
        """
        
        return await self.provider.execute_query_async(query)
    
    async def test_entity(self, email: str, fraud_count: int, fraud_window_start: datetime, context_days: int = 60):
        """Test enhanced scoring on a specific entity"""
        # Get transactions
        transactions = await self.get_entity_transactions(email, fraud_window_start, context_days)
        
        if not transactions:
            return None
        
        # Calculate risk
        risk_assessment = self.scorer.calculate_entity_risk(transactions, email, 'email')
        
        # Separate fraud and legitimate
        fraud_txs = [t for t in transactions if t.get('IS_FRAUD_TX') == 1]
        legit_txs = [t for t in transactions if t.get('IS_FRAUD_TX') == 0]
        
        # Calculate confusion matrix
        tx_scores = risk_assessment['transaction_scores']
        threshold = risk_assessment['risk_threshold']
        
        tp = 0  # True positives
        fn = 0  # False negatives
        fp = 0  # False positives
        tn = 0  # True negatives
        
        fraud_scores = []
        missed_fraud_txs = []
        
        for tx in transactions:
            tx_id = tx.get('TX_ID_KEY')
            score = tx_scores.get(tx_id, 0)
            is_fraud = tx.get('IS_FRAUD_TX') == 1
            predicted_fraud = score >= threshold
            
            if is_fraud:
                fraud_scores.append(score)
                if predicted_fraud:
                    tp += 1
                else:
                    fn += 1
                    missed_fraud_txs.append(tx)
            else:
                if predicted_fraud:
                    fp += 1
                else:
                    tn += 1
        
        recall = tp / len(fraud_txs) if fraud_txs else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'email': email,
            'total_transactions': len(transactions),
            'fraud_transactions': len(fraud_txs),
            'legitimate_transactions': len(legit_txs),
            'risk_score': risk_assessment['overall_risk_score'],
            'risk_level': risk_assessment['risk_level'],
            'is_fraud_detected': risk_assessment['is_fraud'],
            'tp': tp,
            'fn': fn,
            'fp': fp,
            'tn': tn,
            'recall': recall,
            'precision': precision,
            'f1': f1,
            'features': risk_assessment['features'],
            'anomalies': risk_assessment['anomalies'],
            'fraud_scores': fraud_scores,
            'missed_fraud': missed_fraud_txs
        }
    
    async def test_window(self, window_start: datetime, window_end: datetime, max_entities: int = 5):
        """Test a 24-hour window"""
        print("=" * 80)
        print(f"📅 TESTING WINDOW: {window_start.strftime('%Y-%m-%d %H:%M')} to {window_end.strftime('%Y-%m-%d %H:%M')}")
        print("=" * 80)
        print()
        
        # Find fraud entities
        fraud_entities = await self.get_fraud_entities_in_window(window_start, window_end)
        
        if not fraud_entities:
            print("⚠️ No fraud found in this window")
            print()
            return {
                'window_start': window_start,
                'window_end': window_end,
                'fraud_entities_found': 0,
                'entities_tested': 0,
                'results': []
            }
        
        print(f"✅ Found {len(fraud_entities)} entities with fraud")
        print()
        
        # Test top entities
        test_count = min(max_entities, len(fraud_entities))
        window_results = []
        
        for i, entity_info in enumerate(fraud_entities[:test_count], 1):
            email = entity_info.get('EMAIL')
            fraud_count = entity_info.get('FRAUD_COUNT')
            
            print(f"Testing {i}/{test_count}: {email} ({fraud_count} fraud)")
            
            result = await self.test_entity(email, fraud_count, window_start)
            
            if result:
                window_results.append(result)
                
                # Show result
                status = "✅" if result['recall'] >= 0.7 else "⚠️" if result['recall'] >= 0.5 else "❌"
                print(f"  {status} Recall: {result['recall']:.1%} ({result['tp']}/{result['fraud_transactions']})")
                print(f"     Risk Score: {result['risk_score']:.3f}, Detected: {result['is_fraud_detected']}")
                
                # Analyze missed fraud
                if result['fn'] > 0:
                    self.analyze_missed_fraud(result)
            
            print()
        
        return {
            'window_start': window_start,
            'window_end': window_end,
            'fraud_entities_found': len(fraud_entities),
            'entities_tested': test_count,
            'results': window_results
        }
    
    def analyze_missed_fraud(self, result):
        """Analyze characteristics of missed fraud transactions"""
        missed = result['missed_fraud']
        if not missed:
            return
        
        # Analyze patterns
        amounts = [t.get('AMOUNT') for t in missed]
        merchants = set(t.get('MERCHANT') for t in missed)
        ips = set(t.get('IP') for t in missed)
        devices = set(t.get('DEVICE_ID') for t in missed)
        
        pattern = {
            'entity': result['email'],
            'missed_count': len(missed),
            'avg_amount': sum(amounts) / len(amounts) if amounts else 0,
            'unique_merchants': len(merchants),
            'unique_ips': len(ips),
            'unique_devices': len(devices),
            'features': result['features']
        }
        
        self.missed_patterns.append(pattern)
    
    async def run_systematic_test(self, num_windows: int = 30, start_offset_months: int = 6):
        """Run systematic testing across multiple windows"""
        print("=" * 80)
        print("🔬 SYSTEMATIC FRAUD DETECTION TESTING")
        print("=" * 80)
        print()
        print(f"Testing {num_windows} consecutive 24-hour windows")
        print(f"Starting from {start_offset_months} months ago, going backwards")
        print()
        
        await self.initialize()
        
        # Start from N months ago
        current_end = datetime.now() - timedelta(days=start_offset_months * 30)
        
        for window_num in range(num_windows):
            window_start = current_end - timedelta(days=1)
            
            window_result = await self.test_window(window_start, current_end, max_entities=3)
            self.results.append(window_result)
            
            # Move backwards
            current_end = window_start
            
            # Check if we need adjustments every 10 windows
            if (window_num + 1) % 10 == 0:
                self.analyze_and_suggest_adjustments(window_num + 1)
        
        # Final analysis
        self.generate_final_report()
    
    def analyze_and_suggest_adjustments(self, windows_tested: int):
        """Analyze results so far and suggest adjustments"""
        print()
        print("=" * 80)
        print(f"📊 INTERIM ANALYSIS - After {windows_tested} windows")
        print("=" * 80)
        print()
        
        # Calculate overall metrics
        total_fraud = 0
        total_caught = 0
        total_fp = 0
        
        for window in self.results:
            for result in window['results']:
                total_fraud += result['fraud_transactions']
                total_caught += result['tp']
                total_fp += result['fp']
        
        if total_fraud > 0:
            overall_recall = total_caught / total_fraud
            overall_precision = total_caught / (total_caught + total_fp) if (total_caught + total_fp) > 0 else 0
            
            print(f"Overall Recall: {overall_recall:.1%} ({total_caught}/{total_fraud})")
            print(f"Overall Precision: {overall_precision:.1%}")
            print(f"False Positives: {total_fp}")
            print()
            
            # Analyze missed patterns
            if self.missed_patterns:
                print("COMMON PATTERNS IN MISSED FRAUD:")
                
                # Aggregate patterns
                avg_missed_count = sum(p['missed_count'] for p in self.missed_patterns) / len(self.missed_patterns)
                avg_amount = sum(p['avg_amount'] for p in self.missed_patterns) / len(self.missed_patterns)
                
                print(f"  Avg missed per entity: {avg_missed_count:.1f}")
                print(f"  Avg transaction amount: ${avg_amount:.2f}")
                
                # Check if threshold needs adjustment
                if overall_recall < 0.75:
                    print()
                    print("⚠️ RECOMMENDATION: Recall below 75%")
                    print("   Consider lowering threshold from 0.35 to 0.30")
                
                if overall_precision < 0.80 and total_fp > 10:
                    print()
                    print("⚠️ RECOMMENDATION: Precision below 80% with many FP")
                    print("   Consider increasing threshold or refining features")
        
        print()
    
    def generate_final_report(self):
        """Generate comprehensive final report"""
        print()
        print("=" * 80)
        print("📊 FINAL SYSTEMATIC TEST REPORT")
        print("=" * 80)
        print()
        
        # Overall statistics
        windows_with_fraud = sum(1 for w in self.results if w['fraud_entities_found'] > 0)
        total_entities_tested = sum(w['entities_tested'] for w in self.results)
        
        print(f"Windows Tested: {len(self.results)}")
        print(f"Windows with Fraud: {windows_with_fraud}")
        print(f"Total Entities Tested: {total_entities_tested}")
        print()
        
        # Aggregate metrics
        total_fraud = 0
        total_caught = 0
        total_missed = 0
        total_fp = 0
        total_tn = 0
        
        recall_scores = []
        precision_scores = []
        f1_scores = []
        risk_scores = []
        
        for window in self.results:
            for result in window['results']:
                total_fraud += result['fraud_transactions']
                total_caught += result['tp']
                total_missed += result['fn']
                total_fp += result['fp']
                total_tn += result['tn']
                
                if result['recall'] > 0:
                    recall_scores.append(result['recall'])
                if result['precision'] > 0:
                    precision_scores.append(result['precision'])
                if result['f1'] > 0:
                    f1_scores.append(result['f1'])
                risk_scores.append(result['risk_score'])
        
        print("AGGREGATED CONFUSION MATRIX:")
        print(f"  True Positives:  {total_caught:4d}")
        print(f"  False Negatives: {total_missed:4d}")
        print(f"  False Positives: {total_fp:4d}")
        print(f"  True Negatives:  {total_tn:4d}")
        print()
        
        if total_fraud > 0:
            overall_recall = total_caught / total_fraud
            overall_precision = total_caught / (total_caught + total_fp) if (total_caught + total_fp) > 0 else 0
            overall_f1 = 2 * (overall_precision * overall_recall) / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0
            
            print("OVERALL PERFORMANCE:")
            print(f"  Recall:    {overall_recall:.1%}")
            print(f"  Precision: {overall_precision:.1%}")
            print(f"  F1 Score:  {overall_f1:.1%}")
            print()
        
        if recall_scores:
            print("PER-ENTITY AVERAGES:")
            print(f"  Avg Recall:    {sum(recall_scores)/len(recall_scores):.1%}")
            print(f"  Avg Precision: {sum(precision_scores)/len(precision_scores):.1%} (if precision > 0)")
            print(f"  Avg F1 Score:  {sum(f1_scores)/len(f1_scores):.1%} (if f1 > 0)")
            print(f"  Avg Risk Score: {sum(risk_scores)/len(risk_scores):.3f}")
            print()
        
        # Performance distribution
        if recall_scores:
            high_recall = sum(1 for r in recall_scores if r >= 0.8)
            medium_recall = sum(1 for r in recall_scores if 0.5 <= r < 0.8)
            low_recall = sum(1 for r in recall_scores if r < 0.5)
            
            print("RECALL DISTRIBUTION:")
            print(f"  High (≥80%):     {high_recall:3d} entities ({high_recall/len(recall_scores)*100:.1f}%)")
            print(f"  Medium (50-80%): {medium_recall:3d} entities ({medium_recall/len(recall_scores)*100:.1f}%)")
            print(f"  Low (<50%):      {low_recall:3d} entities ({low_recall/len(recall_scores)*100:.1f}%)")
            print()
        else:
            print("⚠️ No entities with measurable recall")
            print()
        
        # Save detailed results
        report_file = f"systematic_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                'summary': {
                    'windows_tested': len(self.results),
                    'windows_with_fraud': windows_with_fraud,
                    'entities_tested': total_entities_tested,
                    'overall_recall': overall_recall if total_fraud > 0 else 0,
                    'overall_precision': overall_precision if total_fraud > 0 else 0,
                    'overall_f1': overall_f1 if total_fraud > 0 else 0
                },
                'confusion_matrix': {
                    'tp': total_caught,
                    'fn': total_missed,
                    'fp': total_fp,
                    'tn': total_tn
                },
                'windows': [{
                    'start': w['window_start'].isoformat(),
                    'end': w['window_end'].isoformat(),
                    'fraud_entities': w['fraud_entities_found'],
                    'tested': w['entities_tested']
                } for w in self.results]
            }, f, indent=2)
        
        print(f"📄 Detailed results saved to: {report_file}")
        print()
        
        # Final recommendations
        print("=" * 80)
        print("💡 FINAL RECOMMENDATIONS")
        print("=" * 80)
        print()
        
        if overall_recall >= 0.80:
            print("✅ EXCELLENT: Recall above 80% - system is performing well")
        elif overall_recall >= 0.70:
            print("✅ GOOD: Recall above 70% - minor tuning could improve")
        elif overall_recall >= 0.60:
            print("⚠️ FAIR: Recall 60-70% - consider threshold adjustment")
        else:
            print("❌ NEEDS IMPROVEMENT: Recall below 60%")
            print("   Recommended actions:")
            print("   1. Lower threshold to 0.30")
            print("   2. Increase volume risk weight")
            print("   3. Add merchant-specific rules")
        
        if overall_precision < 0.85 and total_fp > 20:
            print()
            print("⚠️ PRECISION: Consider refining features to reduce false positives")


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Systematic fraud detection testing')
    parser.add_argument('--windows', type=int, default=30, help='Number of 24-hour windows to test')
    parser.add_argument('--start-offset', type=int, default=6, help='Months back to start from')
    
    args = parser.parse_args()
    
    tester = SystematicFraudTester()
    await tester.run_systematic_test(args.windows, args.start_offset)


if __name__ == "__main__":
    asyncio.run(main())
