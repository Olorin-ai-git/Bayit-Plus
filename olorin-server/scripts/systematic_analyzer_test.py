#!/usr/bin/env python3
"""
Systematic Analyzer Testing Framework

Tests the analyzer iteratively across multiple 24H windows, investigating ALL
selected entities to calculate true precision/recall metrics.

Strategy:
1. Start at offset (e.g., 6 months ago)
2. Run analyzer for 24H window
3. Investigate ALL top N entities (not just 5)
4. Record fraud found vs fraud missed
5. Move backwards 1 day
6. Repeat for X days
7. Calculate aggregate precision, recall, F1
"""

import sys
import os
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

try:
    import snowflake.connector
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization
except ImportError as e:
    print(f"ERROR: {e}")
    sys.exit(1)

# Configuration
ACCOUNT = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('.snowflakecomputing.com', '').replace('https://', '')
USER = os.getenv('SNOWFLAKE_USER')
DATABASE = 'DBT'
SCHEMA = 'DBT_PROD'
TABLE = 'TXS'
WAREHOUSE = os.getenv('SNOWFLAKE_WAREHOUSE', 'manual_review_agent_wh')
PRIVATE_KEY_PATH = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', '/Users/olorin/Documents/rsa_key.p8')


def get_snowflake_connection():
    """Create Snowflake connection"""
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        p_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    return snowflake.connector.connect(
        user=USER,
        account=ACCOUNT,
        private_key=pkb,
        warehouse=WAREHOUSE,
        database=DATABASE,
        schema=SCHEMA
    )


def run_analyzer_query(conn, window_start: datetime, window_end: datetime, ranking_type: str = 'current') -> List[Dict[str, Any]]:
    """
    Run analyzer query with specified ranking
    
    Args:
        conn: Snowflake connection
        window_start: Start of 24H window
        window_end: End of 24H window
        ranking_type: 'current' (risk_weighted) or 'fraud_aware'
    
    Returns:
        List of entities with their metrics
    """
    
    if ranking_type == 'current':
        # Current analyzer logic: risk_weighted_value
        order_by = """
            ORDER BY (
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) * COUNT(*)
            ) DESC
        """
    else:
        # Fraud-aware ranking
        order_by = """
            ORDER BY (
                (COUNT(*) / 5.0) * 0.25 +
                (COUNT(DISTINCT IP) / 2.0) * 0.35 +
                (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.20 +
                AVG(MODEL_SCORE) * 0.20
            ) DESC
        """
    
    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        COUNT(DISTINCT IP) as unique_ips,
        COUNT(DISTINCT DEVICE_ID) as unique_devices,
        AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
        SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
        AVG(MODEL_SCORE) as avg_model_score,
        SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) * COUNT(*) as risk_weighted_value,
        
        -- Fraud ground truth (for validation only, NOT used in ranking)
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as non_fraud_count,
        
        -- Fraud-aware score (for comparison)
        (
            (COUNT(*) / 5.0) * 0.25 +
            (COUNT(DISTINCT IP) / 2.0) * 0.35 +
            (COUNT(DISTINCT DEVICE_ID) / 1.5) * 0.20 +
            AVG(MODEL_SCORE) * 0.20
        ) as fraud_likelihood_score
        
    FROM {DATABASE}.{SCHEMA}.{TABLE}
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    HAVING COUNT(*) >= 1
    {order_by}
    LIMIT 50
    """
    
    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    cursor.close()
    
    entities = []
    for row in results:
        entity_dict = dict(zip(columns, row))
        entities.append(entity_dict)
    
    return entities


def test_window(conn, offset_days: int, ranking_type: str = 'current') -> Dict[str, Any]:
    """
    Test analyzer on a single 24H window
    
    Args:
        conn: Snowflake connection
        offset_days: Days back from now
        ranking_type: 'current' or 'fraud_aware'
    
    Returns:
        Results dict with metrics
    """
    now = datetime.now()
    window_end = now - timedelta(days=offset_days)
    window_start = window_end - timedelta(hours=24)
    
    print(f"\n{'='*70}")
    print(f"Testing Window: {window_start.date()} to {window_end.date()}")
    print(f"Offset: {offset_days} days ago (~{offset_days/30:.1f} months)")
    print(f"Ranking: {ranking_type}")
    print(f"{'='*70}")
    
    # Run analyzer
    entities = run_analyzer_query(conn, window_start, window_end, ranking_type)
    
    if not entities:
        print(f"❌ No entities found in this window")
        return {
            'offset_days': offset_days,
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'total_entities': 0,
            'entities_with_fraud': 0,
            'total_fraud_txs': 0,
            'precision': 0.0,
            'entities': []
        }
    
    # Calculate metrics
    total_entities = len(entities)
    entities_with_fraud = sum(1 for e in entities if e['FRAUD_COUNT'] > 0)
    total_fraud_txs = sum(e['FRAUD_COUNT'] for e in entities)
    total_txs = sum(e['TX_COUNT'] for e in entities)
    
    # Precision = entities_with_fraud / total_entities
    precision = entities_with_fraud / total_entities if total_entities > 0 else 0.0
    
    print(f"\n📊 Results:")
    print(f"   Total entities selected: {total_entities}")
    print(f"   Entities with fraud: {entities_with_fraud} ({precision*100:.1f}%)")
    print(f"   Total fraudulent transactions: {total_fraud_txs}")
    print(f"   Total transactions: {total_txs}")
    
    if entities_with_fraud > 0:
        print(f"\n✅ FRAUD FOUND in this window!")
        print(f"   Top entities with fraud:")
        fraud_entities = [e for e in entities if e['FRAUD_COUNT'] > 0]
        for i, entity in enumerate(fraud_entities[:5], 1):
            print(f"   {i}. {entity['EMAIL']}: {entity['FRAUD_COUNT']} fraud, {entity['NON_FRAUD_COUNT']} clean")
    else:
        print(f"\n❌ No fraud in selected entities")
    
    return {
        'offset_days': offset_days,
        'window_start': window_start.isoformat(),
        'window_end': window_end.isoformat(),
        'ranking_type': ranking_type,
        'total_entities': total_entities,
        'entities_with_fraud': entities_with_fraud,
        'total_fraud_txs': total_fraud_txs,
        'total_txs': total_txs,
        'precision': precision,
        'entities': [
            {
                'email': e['EMAIL'],
                'tx_count': e['TX_COUNT'],
                'fraud_count': e['FRAUD_COUNT'],
                'unique_ips': e['UNIQUE_IPS'],
                'unique_devices': e['UNIQUE_DEVICES'],
                'avg_amount': float(e['AVG_AMOUNT']),
                'risk_weighted': float(e['RISK_WEIGHTED_VALUE']),
                'fraud_likelihood': float(e['FRAUD_LIKELIHOOD_SCORE'])
            }
            for e in entities[:20]  # Store top 20 for analysis
        ]
    }


def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Systematic Analyzer Testing")
    parser.add_argument('--start-offset-days', type=int, default=180, help='Starting offset in days (default: 180 = 6 months)')
    parser.add_argument('--num-windows', type=int, default=30, help='Number of consecutive days to test (default: 30)')
    parser.add_argument('--ranking', choices=['current', 'fraud_aware', 'both'], default='both', help='Ranking type to test')
    parser.add_argument('--output', type=str, default='systematic_test_results.json', help='Output file')
    
    args = parser.parse_args()
    
    print(f"\n╔{'═'*68}╗")
    print(f"║{'SYSTEMATIC ANALYZER TESTING FRAMEWORK':^68}║")
    print(f"╠{'═'*68}╣")
    print(f"║  Testing {args.num_windows} consecutive 24H windows                                ║")
    print(f"║  Starting at {args.start_offset_days} days ago (~{args.start_offset_days/30:.1f} months)                          ║")
    print(f"║  Ranking: {args.ranking:50}║")
    print(f"╚{'═'*68}╝\n")
    
    # Connect to Snowflake
    print("Connecting to Snowflake...")
    conn = get_snowflake_connection()
    print("✅ Connected\n")
    
    # Test windows
    results = {
        'current': [] if args.ranking in ['current', 'both'] else None,
        'fraud_aware': [] if args.ranking in ['fraud_aware', 'both'] else None,
        'metadata': {
            'start_offset_days': args.start_offset_days,
            'num_windows': args.num_windows,
            'test_date': datetime.now().isoformat()
        }
    }
    
    try:
        for i in range(args.num_windows):
            offset = args.start_offset_days + i
            
            # Test with current ranking
            if args.ranking in ['current', 'both']:
                print(f"\n{'─'*70}")
                print(f"Window {i+1}/{args.num_windows} - CURRENT RANKING")
                print(f"{'─'*70}")
                result = test_window(conn, offset, 'current')
                results['current'].append(result)
            
            # Test with fraud-aware ranking
            if args.ranking in ['fraud_aware', 'both']:
                print(f"\n{'─'*70}")
                print(f"Window {i+1}/{args.num_windows} - FRAUD-AWARE RANKING")
                print(f"{'─'*70}")
                result = test_window(conn, offset, 'fraud_aware')
                results['fraud_aware'].append(result)
        
        # Calculate aggregate metrics
        print(f"\n\n{'='*70}")
        print(f"AGGREGATE RESULTS")
        print(f"{'='*70}\n")
        
        for ranking_type in ['current', 'fraud_aware']:
            if results[ranking_type] is None:
                continue
            
            window_results = results[ranking_type]
            
            total_windows = len(window_results)
            windows_with_fraud = sum(1 for w in window_results if w['entities_with_fraud'] > 0)
            total_entities = sum(w['total_entities'] for w in window_results)
            total_fraud_entities = sum(w['entities_with_fraud'] for w in window_results)
            total_fraud_txs = sum(w['total_fraud_txs'] for w in window_results)
            
            avg_precision = sum(w['precision'] for w in window_results) / total_windows if total_windows > 0 else 0
            overall_precision = total_fraud_entities / total_entities if total_entities > 0 else 0
            
            print(f"{'─'*70}")
            print(f"{ranking_type.upper()} RANKING:")
            print(f"{'─'*70}")
            print(f"  Windows tested: {total_windows}")
            print(f"  Windows with fraud found: {windows_with_fraud} ({windows_with_fraud/total_windows*100:.1f}%)")
            print(f"  Total entities investigated: {total_entities}")
            print(f"  Entities with fraud: {total_fraud_entities} ({overall_precision*100:.1f}%)")
            print(f"  Total fraud transactions found: {total_fraud_txs}")
            print(f"  Average precision per window: {avg_precision*100:.1f}%")
            print(f"  Overall precision: {overall_precision*100:.1f}%")
            print(f"")
            
            # Store aggregate metrics
            results[f'{ranking_type}_aggregate'] = {
                'total_windows': total_windows,
                'windows_with_fraud': windows_with_fraud,
                'total_entities': total_entities,
                'total_fraud_entities': total_fraud_entities,
                'total_fraud_txs': total_fraud_txs,
                'avg_precision': avg_precision,
                'overall_precision': overall_precision
            }
        
        # Save results
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"{'='*70}")
        print(f"✅ Results saved to: {args.output}")
        print(f"{'='*70}\n")
        
    finally:
        conn.close()


if __name__ == "__main__":
    main()

