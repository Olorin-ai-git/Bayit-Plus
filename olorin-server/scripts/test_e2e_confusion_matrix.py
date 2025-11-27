#!/usr/bin/env python3
"""
End-to-End Confusion Matrix Test

1. Runs a merchant investigation with streaming scores
2. Generates confusion matrix from database scores
3. Verifies the complete workflow
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import os

# Configure for streaming with smaller dataset for faster testing
os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "15000"  # Smaller for faster test
os.environ["INVESTIGATION_SCORING_BATCH_SIZE"] = "5000"
os.environ["INVESTIGATION_PER_TX_SCORING_TIMEOUT"] = "600"  # 10 minutes
os.environ["USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON"] = "false"

async def test_e2e_confusion_matrix():
    """End-to-end test: investigation → database scores → confusion matrix."""
    print("="*80)
    print("END-TO-END CONFUSION MATRIX TEST")
    print("="*80)
    print()
    print("This test will:")
    print("  1. Run a merchant investigation (~15K transactions)")
    print("  2. Save scores to database (streaming mode)")
    print("  3. Generate confusion matrix from database scores")
    print("  4. Verify the complete workflow")
    print()
    print("⏱️  Estimated time: 2-3 minutes")
    print()
    input("Press Enter to start...")
    print()
    
    from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
    from app.service.transaction_score_service import TransactionScoreService
    from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
    from app.service.investigation.metrics_calculation import compute_confusion_matrix
    from datetime import datetime, timedelta
    
    # Step 1: Run investigation
    print("="*80)
    print("STEP 1: Running Merchant Investigation")
    print("="*80)
    print()
    
    result = await run_auto_comparison_for_entity(
        entity_value='Coinflow',
        entity_type='merchant'
    )
    
    investigation_id = result.get('investigation_id')
    investigation_risk_score = result.get('risk_score', 0.5)
    
    print()
    print(f"✅ Investigation complete: {investigation_id}")
    print(f"   Risk Score: {investigation_risk_score:.3f}")
    print(f"   Status: {result.get('status')}")
    print()
    
    # Step 2: Verify database scores
    print("="*80)
    print("STEP 2: Verifying Database Scores")
    print("="*80)
    print()
    
    db_count = TransactionScoreService.get_score_count(investigation_id)
    print(f"📊 Scores in database: {db_count:,}")
    
    if db_count == 0:
        print("❌ FAILURE: No scores in database")
        return False
    
    if db_count >= 10000:
        print(f"✅ Streaming mode was used ({db_count:,} scores)")
    else:
        print(f"📊 Non-streaming mode ({db_count:,} scores)")
    print()
    
    # Step 3: Retrieve scores and map to transactions
    print("="*80)
    print("STEP 3: Mapping Scores to Transactions")
    print("="*80)
    print()
    
    investigation = {
        "id": investigation_id,
        "status": "completed"
    }
    
    window_end = datetime.now()
    window_start = window_end - timedelta(days=90)
    
    transactions, source, risk_score = await map_investigation_to_transactions(
        investigation=investigation,
        window_start=window_start,
        window_end=window_end,
        entity_type='merchant',
        entity_id='Coinflow'
    )
    
    print(f"📊 Transactions retrieved: {len(transactions):,}")
    print(f"📊 Source: {source}")
    
    # Check predicted_risk population
    with_scores = sum(1 for tx in transactions if tx.get("predicted_risk") is not None)
    print(f"📊 With predicted_risk: {with_scores:,}")
    print()
    
    if with_scores == 0:
        print("❌ FAILURE: Scores not applied to transactions")
        return False
    
    # Step 4: Generate confusion matrix
    print("="*80)
    print("STEP 4: Generating Confusion Matrix")
    print("="*80)
    print()
    
    risk_threshold = 0.5
    tp, fp, tn, fn, excluded = compute_confusion_matrix(transactions, risk_threshold)
    
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
        
        print("Metrics:")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall:    {recall:.3f}")
        print(f"  F1 Score:  {f1:.3f}")
        print(f"  Accuracy:  {accuracy:.3f}")
        print()
    
    # Final verification
    print("="*80)
    print("FINAL VERIFICATION")
    print("="*80)
    print()
    
    checks = []
    checks.append(("Investigation completed", result.get('status') == 'completed'))
    checks.append((f"Database has {db_count:,} scores", db_count > 0))
    checks.append((f"{with_scores:,} transactions scored", with_scores > 0))
    checks.append(("Confusion matrix calculated", total_classified > 0))
    
    for check, passed in checks:
        symbol = "✅" if passed else "❌"
        print(f"{symbol} {check}")
    
    all_passed = all(passed for _, passed in checks)
    
    print()
    if all_passed:
        print("🎉 SUCCESS! End-to-end confusion matrix workflow is OPERATIONAL!")
        print()
        print("Summary:")
        print(f"  • Investigation ran successfully")
        print(f"  • {db_count:,} scores saved to database")
        print(f"  • {with_scores:,} transactions mapped with scores")
        print(f"  • Confusion matrix generated (TP={tp}, FP={fp}, TN={tn}, FN={fn})")
        print()
        print("🎯 You can now generate confusion matrices for unlimited transactions!")
    else:
        print("❌ FAILURE: Some checks failed")
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(test_e2e_confusion_matrix())
    sys.exit(0 if success else 1)

