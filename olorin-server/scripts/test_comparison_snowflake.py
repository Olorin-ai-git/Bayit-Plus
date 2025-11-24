#!/usr/bin/env python3
"""
Test Investigation Comparison with Real Snowflake Data

Tests the comparison feature by directly querying Snowflake with:
1. Real entity from existing investigations
2. Two time windows (recent 14d vs retro 14d 6mo back)
3. Validates metrics calculation and response structure

Constitutional Compliance:
- Uses real Snowflake database queries
- Tests actual comparison logic
- Validates response structure
"""

import os
import sys
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.service.investigation.comparison_service import compare_windows
from app.router.models.investigation_comparison_models import (
    ComparisonRequest,
    WindowSpec
)
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider

logger = get_bridge_logger(__name__)


async def test_comparison_with_real_data(
    entity_type: str,
    entity_value: str,
    window_a_start: datetime,
    window_a_end: datetime,
    window_b_start: datetime,
    window_b_end: datetime
) -> dict:
    """Run comparison with real Snowflake data."""
    try:
        # Build comparison request
        request = ComparisonRequest(
            entity={
                "type": entity_type,
                "value": entity_value
            },
            windowA=WindowSpec(
                preset='custom',
                start=window_a_start.isoformat(),
                end=window_a_end.isoformat(),
                label="Window A (Recent)"
            ),
            windowB=WindowSpec(
                preset='custom',
                start=window_b_start.isoformat(),
                end=window_b_end.isoformat(),
                label="Window B (Retro)"
            ),
            risk_threshold=0.7,
            options={
                "include_per_merchant": True,
                "max_merchants": 10,
                "include_histograms": False,
                "include_timeseries": False
            }
        )
        
        logger.info("=" * 60)
        logger.info("Testing Comparison with Real Snowflake Data")
        logger.info("=" * 60)
        logger.info(f"Entity: {entity_type}:{entity_value}")
        logger.info(f"Window A: {window_a_start} to {window_a_end}")
        logger.info(f"Window B: {window_b_start} to {window_b_end}")
        logger.info("")
        
        # Test database connection first
        logger.info("1. Testing Snowflake connection...")
        db_provider = get_database_provider()
        db_provider.connect()
        logger.info(f"   ✅ Connected to: {db_provider.get_full_table_name()}")
        
        # Run comparison
        logger.info("\n2. Running comparison...")
        response = await compare_windows(request)
        
        # Validate response structure
        logger.info("\n3. Validating response structure...")
        assert hasattr(response, 'entity'), "Response missing entity"
        assert hasattr(response, 'threshold'), "Response missing threshold"
        assert hasattr(response, 'windowA'), "Response missing windowA"
        assert hasattr(response, 'windowB'), "Response missing windowB"
        assert hasattr(response, 'A'), "Response missing A metrics"
        assert hasattr(response, 'B'), "Response missing B metrics"
        assert hasattr(response, 'delta'), "Response missing delta"
        assert hasattr(response, 'investigation_summary'), "Response missing investigation_summary"
        logger.info("   ✅ Response structure valid")
        
        # Validate metrics structure
        metrics_a = response.A
        metrics_b = response.B
        delta = response.delta
        
        logger.info("\n4. Metrics Summary:")
        logger.info("=" * 60)
        logger.info(f"Window A ({response.windowA.label}):")
        logger.info(f"  Total Transactions: {metrics_a.total_transactions}")
        logger.info(f"  Over Threshold: {metrics_a.over_threshold}")
        logger.info(f"  TP: {metrics_a.TP}, FP: {metrics_a.FP}, TN: {metrics_a.TN}, FN: {metrics_a.FN}")
        logger.info(f"  Precision: {metrics_a.precision:.4f}")
        logger.info(f"  Recall: {metrics_a.recall:.4f}")
        logger.info(f"  F1: {metrics_a.f1:.4f}")
        logger.info(f"  Accuracy: {metrics_a.accuracy:.4f}")
        logger.info(f"  Fraud Rate: {metrics_a.fraud_rate:.4f}")
        if metrics_a.pending_label_count:
            logger.info(f"  Pending Labels: {metrics_a.pending_label_count}")
        
        logger.info(f"\nWindow B ({response.windowB.label}):")
        logger.info(f"  Total Transactions: {metrics_b.total_transactions}")
        logger.info(f"  Over Threshold: {metrics_b.over_threshold}")
        logger.info(f"  TP: {metrics_b.TP}, FP: {metrics_b.FP}, TN: {metrics_b.TN}, FN: {metrics_b.FN}")
        logger.info(f"  Precision: {metrics_b.precision:.4f}")
        logger.info(f"  Recall: {metrics_b.recall:.4f}")
        logger.info(f"  F1: {metrics_b.f1:.4f}")
        logger.info(f"  Accuracy: {metrics_b.accuracy:.4f}")
        logger.info(f"  Fraud Rate: {metrics_b.fraud_rate:.4f}")
        if metrics_b.pending_label_count:
            logger.info(f"  Pending Labels: {metrics_b.pending_label_count}")
        
        logger.info(f"\nDelta (B - A):")
        logger.info(f"  Precision: {delta.precision:+.4f}")
        logger.info(f"  Recall: {delta.recall:+.4f}")
        logger.info(f"  F1: {delta.f1:+.4f}")
        logger.info(f"  Accuracy: {delta.accuracy:+.4f}")
        logger.info(f"  Fraud Rate: {delta.fraud_rate:+.4f}")
        if delta.psi_predicted_risk:
            logger.info(f"  PSI: {delta.psi_predicted_risk:.4f}")
        if delta.ks_stat_predicted_risk:
            logger.info(f"  KS Statistic: {delta.ks_stat_predicted_risk:.4f}")
        
        # Validate delta calculation (B - A)
        assert abs(delta.precision - (metrics_b.precision - metrics_a.precision)) < 0.0001, \
            f"Delta precision mismatch: {delta.precision} != {metrics_b.precision - metrics_a.precision}"
        assert abs(delta.recall - (metrics_b.recall - metrics_a.recall)) < 0.0001, \
            f"Delta recall mismatch: {delta.recall} != {metrics_b.recall - metrics_a.recall}"
        assert abs(delta.f1 - (metrics_b.f1 - metrics_a.f1)) < 0.0001, \
            f"Delta f1 mismatch: {delta.f1} != {metrics_b.f1 - metrics_a.f1}"
        assert abs(delta.accuracy - (metrics_b.accuracy - metrics_a.accuracy)) < 0.0001, \
            f"Delta accuracy mismatch: {delta.accuracy} != {metrics_b.accuracy - metrics_a.accuracy}"
        assert abs(delta.fraud_rate - (metrics_b.fraud_rate - metrics_a.fraud_rate)) < 0.0001, \
            f"Delta fraud_rate mismatch: {delta.fraud_rate} != {metrics_b.fraud_rate - metrics_a.fraud_rate}"
        
        # Validate summary is non-empty
        assert response.investigation_summary and len(response.investigation_summary) > 0, \
            "Investigation summary is empty"
        
        logger.info("\n5. Investigation Summary:")
        logger.info("=" * 60)
        logger.info(response.investigation_summary)
        
        # Per-merchant breakdown
        if response.per_merchant and len(response.per_merchant) > 0:
            logger.info(f"\n6. Per-Merchant Breakdown ({len(response.per_merchant)} merchants):")
            logger.info("=" * 60)
            for pm in response.per_merchant[:5]:  # Show first 5
                logger.info(f"  Merchant {pm.merchant_id}:")
                if pm.A and pm.B:
                    logger.info(f"    Window A: {pm.A.total_transactions} transactions")
                    logger.info(f"    Window B: {pm.B.total_transactions} transactions")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ All tests passed!")
        logger.info("=" * 60)
        
        return {
            "status": "success",
            "entity": {"type": entity_type, "value": entity_value},
            "window_a": {
                "start": window_a_start.isoformat(),
                "end": window_a_end.isoformat(),
                "total_transactions": metrics_a.total_transactions,
                "precision": metrics_a.precision,
                "recall": metrics_a.recall,
                "f1": metrics_a.f1,
                "accuracy": metrics_a.accuracy,
                "fraud_rate": metrics_a.fraud_rate
            },
            "window_b": {
                "start": window_b_start.isoformat(),
                "end": window_b_end.isoformat(),
                "total_transactions": metrics_b.total_transactions,
                "precision": metrics_b.precision,
                "recall": metrics_b.recall,
                "f1": metrics_b.f1,
                "accuracy": metrics_b.accuracy,
                "fraud_rate": metrics_b.fraud_rate
            },
            "delta": {
                "precision": delta.precision,
                "recall": delta.recall,
                "f1": delta.f1,
                "accuracy": delta.accuracy,
                "fraud_rate": delta.fraud_rate
            },
            "summary": response.investigation_summary
        }
        
    except Exception as e:
        logger.error(f"❌ Comparison test failed: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "entity": {"type": entity_type, "value": entity_value}
        }


async def main():
    """Main test function."""
    # Use America/New_York timezone
    import pytz
    from app.service.investigation.data_availability_check import check_data_availability
    
    tz = pytz.timezone('America/New_York')
    
    # Use a real entity from existing investigations
    entity_type = "email"
    entity_value = "okuoku1959122@gmail.com"  # From existing investigations
    
    # Try different time windows to find one with data in both windows
    now = datetime.now(tz)
    recent_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Try multiple retro windows to find one with data
    windows_to_try = [
        (recent_end - timedelta(days=14), recent_end, recent_end - timedelta(days=28), recent_end - timedelta(days=14)),  # Recent 14d vs Previous 14d
        (recent_end - timedelta(days=14), recent_end, recent_end - timedelta(days=42), recent_end - timedelta(days=28)),  # Recent 14d vs 2-4 weeks ago
        (recent_end - timedelta(days=30), recent_end, recent_end - timedelta(days=60), recent_end - timedelta(days=30)),  # Recent 30d vs Previous 30d
    ]
    
    logger.info("Testing with real Snowflake data...")
    logger.info(f"Entity: {entity_type}:{entity_value}")
    logger.info("Checking data availability for different time windows...")
    
    found_valid_windows = False
    for window_a_start, window_a_end, window_b_start, window_b_end in windows_to_try:
        availability = await check_data_availability(
            entity_type=entity_type,
            entity_value=entity_value,
            window_a_start=window_a_start,
            window_a_end=window_a_end,
            window_b_start=window_b_start,
            window_b_end=window_b_end
        )
        
        logger.info(f"  Window A ({window_a_start.date()} to {window_a_end.date()}): {availability['window_a']['count']} transactions")
        logger.info(f"  Window B ({window_b_start.date()} to {window_b_end.date()}): {availability['window_b']['count']} transactions")
        
        if availability['available']:
            logger.info(f"  ✅ Found windows with data in both periods!")
            found_valid_windows = True
            
            result = await test_comparison_with_real_data(
                entity_type=entity_type,
                entity_value=entity_value,
                window_a_start=window_a_start,
                window_a_end=window_a_end,
                window_b_start=window_b_start,
                window_b_end=window_b_end
            )
            break
        else:
            logger.info(f"  ⚠️  Skipping - insufficient data")
    
    if not found_valid_windows:
        logger.error("❌ Could not find time windows with data in both periods for this entity.")
        logger.info("Try a different entity or adjust the time windows.")
        return 1
    
    # Print results as JSON
    print("\n" + "=" * 60)
    print("Test Results (JSON):")
    print("=" * 60)
    print(json.dumps(result, indent=2, default=str))
    
    if result.get('status') == 'success':
        logger.info("\n✅ Integration test with Snowflake passed!")
        return 0
    else:
        logger.error(f"\n❌ Test failed: {result.get('error')}")
        return 1


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

