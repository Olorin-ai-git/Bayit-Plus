#!/usr/bin/env python3
"""
Script to check if investigations have overall_risk_score stored.
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.persistence import list_investigations

def check_investigation_risk_scores(entity_value: str = None, entity_type: str = None):
    """Check investigations for overall_risk_score."""
    print("🔍 Checking investigations for overall_risk_score...\n")
    
    investigations = list_investigations()
    
    if entity_value:
        investigations = [
            inv for inv in investigations
            if inv.get('entity_id') == entity_value or inv.get('entity_value') == entity_value
        ]
    
    if entity_type:
        investigations = [
            inv for inv in investigations
            if inv.get('entity_type') == entity_type
        ]
    
    print(f"Found {len(investigations)} investigation(s)\n")
    
    completed_with_score = 0
    completed_without_score = 0
    incomplete = 0
    
    for inv in investigations:
        inv_id = inv.get('id') or inv.get('investigation_id', 'unknown')
        status = inv.get('status', 'unknown')
        overall_risk_score = inv.get('overall_risk_score')
        entity_id = inv.get('entity_id') or inv.get('entity_value', 'unknown')
        entity_type_val = inv.get('entity_type', 'unknown')
        
        if status.upper() in ('COMPLETED', 'COMPLETE'):
            if overall_risk_score is not None:
                completed_with_score += 1
                print(f"✅ {inv_id[:12]}... | {entity_type_val}:{entity_id[:30]} | Risk: {overall_risk_score:.3f}")
            else:
                completed_without_score += 1
                print(f"⚠️  {inv_id[:12]}... | {entity_type_val}:{entity_id[:30]} | Risk: MISSING")
        else:
            incomplete += 1
    
    print(f"\n📊 Summary:")
    print(f"   Completed with risk score: {completed_with_score}")
    print(f"   Completed without risk score: {completed_without_score}")
    print(f"   Incomplete: {incomplete}")
    
    if completed_without_score > 0:
        print(f"\n⚠️  {completed_without_score} completed investigation(s) are missing risk scores!")
        print(f"   These will have predicted_risk=None in comparisons (NO FALLBACK to MODEL_SCORE).")

if __name__ == "__main__":
    entity_value = sys.argv[1] if len(sys.argv) > 1 else None
    entity_type = sys.argv[2] if len(sys.argv) > 2 else None
    
    check_investigation_risk_scores(entity_value, entity_type)
