"""
Comprehensive Merchant Investigation Workflow

Steps:
1. Run startup analysis flow
2. Run analyzer on 24h window (8 or 6.5 months ago)
3. Investigate every merchant with ≥1 fraudulent transaction
4. Generate confusion table for each merchant
5. Verify complete transaction scores for each merchant
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service import run_startup_analysis_flow
from app.service.analytics.risk_analyzer import RiskAnalyzer
from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
from app.service.investigation.investigation_transaction_mapper import (
    map_investigation_to_transactions
)
from app.service.transaction_score_service import TransactionScoreService
from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.schema_constants import (
    MERCHANT_NAME,
    IS_FRAUD_TX,
    MODEL_SCORE,
    TX_DATETIME
)

logger = get_bridge_logger(__name__)


def main():
    """Execute comprehensive merchant workflow."""
    print("=" * 80)
    print("COMPREHENSIVE MERCHANT INVESTIGATION WORKFLOW")
    print("=" * 80)
    print()
    
    # Step 1: Skip startup analysis (not needed for merchant workflow)
    print("STEP 1: Startup Analysis (SKIPPED - not needed for merchant workflow)")
    print("-" * 80)
    print("✅ Skipped")
    print()
    
    # Step 2: Run Analyzer on 24h window (8 months ago)
    print("STEP 2: Running Analyzer on 24h Window (8 months ago)")
    print("-" * 80)
    
    # Set environment variables for 8 months ago
    months_ago = 8
    end_offset_months = months_ago
    window_days = 1  # 24 hours
    
    os.environ["ANALYZER_END_OFFSET_MONTHS"] = str(end_offset_months)
    os.environ["INVESTIGATION_DEFAULT_WINDOW_DAYS"] = str(window_days)
    
    # Calculate actual dates for logging
    end_date = datetime.now() - timedelta(days=30 * end_offset_months)
    start_date = end_date - timedelta(days=window_days)
    
    print(f"Analysis window: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    print(f"Entity type: merchant")
    print(f"Filter: merchants with ≥1 fraudulent transaction")
    print()
    
    try:
        analyzer = RiskAnalyzer()
        
        # Get merchants with fraud using direct database query
        logger.info(f"🔍 Fetching merchants with fraud in {window_days}-day window ending {months_ago} months ago...")
        
        # Get table name from environment
        table_name = os.getenv("SNOWFLAKE_TABLE", "DBT.DBT_PROD.TXS")
        
        # Build SQL query for merchants with fraud
        query = f"""
            SELECT 
                {MERCHANT_NAME} as merchant_name,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN {IS_FRAUD_TX} = 1 THEN 1 ELSE 0 END) as fraud_count,
                AVG(COALESCE({MODEL_SCORE}, 0)) as avg_risk_score
            FROM {table_name}
            WHERE {TX_DATETIME} >= DATEADD(day, -{end_offset_months * 30 + window_days}, CURRENT_TIMESTAMP())
              AND {TX_DATETIME} < DATEADD(day, -{end_offset_months * 30}, CURRENT_TIMESTAMP())
              AND {MERCHANT_NAME} IS NOT NULL
            GROUP BY {MERCHANT_NAME}
            HAVING SUM(CASE WHEN {IS_FRAUD_TX} = 1 THEN 1 ELSE 0 END) > 0
            ORDER BY fraud_count DESC, avg_risk_score DESC
            LIMIT 50
        """
        
        results = analyzer.client.execute_query(query)
        merchants_with_fraud = [
            {
                "entity_id": row.get("MERCHANT_NAME"),
                "transaction_count": row.get("TRANSACTION_COUNT", 0),
                "fraud_count": row.get("FRAUD_COUNT", 0),
                "risk_score": row.get("AVG_RISK_SCORE", 0)
            }
            for row in results
        ]
        
        print(f"✅ Found {len(merchants_with_fraud)} merchants with fraudulent transactions")
        print()
        
        if not merchants_with_fraud:
            print("⚠️  No merchants with fraud found in this time window")
            print("Try a different time window (8 months ago)?")
            return
        
        # Display top 10 merchants
        print("Top 10 merchants by risk:")
        for i, merchant in enumerate(merchants_with_fraud[:10], 1):
            entity_id = merchant.get("entity_id", "unknown")
            risk_score = merchant.get("risk_score", 0)
            fraud_count = merchant.get("fraud_count", 0)
            tx_count = merchant.get("transaction_count", 0)
            print(f"  {i}. {entity_id}: risk={risk_score:.3f}, fraud={fraud_count}/{tx_count} txs")
        print()
        
    except Exception as e:
        logger.error(f"❌ Analyzer failed: {e}", exc_info=True)
        print(f"❌ Analyzer failed: {e}")
        return
    
    # Step 3 & 4: Investigate each merchant and generate confusion tables
    print("STEP 3 & 4: Investigating Merchants and Generating Confusion Tables")
    print("-" * 80)
    print(f"Processing {len(merchants_with_fraud)} merchants...")
    print()
    
    investigated_merchants = []
    
    for i, merchant in enumerate(merchants_with_fraud, 1):
        entity_id = merchant.get("entity_id")
        if not entity_id:
            continue
        
        print(f"[{i}/{len(merchants_with_fraud)}] Processing merchant: {entity_id}")
        
        try:
            # Run investigation with confusion table generation
            logger.info(f"🔍 Starting investigation for merchant: {entity_id}")
            
            result = run_auto_comparison_for_entity(
                entity_type="merchant",
                entity_value=entity_id,
                window_a_end_offset_months=end_offset_months,
                generate_confusion_table=True  # Generate confusion table
            )
            
            investigation_id = result.get("investigation_id")
            if investigation_id:
                investigated_merchants.append({
                    "merchant_id": entity_id,
                    "investigation_id": investigation_id,
                    "fraud_count": merchant.get("fraud_count", 0),
                    "transaction_count": merchant.get("transaction_count", 0)
                })
                print(f"  ✅ Investigation complete: {investigation_id}")
            else:
                print(f"  ⚠️  No investigation ID returned")
            
        except Exception as e:
            logger.error(f"❌ Investigation failed for {entity_id}: {e}", exc_info=True)
            print(f"  ❌ Investigation failed: {e}")
        
        print()
    
    print(f"✅ Completed {len(investigated_merchants)} merchant investigations")
    print()
    
    # Step 5: Verify complete transaction scores
    print("STEP 5: Verifying Complete Transaction Scores")
    print("-" * 80)
    print()
    
    verification_results = []
    
    for merchant_data in investigated_merchants:
        merchant_id = merchant_data["merchant_id"]
        investigation_id = merchant_data["investigation_id"]
        expected_tx_count = merchant_data["transaction_count"]
        
        print(f"Verifying merchant: {merchant_id}")
        print(f"  Investigation ID: {investigation_id}")
        print(f"  Expected transactions: {expected_tx_count}")
        
        try:
            # Get transaction scores from database
            db_scores = TransactionScoreService.get_transaction_scores(investigation_id)
            scored_count = len(db_scores)
            
            print(f"  Scored transactions (DB): {scored_count}")
            
            # Also check investigation state
            db = next(get_db_session())
            investigation = db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if investigation:
                # Get mapped transactions
                mapped_txs = map_investigation_to_transactions(investigation_id)
                mapped_count = len(mapped_txs)
                
                print(f"  Mapped transactions: {mapped_count}")
                
                # Verify completeness
                coverage_percent = (scored_count / expected_tx_count * 100) if expected_tx_count > 0 else 0
                is_complete = scored_count >= expected_tx_count * 0.95  # 95% threshold
                
                verification_results.append({
                    "merchant_id": merchant_id,
                    "investigation_id": investigation_id,
                    "expected_count": expected_tx_count,
                    "scored_count": scored_count,
                    "mapped_count": mapped_count,
                    "coverage_percent": coverage_percent,
                    "is_complete": is_complete
                })
                
                status = "✅ COMPLETE" if is_complete else "⚠️  INCOMPLETE"
                print(f"  Coverage: {coverage_percent:.1f}% - {status}")
            else:
                print(f"  ⚠️  Investigation not found in database")
            
        except Exception as e:
            logger.error(f"❌ Verification failed for {merchant_id}: {e}", exc_info=True)
            print(f"  ❌ Verification failed: {e}")
        
        print()
    
    # Final Summary
    print("=" * 80)
    print("WORKFLOW SUMMARY")
    print("=" * 80)
    print()
    print(f"Merchants analyzed: {len(merchants_with_fraud)}")
    print(f"Merchants investigated: {len(investigated_merchants)}")
    print(f"Merchants verified: {len(verification_results)}")
    print()
    
    if verification_results:
        complete_count = sum(1 for v in verification_results if v["is_complete"])
        incomplete_count = len(verification_results) - complete_count
        
        print(f"Complete investigations: {complete_count}")
        print(f"Incomplete investigations: {incomplete_count}")
        print()
        
        # Detailed verification table
        print("VERIFICATION DETAILS:")
        print("-" * 80)
        print(f"{'Merchant':<30} {'Expected':<10} {'Scored':<10} {'Coverage':<10} {'Status'}")
        print("-" * 80)
        
        for v in verification_results:
            merchant_id = v["merchant_id"][:28]  # Truncate if needed
            expected = v["expected_count"]
            scored = v["scored_count"]
            coverage = f"{v['coverage_percent']:.1f}%"
            status = "✅ OK" if v["is_complete"] else "⚠️  LOW"
            
            print(f"{merchant_id:<30} {expected:<10} {scored:<10} {coverage:<10} {status}")
        
        print()
    
    print("=" * 80)
    print("✅ COMPREHENSIVE WORKFLOW COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"❌ Workflow failed: {e}", exc_info=True)
        print(f"\n❌ WORKFLOW FAILED: {e}")
        sys.exit(1)

