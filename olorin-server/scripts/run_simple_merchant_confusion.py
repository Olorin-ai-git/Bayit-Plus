#!/usr/bin/env python3
"""
Simple Merchant Confusion Matrix Workflow

Directly queries Snowflake for merchants with fraud, then generates confusion tables.
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
    """Simple workflow to get merchants with fraud and generate confusion tables."""
    
    print("="*80)
    print("SIMPLE MERCHANT CONFUSION TABLE WORKFLOW")
    print("="*80)
    print()
    
    from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient
    from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
    from app.service.transaction_score_service import TransactionScoreService
    from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
    from app.service.investigation.metrics_calculation import compute_confusion_matrix
    
    # Step 1: Query Snowflake for merchants with fraud (24h window, 6.5 months ago)
    print("STEP 1: Finding merchants with fraudulent transactions")
    print("="*80)
    print()
    
    months_ago = 6.5
    days_ago = int(months_ago * 30)
    window_end = datetime.now() - timedelta(days=days_ago)
    window_start = window_end - timedelta(hours=24)
    
    print(f"Time window:")
    print(f"  Start: {window_start.isoformat()}")
    print(f"  End:   {window_end.isoformat()}")
    print(f"  Duration: 24 hours")
    print()
    
    # Connect to Snowflake
    client = RealSnowflakeClient()
    await client.connect()
    
    # Query for merchants with fraud in the window
    query = f"""
    SELECT 
        MERCHANT_NAME,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        AVG(MODEL_SCORE) as avg_model_score
    FROM DBT.DBT_PROD.TXS
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND MERCHANT_NAME IS NOT NULL
      AND MERCHANT_NAME != ''
    GROUP BY MERCHANT_NAME
    HAVING SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) > 0
    ORDER BY fraud_count DESC
    LIMIT 20
    """
    
    print("Querying Snowflake for merchants with fraud...")
    results = await client.execute_query(query)
    await client.disconnect()
    
    print(f"✅ Found {len(results)} merchants with fraudulent transactions")
    print()
    
    if not results:
        print("❌ No merchants found with fraudulent transactions in this window")
        print("   Try a different time window")
        return
    
    # Show merchants
    print("Merchants with fraud:")
    for i, merchant in enumerate(results, 1):
        merchant_name = merchant.get("MERCHANT_NAME")
        fraud_count = merchant.get("FRAUD_COUNT", 0)
        total = merchant.get("TOTAL_TRANSACTIONS", 0)
        avg_score = merchant.get("AVG_MODEL_SCORE", 0)
        print(f"  {i}. {merchant_name}: {fraud_count}/{total} fraudulent (avg score: {avg_score:.3f})")
    print()
    
    # Step 2: Investigate each merchant and generate confusion tables
    print("="*80)
    print("STEP 2: Investigating Merchants & Generating Confusion Tables")
    print("="*80)
    print()
    
    confusion_tables = []
    
    for idx, merchant_data in enumerate(results, 1):
        merchant_name = merchant_data.get("MERCHANT_NAME")
        fraud_count = merchant_data.get("FRAUD_COUNT", 0)
        
        print(f"\n[{idx}/{len(results)}] Processing merchant: {merchant_name}")
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
    print(f"✅ Processed {len(confusion_tables)}/{len(results)} merchants")
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

