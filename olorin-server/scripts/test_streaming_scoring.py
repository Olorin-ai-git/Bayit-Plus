#!/usr/bin/env python3
"""
Test Streaming Batch Scoring - Verify Long-Term Solution

This script tests the streaming batch architecture with 100K+ transactions.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import os

# Configure for streaming mode
os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "100000"
os.environ["INVESTIGATION_SCORING_BATCH_SIZE"] = "5000"
os.environ["INVESTIGATION_PER_TX_SCORING_TIMEOUT"] = "3600"
os.environ["USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON"] = "false"

async def test_streaming_scoring():
    """Test merchant investigation with 100K transactions."""
    print("="*80)
    print("STREAMING BATCH SCORING TEST")
    print("="*80)
    print()
    print("Configuration:")
    print(f"  Max Transactions: {os.getenv('INVESTIGATION_MAX_TRANSACTIONS')}")
    print(f"  Batch Size: {os.getenv('INVESTIGATION_SCORING_BATCH_SIZE')}")
    print(f"  Timeout: {os.getenv('INVESTIGATION_PER_TX_SCORING_TIMEOUT')}s")
    print()
    print("Starting investigation...")
    print()
    
    from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
    
    result = await run_auto_comparison_for_entity(
        entity_value='Coinflow',
        entity_type='merchant'
    )
    
    investigation_id = result.get('investigation_id')
    
    print()
    print("="*80)
    print("INVESTIGATION COMPLETE")
    print("="*80)
    print(f"Investigation ID: {investigation_id}")
    print(f"Status: {result.get('status')}")
    print(f"Risk Score: {result.get('risk_score')}")
    print()
    
    # Verify streaming worked
    from app.service.transaction_score_service import TransactionScoreService
    from app.persistence.database import get_db
    from app.models.investigation_state import InvestigationState
    import json
    
    # Check database table
    db_count = TransactionScoreService.get_score_count(investigation_id)
    
    # Check state JSON
    db_gen = get_db()
    db = next(db_gen)
    try:
        inv = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        progress = json.loads(inv.progress_json) if inv.progress_json else {}
        state_scores = progress.get('transaction_scores', {})
        state_count = len(state_scores)
    finally:
        db.close()
    
    print("="*80)
    print("VERIFICATION RESULTS")
    print("="*80)
    print()
    print(f"📊 Scores in database table: {db_count:,}")
    print(f"📊 Scores in state JSON: {state_count:,}")
    print()
    
    if db_count >= 10000 and state_count == 0:
        print("✅ SUCCESS! Streaming mode worked correctly:")
        print(f"   • Database has {db_count:,} scores")
        print("   • State JSON is empty (avoiding memory limits)")
        print("   • Long-term solution is operational!")
    elif db_count > 0 and state_count > 0:
        print("⚠️  PARTIAL: Non-streaming mode was used")
        print(f"   • Database: {db_count:,} scores")
        print(f"   • State: {state_count:,} scores")
        print("   • Consider increasing transaction count or lowering threshold")
    elif db_count > 0:
        print("✅ GOOD: Scores saved to database")
        print(f"   • Database: {db_count:,} scores")
    else:
        print("❌ FAILURE: No scores found")
        print("   • Check logs for errors")
    
    print()
    print("="*80)
    
    return result

if __name__ == "__main__":
    asyncio.run(test_streaming_scoring())

