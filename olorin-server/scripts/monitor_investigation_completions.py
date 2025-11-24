#!/usr/bin/env python3
"""
Monitor investigation completions and verify risk scores are persisted.
"""
import sys
import os
import time
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import list_investigations

def monitor_completions(check_interval_seconds: int = 30, max_checks: int = 20):
    """
    Monitor for new investigation completions with risk scores.
    
    Args:
        check_interval_seconds: How often to check (default: 30 seconds)
        max_checks: Maximum number of checks before stopping (default: 20 = 10 minutes)
    """
    print("🔍 Monitoring investigation completions...")
    print(f"   Check interval: {check_interval_seconds} seconds")
    print(f"   Max checks: {max_checks} (total time: {max_checks * check_interval_seconds / 60:.1f} minutes)\n")
    
    # Track previously seen investigations
    seen_investigation_ids = set()
    
    # Get initial list
    initial_investigations = list_investigations()
    for inv in initial_investigations:
        if inv.get('status', '').upper() in ('COMPLETED', 'COMPLETE'):
            seen_investigation_ids.add(inv.get('id') or inv.get('investigation_id', ''))
    
    print(f"📊 Initial state: {len(seen_investigation_ids)} completed investigations already seen\n")
    
    for check_num in range(1, max_checks + 1):
        print(f"[Check {check_num}/{max_checks}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            investigations = list_investigations()
            
            # Find new completions
            new_completions = []
            new_with_scores = []
            new_without_scores = []
            
            for inv in investigations:
                inv_id = inv.get('id') or inv.get('investigation_id', 'unknown')
                status = inv.get('status', 'unknown')
                
                if status.upper() in ('COMPLETED', 'COMPLETE'):
                    if inv_id not in seen_investigation_ids:
                        # New completion!
                        seen_investigation_ids.add(inv_id)
                        new_completions.append(inv)
                        
                        overall_risk_score = inv.get('overall_risk_score')
                        entity_id = inv.get('entity_id') or inv.get('entity_value', 'unknown')
                        entity_type = inv.get('entity_type', 'unknown')
                        
                        if overall_risk_score is not None:
                            new_with_scores.append({
                                'id': inv_id,
                                'entity': f"{entity_type}:{entity_id[:30]}",
                                'risk_score': overall_risk_score
                            })
                        else:
                            new_without_scores.append({
                                'id': inv_id,
                                'entity': f"{entity_type}:{entity_id[:30]}"
                            })
            
            if new_completions:
                print(f"   ✅ Found {len(new_completions)} new completion(s)!")
                
                if new_with_scores:
                    print(f"   ✅ {len(new_with_scores)} with risk scores:")
                    for inv in new_with_scores:
                        print(f"      • {inv['id'][:12]}... | {inv['entity']} | Risk: {inv['risk_score']:.3f}")
                
                if new_without_scores:
                    print(f"   ⚠️  {len(new_without_scores)} without risk scores:")
                    for inv in new_without_scores:
                        print(f"      • {inv['id'][:12]}... | {inv['entity']} | Risk: MISSING")
                
                print()  # Blank line
            else:
                # Check for running investigations
                running_count = sum(
                    1 for inv in investigations
                    if inv.get('status', '').upper() in ('RUNNING', 'PENDING', 'IN_PROGRESS')
                )
                
                if running_count > 0:
                    print(f"   ⏳ {running_count} investigation(s) still running...")
                else:
                    print(f"   💤 No new completions (no investigations running)")
            
        except Exception as e:
            print(f"   ❌ Error checking investigations: {e}")
        
        # Wait before next check (except on last iteration)
        if check_num < max_checks:
            time.sleep(check_interval_seconds)
    
    print(f"\n📊 Final Summary:")
    print(f"   Total completed investigations seen: {len(seen_investigation_ids)}")
    
    # Final check of all investigations
    final_investigations = list_investigations()
    completed_with_score = sum(
        1 for inv in final_investigations
        if inv.get('status', '').upper() in ('COMPLETED', 'COMPLETE')
        and inv.get('overall_risk_score') is not None
    )
    completed_without_score = sum(
        1 for inv in final_investigations
        if inv.get('status', '').upper() in ('COMPLETED', 'COMPLETE')
        and inv.get('overall_risk_score') is None
    )
    
    print(f"   Completed with risk score: {completed_with_score}")
    print(f"   Completed without risk score: {completed_without_score}")
    
    if completed_with_score > 0:
        print(f"\n✅ Success! Found {completed_with_score} investigation(s) with risk scores.")
        print(f"   These can now be used for comparison metrics.")
    else:
        print(f"\n⚠️  No investigations with risk scores found yet.")
        print(f"   Waiting for new investigations to complete...")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Monitor investigation completions")
    parser.add_argument(
        '--interval',
        type=int,
        default=30,
        help='Check interval in seconds (default: 30)'
    )
    parser.add_argument(
        '--max-checks',
        type=int,
        default=20,
        help='Maximum number of checks (default: 20)'
    )
    
    args = parser.parse_args()
    
    monitor_completions(
        check_interval_seconds=args.interval,
        max_checks=args.max_checks
    )

