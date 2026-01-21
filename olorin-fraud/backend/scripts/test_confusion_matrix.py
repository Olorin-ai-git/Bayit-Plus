#!/usr/bin/env python3
"""
Test Confusion Matrix with Streaming Scores

Verifies that confusion matrices can be generated from database-backed scores.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import os
import uuid
from datetime import datetime, timedelta

# Configure for streaming
os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "100000"
os.environ["INVESTIGATION_SCORING_BATCH_SIZE"] = "5000"

async def test_confusion_matrix():
    """Test confusion matrix generation with streaming scores."""
    print("="*80)
    print("CONFUSION MATRIX TEST - Database-Backed Scores")
    print("="*80)
    print()
    
    from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
    from app.service.transaction_score_service import TransactionScoreService
    from app.persistence.database import get_db
    from app.models.investigation_state import InvestigationState
    import json
    
    # Find a recent merchant investigation with streaming scores
    print("Looking for recent merchant investigations...")
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Find investigations with scores in database
        recent_invs = db.query(InvestigationState).order_by(
            InvestigationState.created_at.desc()
        ).limit(20).all()
        
        test_inv = None
        for inv in recent_invs:
            score_count = TransactionScoreService.get_score_count(inv.investigation_id)
            if score_count > 1000:  # Found one with significant scores
                test_inv = inv
                print(f"✅ Found investigation with {score_count:,} database scores")
                print(f"   ID: {inv.investigation_id}")
                print(f"   Status: {inv.status}")
                print()
                break
        
        if not test_inv:
            print("❌ No investigations with database scores found")
            print("   Run a merchant investigation first to generate scores")
            return False
        
        # Extract investigation data
        investigation = {
            "id": test_inv.investigation_id,
            "status": test_inv.status,
        }
        
        # Parse progress JSON to get risk score and entity info
        progress = json.loads(test_inv.progress_json) if test_inv.progress_json else {}
        risk_findings = progress.get("risk_findings", {})
        investigation_risk_score = risk_findings.get("risk_score", 0.5)
        
        # Get entity info from state
        entity_type = "merchant"  # Assuming merchant investigation
        entity_id = "Coinflow"     # Default merchant for our tests
        
        # Define time window
        window_end = datetime.now()
        window_start = window_end - timedelta(days=90)
        
        print("Mapping investigation to transactions...")
        print(f"  Entity: {entity_type}:{entity_id}")
        print(f"  Window: {window_start.date()} to {window_end.date()}")
        print(f"  Investigation Risk Score: {investigation_risk_score:.3f}")
        print()
        
        # Map investigation to transactions (this should use database scores)
        transactions, source, risk_score = await map_investigation_to_transactions(
            investigation=investigation,
            window_start=window_start,
            window_end=window_end,
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        print()
        print("="*80)
        print("RESULTS")
        print("="*80)
        print()
        print(f"📊 Transactions retrieved: {len(transactions):,}")
        print(f"📊 Source: {source}")
        print(f"📊 Risk score: {risk_score:.3f}")
        print()
        
        # Check if predicted_risk is populated
        transactions_with_scores = sum(1 for tx in transactions if tx.get("predicted_risk") is not None)
        print(f"📊 Transactions with predicted_risk: {transactions_with_scores:,}")
        print()
        
        if transactions_with_scores == 0:
            print("❌ FAILURE: No transactions have predicted_risk")
            print("   Scores from database not being applied")
            return False
        
        # Sample a few scores
        print("Sample predicted_risk values:")
        for tx in transactions[:5]:
            tx_id = tx.get("TX_ID_KEY", "unknown")
            predicted_risk = tx.get("predicted_risk")
            actual_outcome = tx.get("actual_outcome")
            print(f"   {tx_id}: predicted_risk={predicted_risk:.3f if predicted_risk else 'None'}, actual={actual_outcome}")
        print()
        
        # Calculate confusion matrix
        from app.service.investigation.metrics_calculation import compute_confusion_matrix
        
        risk_threshold = 0.5
        # Use only_flagged=True to count only flagged transactions (reduces FP count)
        tp, fp, tn, fn, excluded, below_threshold = compute_confusion_matrix(
            transactions, risk_threshold, only_flagged=True
        )
        
        print("="*80)
        print("CONFUSION MATRIX")
        print("="*80)
        print()
        print(f"  True Positives (TP):  {tp:,}")
        print(f"  False Positives (FP): {fp:,}")
        print(f"  True Negatives (TN):  {tn:,}")
        print(f"  False Negatives (FN): {fn:,}")
        print(f"  Excluded:             {excluded:,}")
        print()
        
        total_classified = tp + fp + tn + fn
        if total_classified > 0:
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
            accuracy = (tp + tn) / total_classified
            
            print(f"  Precision: {precision:.3f}")
            print(f"  Recall:    {recall:.3f}")
            print(f"  F1 Score:  {f1:.3f}")
            print(f"  Accuracy:  {accuracy:.3f}")
            print()
        
        print("="*80)
        print("VERIFICATION")
        print("="*80)
        print()
        
        if transactions_with_scores >= 1000 and total_classified > 0:
            print("✅ SUCCESS! Confusion matrix generated from database scores!")
            print(f"   • Retrieved {transactions_with_scores:,} scored transactions")
            print(f"   • Classified {total_classified:,} transactions")
            print(f"   • Confusion matrix calculated successfully")
            print()
            print("🎯 Database-backed confusion matrices are OPERATIONAL!")
            return True
        else:
            print(f"⚠️  PARTIAL: Only {transactions_with_scores:,} transactions scored")
            return False
            
    finally:
        db.close()

if __name__ == "__main__":
    success = asyncio.run(test_confusion_matrix())
    sys.exit(0 if success else 1)

