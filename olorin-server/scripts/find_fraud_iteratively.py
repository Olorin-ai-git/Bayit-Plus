#!/usr/bin/env python3
"""
Iterative Fraud Finder
Slides the 24H analyzer window backwards in time until fraudulent transactions are found.

Strategy:
1. Start at current offset (6 months ago)
2. Run analyzer for 24H window
3. Check if any entities have IS_FRAUD_TX=1 transactions
4. If no fraud found, move backwards 1 day
5. Repeat until fraud is found
6. Investigate those entities

Usage:
    python scripts/find_fraud_iteratively.py --max-iterations 30 --entities-per-window 5
"""

import os
import sys
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def check_for_fraud_in_window(
    start_offset_months: int,
    time_window_hours: int = 24
) -> Tuple[bool, int, List[Dict[str, Any]]]:
    """
    Check if analyzer window contains fraudulent transactions.
    
    Args:
        start_offset_months: Months back from now to END the window
        time_window_hours: Duration of analyzer window in hours
        
    Returns:
        (has_fraud, total_fraud_count, entities_with_fraud)
    """
    logger.info(f"")
    logger.info(f"{'='*70}")
    logger.info(f"🔍 Checking window: {start_offset_months} months ago, {time_window_hours}H duration")
    logger.info(f"{'='*70}")
    
    # Calculate dates
    now = datetime.utcnow()
    window_end = now - timedelta(days=start_offset_months * 30)
    window_start = window_end - timedelta(hours=time_window_hours)
    
    logger.info(f"📅 Window: {window_start.date()} to {window_end.date()}")
    
    # Query database for fraud in this window
    db_provider = get_database_provider()
    db_provider.connect()
    
    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as total_txs,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN IS_FRAUD_TX = 0 THEN 1 ELSE 0 END) as non_fraud_count
    FROM DBT.DBT_PROD.TXS
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
      AND EMAIL IS NOT NULL
    GROUP BY EMAIL
    HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
    ORDER BY fraud_count DESC
    LIMIT 10
    """
    
    try:
        result = db_provider.execute_query(query)
        entities_with_fraud = []
        total_fraud_count = 0
        
        if result:
            for row in result:
                entity_data = {
                    'email': row.get('EMAIL') or row.get('email'),
                    'total_transactions': row.get('TOTAL_TXS') or row.get('total_txs'),
                    'fraud_count': row.get('FRAUD_COUNT') or row.get('fraud_count'),
                    'non_fraud_count': row.get('NON_FRAUD_COUNT') or row.get('non_fraud_count')
                }
                entities_with_fraud.append(entity_data)
                total_fraud_count += entity_data['fraud_count']
            
            logger.info(f"")
            logger.info(f"✅ FRAUD FOUND!")
            logger.info(f"   Total entities with fraud: {len(entities_with_fraud)}")
            logger.info(f"   Total fraudulent transactions: {total_fraud_count}")
            logger.info(f"")
            logger.info(f"   Top entities with fraud:")
            for i, entity in enumerate(entities_with_fraud[:5], 1):
                logger.info(f"   {i}. {entity['email']}: {entity['fraud_count']} fraud, {entity['non_fraud_count']} clean")
            
            return True, total_fraud_count, entities_with_fraud
        else:
            logger.info(f"❌ No fraud in this window")
            return False, 0, []
            
    except Exception as e:
        logger.error(f"Error checking window: {e}")
        return False, 0, []
    finally:
        db_provider.disconnect()


async def run_analyzer_on_window(start_offset_months: int, time_window_hours: int = 24) -> Optional[Dict[str, Any]]:
    """
    Run risk analyzer on specified window.
    
    Args:
        start_offset_months: Months back from now to END the window
        time_window_hours: Duration of analyzer window in hours
        
    Returns:
        Analyzer results dict or None if failed
    """
    logger.info(f"")
    logger.info(f"🎯 Running analyzer on window {start_offset_months} months ago...")
    
    try:
        analyzer = get_risk_analyzer()
        
        # Temporarily update environment for this run
        os.environ['ANALYZER_END_OFFSET_MONTHS'] = str(start_offset_months)
        os.environ['ANALYZER_TIME_WINDOW_HOURS'] = str(time_window_hours)
        
        results = await analyzer.analyze_risk_entities(
            group_by='email',
            time_window=f"{time_window_hours}h",
            limit=10
        )
        
        if results and results.get('status') == 'success':
            entity_count = len(results.get('entities', []))
            logger.info(f"✅ Analyzer found {entity_count} entities")
            return results
        else:
            logger.warning(f"⚠️ Analyzer returned no results")
            return None
            
    except Exception as e:
        logger.error(f"❌ Analyzer failed: {e}")
        return None


async def main():
    """Main execution loop."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Find fraudulent transactions by sliding analyzer window backwards")
    parser.add_argument('--start-offset-months', type=int, default=6, help='Starting offset in months (default: 6)')
    parser.add_argument('--max-iterations', type=int, default=30, help='Maximum days to search backwards (default: 30)')
    parser.add_argument('--time-window-hours', type=int, default=24, help='Analyzer window duration in hours (default: 24)')
    parser.add_argument('--entities-per-window', type=int, default=5, help='Entities to investigate per window (default: 5)')
    parser.add_argument('--run-investigations', action='store_true', help='Run full investigations when fraud found')
    
    args = parser.parse_args()
    
    logger.info(f"")
    logger.info(f"╔{'═'*68}╗")
    logger.info(f"║  ITERATIVE FRAUD FINDER                                            ║")
    logger.info(f"╠{'═'*68}╣")
    logger.info(f"║  Strategy: Slide 24H window backwards until fraud is found        ║")
    logger.info(f"║  Start: {args.start_offset_months} months ago                                             ║")
    logger.info(f"║  Max Iterations: {args.max_iterations}                                              ║")
    logger.info(f"╚{'═'*68}╝")
    logger.info(f"")
    
    # Start searching
    current_offset_months = args.start_offset_months
    current_offset_days = current_offset_months * 30  # Convert to days for finer granularity
    
    iteration = 0
    fraud_found = False
    fraud_window_offset = None
    entities_with_fraud = []
    
    while iteration < args.max_iterations and not fraud_found:
        iteration += 1
        
        # Convert days back to months (approximate)
        months_offset = current_offset_days / 30.0
        
        logger.info(f"")
        logger.info(f"{'─'*70}")
        logger.info(f"Iteration {iteration}/{args.max_iterations}")
        logger.info(f"Checking window: {current_offset_days} days ago (~{months_offset:.1f} months)")
        logger.info(f"{'─'*70}")
        
        # Check for fraud in this window
        has_fraud, fraud_count, entities = await check_for_fraud_in_window(
            start_offset_months=int(months_offset),
            time_window_hours=args.time_window_hours
        )
        
        if has_fraud:
            fraud_found = True
            fraud_window_offset = int(months_offset)
            entities_with_fraud = entities
            logger.info(f"")
            logger.info(f"🎉 SUCCESS! Found {fraud_count} fraudulent transactions at {months_offset:.1f} months ago")
            break
        else:
            # Move backwards 1 day
            current_offset_days += 1
            logger.info(f"   Moving backwards 1 day...")
    
    if not fraud_found:
        logger.warning(f"")
        logger.warning(f"⚠️ No fraud found after {args.max_iterations} iterations")
        logger.warning(f"   Searched from {args.start_offset_months} to {current_offset_days} days ago")
        logger.warning(f"   Try increasing --max-iterations or searching further back")
        return
    
    # Summary
    logger.info(f"")
    logger.info(f"╔{'═'*68}╗")
    logger.info(f"║  FRAUD SEARCH COMPLETE                                             ║")
    logger.info(f"╠{'═'*68}╣")
    logger.info(f"║  Window Found: {fraud_window_offset} months ago (~{fraud_window_offset*30} days)                     ║")
    logger.info(f"║  Entities with Fraud: {len(entities_with_fraud)}                                           ║")
    logger.info(f"║  Iterations: {iteration}                                                    ║")
    logger.info(f"╚{'═'*68}╝")
    logger.info(f"")
    
    # Save results
    results_file = Path("fraud_search_results.json")
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "window_offset_months": fraud_window_offset,
        "iterations": iteration,
        "entities_with_fraud": entities_with_fraud,
        "total_fraud_count": sum(e['fraud_count'] for e in entities_with_fraud)
    }
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"📄 Results saved to: {results_file}")
    
    if args.run_investigations:
        logger.info(f"")
        logger.info(f"🚀 Running investigations on top {args.entities_per_window} entities...")
        logger.info(f"⚠️ This will take approximately {args.entities_per_window * 5} minutes")
        logger.info(f"")
        logger.info(f"To run investigations, restart server with:")
        logger.info(f"   ANALYZER_END_OFFSET_MONTHS={fraud_window_offset}")
        logger.info(f"   STARTUP_ANALYSIS_TOP_N_ENTITIES={args.entities_per_window}")
    else:
        logger.info(f"")
        logger.info(f"💡 To investigate these entities, restart server with:")
        logger.info(f"   ANALYZER_END_OFFSET_MONTHS={fraud_window_offset}")
        logger.info(f"   STARTUP_ANALYSIS_TOP_N_ENTITIES={args.entities_per_window}")


if __name__ == "__main__":
    asyncio.run(main())

