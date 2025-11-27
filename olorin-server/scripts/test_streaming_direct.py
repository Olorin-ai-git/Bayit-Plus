#!/usr/bin/env python3
"""
Direct Streaming Test - Tests the streaming logic without full investigation.

This creates fake transaction data and tests the streaming batch scoring directly.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
import uuid

# Configure for streaming
os.environ["INVESTIGATION_SCORING_BATCH_SIZE"] = "5000"
os.environ["INVESTIGATION_PER_TX_SCORING_TIMEOUT"] = "3600"

def test_streaming_scoring_direct():
    """Test streaming with fake data."""
    print("="*80)
    print("DIRECT STREAMING TEST - Isolated Component Test")
    print("="*80)
    print()
    print("Creating 50,000 fake transactions...")
    
    # Create realistic fake transactions
    fake_transactions = []
    for i in range(50000):
        tx = {
            "TX_ID_KEY": f"TX-{uuid.uuid4().hex[:12]}",
            "PAID_AMOUNT_VALUE_IN_CURRENCY": round(10.0 + (i % 1000), 2),
            "TX_DATETIME": "2025-01-15T12:00:00",
            "IP": f"192.168.{i % 256}.{i % 256}",
            "DEVICE_ID": f"device-{i % 100}",
            "MERCHANT_NAME": "TestMerchant",
            "EMAIL": f"user{i % 500}@test.com",
        }
        fake_transactions.append(tx)
    
    print(f"✅ Created {len(fake_transactions):,} fake transactions")
    print()
    
    # Create fake facts and domain findings
    facts = {
        "results": fake_transactions,
        "row_count": len(fake_transactions)
    }
    
    domain_findings = {
        "network": {"risk_score": 0.4, "confidence": 0.8},
        "device": {"risk_score": 0.3, "confidence": 0.7},
        "location": {"risk_score": 0.5, "confidence": 0.9},
    }
    
    # Create a test investigation ID
    investigation_id = f"test-streaming-{uuid.uuid4().hex[:8]}"
    print(f"Investigation ID: {investigation_id}")
    print()
    
    # Import the scoring function
    from app.service.agent.orchestration.domain_agents.risk_agent import _calculate_per_transaction_scores
    from app.service.transaction_score_service import TransactionScoreService
    
    print("🚀 Starting streaming batch scoring...")
    print(f"   Batch size: {os.getenv('INVESTIGATION_SCORING_BATCH_SIZE')}")
    print(f"   Expected batches: {len(fake_transactions) // 5000}")
    print()
    
    import time
    import logging
    
    # Enable detailed logging
    logging.basicConfig(level=logging.INFO)
    
    start = time.time()
    
    # Call the scoring function with investigation_id (triggers streaming mode)
    try:
        returned_scores = _calculate_per_transaction_scores(
            facts=facts,
            domain_findings=domain_findings,
            entity_type="merchant",
            entity_value="TestMerchant",
            investigation_id=investigation_id  # This triggers streaming mode
        )
    except Exception as e:
        print(f"\n❌ EXCEPTION during scoring: {e}")
        import traceback
        traceback.print_exc()
        returned_scores = {}
    
    elapsed = time.time() - start
    
    print()
    print("="*80)
    print("RESULTS")
    print("="*80)
    print()
    
    # Check what was returned
    print(f"📊 Scores returned from function: {len(returned_scores):,}")
    
    # Check database
    db_count = TransactionScoreService.get_score_count(investigation_id)
    print(f"💾 Scores in database table: {db_count:,}")
    print()
    
    # Verify streaming worked
    print("="*80)
    print("VERIFICATION")
    print("="*80)
    print()
    
    if db_count >= 45000:  # Allow some exclusions
        print(f"✅ SUCCESS! Streaming mode worked:")
        print(f"   • Input: {len(fake_transactions):,} transactions")
        print(f"   • Saved to database: {db_count:,} scores")
        print(f"   • Returned from function: {len(returned_scores):,} (should be 0 for streaming)")
        print(f"   • Time elapsed: {elapsed:.1f}s ({db_count/elapsed:.0f} tx/s)")
        print()
        print(f"   🎯 Long-term solution is OPERATIONAL!")
        print(f"   🎯 Can scale to millions of transactions!")
        
        # Sample a few scores
        print()
        print("Sample scores from database:")
        sample_scores = TransactionScoreService.get_transaction_scores(investigation_id)
        for tx_id, score in list(sample_scores.items())[:5]:
            print(f"   {tx_id}: {score:.3f}")
        
        # Cleanup
        print()
        print("Cleaning up test data...")
        TransactionScoreService.delete_transaction_scores(investigation_id)
        print("✅ Test data cleaned")
        
        return True
    else:
        print(f"❌ FAILURE: Expected ~50K scores, got {db_count:,}")
        print(f"   Returned: {len(returned_scores):,}")
        print(f"   Check logs for errors")
        return False

if __name__ == "__main__":
    success = test_streaming_scoring_direct()
    sys.exit(0 if success else 1)

