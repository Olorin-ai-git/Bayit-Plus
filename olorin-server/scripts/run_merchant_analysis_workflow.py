#!/usr/bin/env python3
"""
Merchant Analysis Workflow

1. Run startup analysis flow
2. Run analyzer on 24h window (6.5 months ago)
3. Run investigation on each merchant with fraudulent transactions
4. Produce confusion table for each merchant
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import os
from datetime import datetime, timedelta

# Configure environment
os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "100000"
os.environ["INVESTIGATION_SCORING_BATCH_SIZE"] = "5000"
os.environ["INVESTIGATION_PER_TX_SCORING_TIMEOUT"] = "3600"
os.environ["USE_EXISTING_INVESTIGATIONS_FOR_COMPARISON"] = "false"

async def main():
    """Execute the complete merchant analysis workflow."""
    
    print("="*80)
    print("MERCHANT ANALYSIS WORKFLOW")
    print("="*80)
    print()
    print("Steps:")
    print("  1. Run startup analysis flow")
    print("  2. Run analyzer on 24h window (6.5 months ago)")
    print("  3. Investigate each merchant with fraudulent transactions")
    print("  4. Generate confusion table for each merchant")
    print()
    print("⏱️  Estimated time: 30-60 minutes")
    print()
    
    # Step 1: Startup Analysis Flow
    print("="*80)
    print("STEP 1: Running Startup Analysis Flow")
    print("="*80)
    print()
    
    try:
        from fastapi import FastAPI
        from app.service import run_startup_analysis_flow
        
        app = FastAPI()
        
        print("Running startup analysis...")
        startup_results = await run_startup_analysis_flow(
            app=app,
            risk_analyzer_results=None,
            top_n=1,
            force_refresh=True
        )
        
        print(f"✅ Startup analysis complete: {len(startup_results)} results")
        print()
    except Exception as e:
        print(f"⚠️  Startup analysis skipped: {e}")
        print()
    
    # Step 2: Run Analyzer on 24h Window
    print("="*80)
    print("STEP 2: Running Analyzer on 24h Window (6.5 months ago)")
    print("="*80)
    print()
    
    from app.service.analytics.risk_analyzer import RiskAnalyzer
    
    # Calculate 24h window 6.5 months ago
    months_ago = 6.5
    
    # Configure analyzer via environment variables
    os.environ["ANALYZER_END_OFFSET_MONTHS"] = str(int(months_ago))
    os.environ["ANALYZER_TIME_WINDOW_HOURS"] = "24"
    
    days_ago = int(months_ago * 30)
    window_end = datetime.now() - timedelta(days=days_ago)
    window_start = window_end - timedelta(hours=24)
    
    print(f"Time window:")
    print(f"  Start: {window_start}")
    print(f"  End:   {window_end}")
    print(f"  Duration: 24 hours")
    print(f"  Max lookback: {months_ago} months ago")
    print()
    
    print("Running fraud analyzer...")
    # Create analyzer (reads config from environment)
    analyzer = RiskAnalyzer()
    
    # Get top risk merchants with fraud
    analyzer_results = await analyzer.get_top_risk_entities(
        time_window="24h",  # 24 hour window
        group_by="merchant_name",  # Group by merchant
        top_percentage=1.0,  # Get all merchants (we'll filter by fraud)
        force_refresh=True
    )
    
    # Filter to only merchants with fraud
    all_entities = analyzer_results.get("entities", [])
    merchants = [e for e in all_entities if e.get("fraud_count", 0) > 0]
    print(f"✅ Analyzer complete: Found {len(merchants)} merchants with fraudulent transactions")
    print()
    
    if not merchants:
        print("❌ No merchants found with fraudulent transactions in this window")
        print("   Try a different time window or remove the fraud filter")
        return
    
    # Show top merchants
    print("Top merchants with fraud:")
    for i, merchant in enumerate(merchants[:10], 1):
        merchant_name = merchant.get("entity_value", "unknown")
        fraud_count = merchant.get("fraud_transaction_count", 0)
        total_count = merchant.get("total_transactions", 0)
        avg_score = merchant.get("avg_model_score", 0)
        print(f"  {i}. {merchant_name}: {fraud_count}/{total_count} fraudulent (avg score: {avg_score:.3f})")
    
    if len(merchants) > 10:
        print(f"  ... and {len(merchants) - 10} more")
    print()
    
    # Step 3 & 4: Investigate Each Merchant and Generate Confusion Tables
    print("="*80)
    print("STEP 3 & 4: Investigating Merchants & Generating Confusion Tables")
    print("="*80)
    print()
    
    from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
    from app.service.transaction_score_service import TransactionScoreService
    from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
    from app.service.investigation.metrics_calculation import compute_confusion_matrix
    
    confusion_tables = []
    
    for idx, merchant in enumerate(merchants, 1):
        merchant_name = merchant.get("entity_value")
        fraud_count = merchant.get("fraud_transaction_count", 0)
        
        print(f"\n[{idx}/{len(merchants)}] Processing merchant: {merchant_name}")
        print(f"  Fraudulent transactions: {fraud_count}")
        print()
        
        try:
            # Run investigation
            print(f"  Running investigation...")
            result = await run_auto_comparison_for_entity(
                entity_value=merchant_name,
                entity_type="merchant"
            )
            
            investigation_id = result.get("investigation_id")
            investigation_risk_score = result.get("risk_score", 0.5)
            status = result.get("status")
            
            print(f"  ✅ Investigation: {investigation_id}")
            print(f"     Risk Score: {investigation_risk_score:.3f}")
            print(f"     Status: {status}")
            
            # Check database scores
            db_count = TransactionScoreService.get_score_count(investigation_id)
            print(f"     Scores in DB: {db_count:,}")
            print()
            
            # Map to transactions for confusion matrix
            print(f"  Generating confusion table...")
            investigation_obj = {"id": investigation_id, "status": status}
            
            transactions, source, _ = await map_investigation_to_transactions(
                investigation=investigation_obj,
                window_start=window_start,
                window_end=window_end,
                entity_type="merchant",
                entity_id=merchant_name
            )
            
            print(f"     Transactions: {len(transactions):,}")
            print(f"     Source: {source}")
            
            # Calculate confusion matrix (only_flagged=True to reduce FP count)
            tp, fp, tn, fn, excluded, below_threshold = compute_confusion_matrix(
                transactions, 0.5, only_flagged=True
            )
            
            total_classified = tp + fp + tn + fn
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
            accuracy = (tp + tn) / total_classified if total_classified > 0 else 0
            
            confusion_table = {
                "merchant": merchant_name,
                "investigation_id": investigation_id,
                "risk_score": investigation_risk_score,
                "fraud_count": fraud_count,
                "transactions_scored": db_count,
                "transactions_classified": total_classified,
                "TP": tp,
                "FP": fp,
                "TN": tn,
                "FN": fn,
                "excluded": excluded,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "accuracy": accuracy
            }
            
            confusion_tables.append(confusion_table)
            
            print(f"  ✅ Confusion Table:")
            print(f"     TP={tp}, FP={fp}, TN={tn}, FN={fn}")
            print(f"     Precision={precision:.3f}, Recall={recall:.3f}, F1={f1:.3f}")
            print()
            
        except Exception as e:
            print(f"  ❌ Error processing {merchant_name}: {e}")
            import traceback
            traceback.print_exc()
            print()
            continue
    
    # Summary
    print("="*80)
    print("WORKFLOW COMPLETE")
    print("="*80)
    print()
    print(f"✅ Processed {len(confusion_tables)}/{len(merchants)} merchants")
    print()
    
    if confusion_tables:
        print("Confusion Tables Summary:")
        print()
        print(f"{'Merchant':<30} {'TP':>6} {'FP':>6} {'TN':>6} {'FN':>6} {'Precision':>9} {'Recall':>9} {'F1':>9}")
        print("-" * 100)
        
        for ct in confusion_tables:
            print(f"{ct['merchant']:<30} {ct['TP']:>6} {ct['FP']:>6} {ct['TN']:>6} {ct['FN']:>6} "
                  f"{ct['precision']:>9.3f} {ct['recall']:>9.3f} {ct['f1']:>9.3f}")
        
        print()
        print("Aggregated Metrics:")
        total_tp = sum(ct['TP'] for ct in confusion_tables)
        total_fp = sum(ct['FP'] for ct in confusion_tables)
        total_tn = sum(ct['TN'] for ct in confusion_tables)
        total_fn = sum(ct['FN'] for ct in confusion_tables)
        
        total_classified = total_tp + total_fp + total_tn + total_fn
        agg_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        agg_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        agg_f1 = 2 * (agg_precision * agg_recall) / (agg_precision + agg_recall) if (agg_precision + agg_recall) > 0 else 0
        agg_accuracy = (total_tp + total_tn) / total_classified if total_classified > 0 else 0
        
        print(f"  Total TP: {total_tp:,}")
        print(f"  Total FP: {total_fp:,}")
        print(f"  Total TN: {total_tn:,}")
        print(f"  Total FN: {total_fn:,}")
        print(f"  Aggregated Precision: {agg_precision:.3f}")
        print(f"  Aggregated Recall: {agg_recall:.3f}")
        print(f"  Aggregated F1: {agg_f1:.3f}")
        print(f"  Aggregated Accuracy: {agg_accuracy:.3f}")
    
    print()
    print("="*80)

if __name__ == "__main__":
    asyncio.run(main())

