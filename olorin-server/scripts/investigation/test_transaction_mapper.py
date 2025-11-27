#!/usr/bin/env python3
"""
Test script to verify transaction ID mapping in investigation state.

This tests whether transaction_scores are persisting properly and whether the
investigation state is correctly storing all transaction scores.
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.persistence.database import get_db
from app.models.investigation_state import InvestigationState


def check_investigation_transaction_scores(investigation_id: str):
    """Check how many transaction scores are in the investigation state."""
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        inv = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if not inv:
            print(f"❌ Investigation {investigation_id} not found")
            return
            
        print(f"\n{'='*80}")
        print(f"Investigation: {investigation_id}")
        print(f"{'='*80}")
        print(f"Status: {inv.status}")
        
        # Parse progress_json
        try:
            progress = json.loads(inv.progress_json) if inv.progress_json else {}
        except Exception as e:
            print(f"❌ Failed to parse progress_json: {e}")
            return
            
        # Check transaction_scores
        tx_scores = progress.get("transaction_scores", {})
        print(f"\n📊 Transaction Scores: {len(tx_scores)}")
        
        if len(tx_scores) > 0:
            print(f"\n   Sample Scores (first 10):")
            for i, (tx_id, score) in enumerate(list(tx_scores.items())[:10]):
                print(f"     {i+1}. {tx_id}: {score}")
                
        # Check if there's a limit being applied
        if len(tx_scores) == 2000:
            print(f"\n⚠️  WARNING: Exactly 2000 transaction scores detected!")
            print(f"   This suggests a sampling/limit is being applied")
        elif len(tx_scores) > 0:
            print(f"\n✅ Transaction scores count is not exactly 2000 ({len(tx_scores)})")
            
        # Check snowflake_data if available
        snowflake_data = progress.get("snowflake_data", {})
        if snowflake_data and isinstance(snowflake_data, dict):
            results = snowflake_data.get("results", [])
            print(f"\n📊 Snowflake Data Results: {len(results)} transactions")
            
            if len(results) != len(tx_scores):
                print(f"\n⚠️  MISMATCH:")
                print(f"   Snowflake Results: {len(results)}")
                print(f"   Transaction Scores: {len(tx_scores)}")
                print(f"   Missing Scores: {len(results) - len(tx_scores)}")
        else:
            print(f"\n⚠️  No snowflake_data found in progress_json")
            
        print(f"{'='*80}\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    # Test with the latest investigation
    investigation_id = "auto-comp-c8b54e6451e5"
    
    if len(sys.argv) > 1:
        investigation_id = sys.argv[1]
        
    check_investigation_transaction_scores(investigation_id)


