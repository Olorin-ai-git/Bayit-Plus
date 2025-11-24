#!/usr/bin/env python3
"""
Systematic 24-Hour Moving Window Test

Runs the analyzer on consecutive 24-hour windows going backwards through time,
investigating ALL entities from each window until we find fraud.

Based on systematic testing that found MODEL_SCORE > 0.4 optimal.
"""

import asyncio
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def run_analyzer_on_window(window_start_offset_days: int) -> Dict[str, Any]:
    """
    Run analyzer on a specific 24-hour window.
    
    Args:
        window_start_offset_days: Days before current date (e.g., 180 = 6 months ago)
        
    Returns:
        Analyzer results dictionary
    """
    # Calculate months offset from days
    months_offset = window_start_offset_days // 30
    
    # Set environment for this window
    os.environ['ANALYZER_END_OFFSET_MONTHS'] = str(months_offset)
    os.environ['ANALYZER_TIME_WINDOW_HOURS'] = '24'
    
    # Calculate actual date range
    target_date = datetime.now() - timedelta(days=window_start_offset_days)
    
    logger.info(f"")
    logger.info(f"{'='*80}")
    logger.info(f"📅 WINDOW: {target_date.strftime('%Y-%m-%d')} (T-{window_start_offset_days} days)")
    logger.info(f"{'='*80}")
    
    # Get risk analyzer
    analyzer = get_risk_analyzer()
    
    # Run analysis
    results = await analyzer.get_top_risk_entities(force_refresh=True)
    
    if results.get('status') != 'success':
        logger.error(f"❌ Analyzer failed: {results.get('error', 'Unknown error')}")
        return None
    
    entities = results.get('entities', [])
    logger.info(f"✅ Found {len(entities)} entities")
    
    return {
        'window_date': target_date.strftime('%Y-%m-%d'),
        'window_offset_days': window_start_offset_days,
        'entity_count': len(entities),
        'entities': entities,
        'results': results
    }


async def investigate_all_entities(window_data: Dict[str, Any], max_entities: int = None) -> List[Dict[str, Any]]:
    """
    Investigate ALL entities from a window (or up to max_entities).
    
    Args:
        window_data: Window data from run_analyzer_on_window
        max_entities: Maximum entities to investigate (None = all)
        
    Returns:
        List of investigation results
    """
    entities = window_data['entities']
    if max_entities:
        entities = entities[:max_entities]
    
    logger.info(f"")
    logger.info(f"🔍 INVESTIGATING {len(entities)} ENTITIES")
    logger.info(f"")
    
    investigation_results = []
    reports_dir = Path("artifacts/comparisons/systematic_test")
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    for i, entity_data in enumerate(entities, 1):
        entity_value = entity_data.get('entity_value')
        entity_type = entity_data.get('entity_type', 'email')
        
        logger.info(f"")
        logger.info(f"[{i}/{len(entities)}] Investigating: {entity_type}={entity_value}")
        
        try:
            result = await run_auto_comparison_for_entity(
                entity_type=entity_type,
                entity_value=entity_value,
                entity_data=entity_data,
                reports_dir=reports_dir
            )
            
            investigation_results.append({
                'entity': entity_value,
                'entity_type': entity_type,
                'status': result.get('status'),
                'investigation_id': result.get('investigation_id'),
                'metrics': result.get('metrics', {}),
                'has_package': result.get('entity_package_path') is not None
            })
            
            # Check for fraud in metrics
            metrics = result.get('metrics', {})
            if metrics.get('window_a_transactions', 0) > 0:
                logger.info(f"   📊 Window A: {metrics['window_a_transactions']} transactions")
            
        except Exception as e:
            logger.error(f"   ❌ Investigation failed: {e}")
            investigation_results.append({
                'entity': entity_value,
                'entity_type': entity_type,
                'status': 'error',
                'error': str(e)
            })
    
    return investigation_results


async def check_for_fraud(investigation_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Check investigation results for fraud detection.
    
    Looks for:
    - Confusion matrices with TP > 0
    - IS_FRAUD_TX = 1 in transactions
    
    Args:
        investigation_results: List of investigation result dictionaries
        
    Returns:
        Fraud detection summary
    """
    logger.info(f"")
    logger.info(f"🔍 CHECKING FOR FRAUD DETECTION")
    logger.info(f"")
    
    fraud_found = []
    total_entities = len(investigation_results)
    successful = sum(1 for r in investigation_results if r.get('status') == 'success')
    
    # Check confusion tables for fraud
    confusion_tables_dir = Path("artifacts/comparisons/systematic_test")
    
    for result in investigation_results:
        if result.get('status') != 'success':
            continue
        
        investigation_id = result.get('investigation_id')
        if not investigation_id:
            continue
        
        # Look for confusion table
        confusion_tables = list(confusion_tables_dir.glob(f"**/confusion_table_{investigation_id}_*.html"))
        
        for conf_table in confusion_tables:
            # Read HTML and check for TP > 0
            try:
                content = conf_table.read_text()
                if 'TP=' in content and 'TP=0' not in content:
                    # Found potential fraud
                    fraud_found.append({
                        'entity': result['entity'],
                        'investigation_id': investigation_id,
                        'confusion_table': str(conf_table)
                    })
                    logger.info(f"   🎯 FRAUD DETECTED: {result['entity']}")
            except Exception as e:
                logger.warning(f"   ⚠️ Failed to read {conf_table}: {e}")
    
    summary = {
        'total_entities': total_entities,
        'successful_investigations': successful,
        'fraud_entities_found': len(fraud_found),
        'precision': len(fraud_found) / successful if successful > 0 else 0,
        'fraud_details': fraud_found
    }
    
    logger.info(f"")
    logger.info(f"📊 FRAUD DETECTION SUMMARY:")
    logger.info(f"   Total Entities:       {summary['total_entities']}")
    logger.info(f"   Successful Inv:       {summary['successful_investigations']}")
    logger.info(f"   Fraud Found:          {summary['fraud_entities_found']}")
    logger.info(f"   Precision:            {summary['precision']:.1%}")
    logger.info(f"")
    
    return summary


async def systematic_window_test(
    start_offset_days: int = 180,
    num_windows: int = 30,
    max_entities_per_window: int = 50,
    stop_on_fraud: bool = True
) -> Dict[str, Any]:
    """
    Run systematic test across multiple 24-hour windows.
    
    Args:
        start_offset_days: Starting point (days ago, e.g., 180 = 6 months)
        num_windows: Number of consecutive windows to test
        max_entities_per_window: Max entities to investigate per window
        stop_on_fraud: Stop when fraud is found
        
    Returns:
        Complete test results
    """
    logger.info(f"")
    logger.info(f"{'='*80}")
    logger.info(f"🚀 SYSTEMATIC 24-HOUR MOVING WINDOW TEST")
    logger.info(f"{'='*80}")
    logger.info(f"")
    logger.info(f"Configuration:")
    logger.info(f"   Start Offset:     {start_offset_days} days ago")
    logger.info(f"   Num Windows:      {num_windows}")
    logger.info(f"   Max per Window:   {max_entities_per_window} entities")
    logger.info(f"   Stop on Fraud:    {stop_on_fraud}")
    logger.info(f"   Filter:           MODEL_SCORE > 0.4")
    logger.info(f"   Ranking:          Volume (COUNT DESC)")
    logger.info(f"")
    
    all_results = []
    fraud_found_in_windows = []
    
    for window_idx in range(num_windows):
        offset_days = start_offset_days + window_idx
        
        # Run analyzer on this window
        window_data = await run_analyzer_on_window(offset_days)
        
        if not window_data:
            logger.warning(f"⚠️ Skipping window at T-{offset_days} (analyzer failed)")
            continue
        
        # Investigate entities from this window
        investigation_results = await investigate_all_entities(
            window_data,
            max_entities=max_entities_per_window
        )
        
        # Check for fraud
        fraud_summary = await check_for_fraud(investigation_results)
        
        window_result = {
            'window': window_idx + 1,
            'date': window_data['window_date'],
            'offset_days': offset_days,
            'entities_found': window_data['entity_count'],
            'entities_investigated': len(investigation_results),
            'fraud_found': fraud_summary['fraud_entities_found'],
            'precision': fraud_summary['precision'],
            'investigation_results': investigation_results,
            'fraud_summary': fraud_summary
        }
        
        all_results.append(window_result)
        
        if fraud_summary['fraud_entities_found'] > 0:
            fraud_found_in_windows.append(window_idx + 1)
            logger.info(f"")
            logger.info(f"✅ FRAUD FOUND IN WINDOW {window_idx + 1}!")
            logger.info(f"")
            
            if stop_on_fraud:
                logger.info(f"🛑 Stopping test (fraud found)")
                break
        
        # Save progress
        progress_file = Path("artifacts/systematic_test_progress.json")
        with open(progress_file, 'w') as f:
            json.dump({
                'windows_tested': window_idx + 1,
                'fraud_windows': fraud_found_in_windows,
                'results': all_results
            }, f, indent=2, default=str)
    
    # Generate final summary
    total_entities_investigated = sum(r['entities_investigated'] for r in all_results)
    total_fraud_found = sum(r['fraud_found'] for r in all_results)
    overall_precision = total_fraud_found / total_entities_investigated if total_entities_investigated > 0 else 0
    
    final_summary = {
        'test_completed': datetime.now().isoformat(),
        'windows_tested': len(all_results),
        'total_entities_investigated': total_entities_investigated,
        'total_fraud_found': total_fraud_found,
        'overall_precision': overall_precision,
        'fraud_windows': fraud_found_in_windows,
        'window_results': all_results
    }
    
    # Save final results
    final_file = Path("artifacts/systematic_test_final_results.json")
    with open(final_file, 'w') as f:
        json.dump(final_summary, f, indent=2, default=str)
    
    logger.info(f"")
    logger.info(f"{'='*80}")
    logger.info(f"📊 FINAL SUMMARY")
    logger.info(f"{'='*80}")
    logger.info(f"   Windows Tested:       {final_summary['windows_tested']}")
    logger.info(f"   Entities Investigated: {final_summary['total_entities_investigated']}")
    logger.info(f"   Fraud Found:          {final_summary['total_fraud_found']}")
    logger.info(f"   Overall Precision:    {final_summary['overall_precision']:.1%}")
    logger.info(f"   Fraud in Windows:     {fraud_found_in_windows}")
    logger.info(f"")
    logger.info(f"✅ Results saved to: {final_file}")
    logger.info(f"")
    
    return final_summary


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Systematic 24-hour moving window test')
    parser.add_argument('--start-offset', type=int, default=180,
                       help='Starting offset in days ago (default: 180 = 6 months)')
    parser.add_argument('--windows', type=int, default=30,
                       help='Number of windows to test (default: 30)')
    parser.add_argument('--max-entities', type=int, default=50,
                       help='Max entities per window (default: 50)')
    parser.add_argument('--no-stop', action='store_true',
                       help='Continue even after finding fraud')
    
    args = parser.parse_args()
    
    # Run the test
    results = asyncio.run(systematic_window_test(
        start_offset_days=args.start_offset,
        num_windows=args.windows,
        max_entities_per_window=args.max_entities,
        stop_on_fraud=not args.no_stop
    ))
    
    if results['total_fraud_found'] > 0:
        print(f"\n✅ SUCCESS! Found {results['total_fraud_found']} fraud entities")
        print(f"   Precision: {results['overall_precision']:.1%}")
        print(f"   Windows with fraud: {results['fraud_windows']}")
    else:
        print(f"\n⚠️ No fraud found in {results['windows_tested']} windows")
        print(f"   Try extending the test with more windows")

