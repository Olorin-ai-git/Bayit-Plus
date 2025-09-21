#!/usr/bin/env python3
"""
Get top risk entities from Snowflake.

Usage:
    poetry run python scripts/get_top_risk_entities.py
    poetry run python scripts/get_top_risk_entities.py --time-window 7d --group-by device_id --top 5
"""

import asyncio
import argparse
import json
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def main():
    parser = argparse.ArgumentParser(description='Get top risk entities from Snowflake')
    parser.add_argument('--time-window', default='24h', 
                        help='Time window: 1h, 6h, 12h, 24h, 7d, 30d (default: 24h)')
    parser.add_argument('--group-by', default='email',
                        help='Group by field: email, device_id, ip (default: email)')
    parser.add_argument('--top', type=float, default=10,
                        help='Top percentage to return (default: 10)')
    parser.add_argument('--force-refresh', action='store_true',
                        help='Force refresh, bypass cache')
    parser.add_argument('--json', action='store_true',
                        help='Output as JSON')
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print(f"🎯 FETCHING TOP {args.top}% RISK ENTITIES")
    print("="*70)
    print(f"Time Window: {args.time_window}")
    print(f"Group By: {args.group_by}")
    print(f"Force Refresh: {args.force_refresh}")
    print("-"*70)
    
    # Get the risk analyzer
    analyzer = get_risk_analyzer()
    
    # Fetch top risk entities
    print("\n⏳ Querying Snowflake...")
    results = await analyzer.get_top_risk_entities(
        time_window=args.time_window,
        group_by=args.group_by,
        top_percentage=args.top,
        force_refresh=args.force_refresh
    )
    
    if args.json:
        # Output as JSON
        print(json.dumps(results, indent=2))
    else:
        # Pretty print results
        if results.get('status') == 'success':
            entities = results.get('entities', [])
            
            if entities:
                print(f"\n✅ Found {len(entities)} high-risk entities:\n")
                print(f"{'Rank':<6} {'Entity':<40} {'Risk Score':<12} {'Risk Value':<15} {'Txns':<6} {'Fraud'}")
                print("-"*95)
                
                for i, entity in enumerate(entities, 1):
                    entity_id = str(entity.get('entity') or 'Unknown')[:38]
                    risk_score = entity.get('risk_score', 0) or 0
                    risk_value = entity.get('risk_weighted_value', 0) or 0
                    tx_count = entity.get('transaction_count', 0) or 0
                    fraud_count = entity.get('fraud_count', 0) or 0
                    
                    print(f"{i:<6} {entity_id:<40} {risk_score:<12.4f} ${risk_value:<14,.2f} {tx_count:<6} {fraud_count}")
            else:
                print("\n⚠️  No entities found for the specified criteria")
            
            # Print summary
            summary = results.get('summary', {})
            if summary:
                print("\n" + "="*70)
                print("📊 SUMMARY STATISTICS")
                print("="*70)
                print(f"Total Entities Analyzed: {summary.get('total_entities', 0):,}")
                print(f"Total Risk Value: ${summary.get('total_risk_value', 0):,.2f}")
                print(f"Total Transactions: {summary.get('total_transactions', 0):,}")
                print(f"Overall Fraud Rate: {summary.get('fraud_rate', 0):.2%}")
                print(f"Time Period: Last {args.time_window}")
                print(f"Showing Top: {args.top}%")
        else:
            print(f"\n❌ Failed to fetch entities: {results.get('error', 'Unknown error')}")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(main())