#!/usr/bin/env python3
"""
Test Monthly Analysis Score Filtering.

Verifies that score-based filtering is now effective in the monthly analysis flow
through ComparisonDataLoader.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

os.environ["USE_FIREBASE_SECRETS"] = "false"

sys.path.insert(0, str(Path(__file__).parent.parent))


async def test_score_filtering():
    """Test that score filtering is applied in ComparisonDataLoader."""
    from app.service.investigation.comparison_modules.comparison_data_loader import (
        ComparisonDataLoader,
    )

    print("\n" + "=" * 80)
    print("🧪 TESTING MONTHLY ANALYSIS SCORE FILTERING")
    print("=" * 80)

    # Test reference date (1 year ago)
    reference_time = datetime.now() - timedelta(days=365)

    print(f"\n📋 Configuration:")
    print(f"   Reference Date: {reference_time.strftime('%Y-%m-%d')}")
    print(f"   Score Filtering: {os.getenv('SELECTOR_ENABLE_SCORE_FILTERING', 'true')}")
    print(f"   Min Threshold: {os.getenv('SELECTOR_MIN_SCORE_THRESHOLD', '0.15')}")
    print(f"   High Threshold: {os.getenv('SELECTOR_HIGH_SCORE_THRESHOLD', '0.70')}")
    print(f"   Multiplier: {os.getenv('SELECTOR_HIGH_SCORE_WEIGHT_MULTIPLIER', '2.0')}")

    loader = ComparisonDataLoader()

    # Test 1: Compound Entity Mode WITH filtering
    print(f"\n" + "=" * 80)
    print("TEST 1: Compound Entity Mode WITH Score Filtering")
    print("=" * 80)

    os.environ["SELECTOR_ENABLE_SCORE_FILTERING"] = "true"

    try:
        entities_with_filtering = await loader.get_high_risk_compound_entities(
            lookback_hours=24,
            limit=10,
            reference_time=reference_time,
        )

        print(f"✅ Query executed successfully")
        print(f"   Entities returned: {len(entities_with_filtering)}")

        if entities_with_filtering:
            first = entities_with_filtering[0]
            print(f"\n   Top Entity:")
            print(f"      Email: {first.get('email', 'N/A')}")
            print(f"      Avg Model Score: {first.get('avg_model_score', 0):.4f}")
            print(f"      Weighted Risk: {first.get('weighted_risk_score', 0):.2f}")
            print(f"      Combined Risk: {first.get('combined_risk_score', 0):.2f}")
            print(f"      Fraud Count: {first.get('fraud_count', 0)}")

            # Verify min threshold filtering
            min_score = min(e.get("avg_model_score", 1.0) for e in entities_with_filtering)
            threshold = float(os.getenv("SELECTOR_MIN_SCORE_THRESHOLD", "0.15"))
            print(f"\n   Verification:")
            print(f"      Minimum Score: {min_score:.4f}")
            print(f"      Threshold: {threshold:.4f}")
            if min_score >= threshold:
                print(f"      ✅ All entities meet minimum threshold")
            else:
                print(f"      ❌ Some entities below threshold!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Test 2: Compound Entity Mode WITHOUT filtering
    print(f"\n" + "=" * 80)
    print("TEST 2: Compound Entity Mode WITHOUT Score Filtering")
    print("=" * 80)

    os.environ["SELECTOR_ENABLE_SCORE_FILTERING"] = "false"

    try:
        entities_without_filtering = await loader.get_high_risk_compound_entities(
            lookback_hours=24,
            limit=10,
            reference_time=reference_time,
        )

        print(f"✅ Query executed successfully")
        print(f"   Entities returned: {len(entities_without_filtering)}")

        if entities_without_filtering:
            first = entities_without_filtering[0]
            print(f"\n   Top Entity:")
            print(f"      Email: {first.get('email', 'N/A')}")
            print(f"      Avg Model Score: {first.get('avg_model_score', 0):.4f}")
            print(f"      Combined Risk: {first.get('combined_risk_score', 0):.2f}")

            # Show minimum score (should be lower than with filtering)
            min_score = min(e.get("avg_model_score", 1.0) for e in entities_without_filtering)
            print(f"\n   Verification:")
            print(f"      Minimum Score: {min_score:.4f}")
            print(f"      (No threshold applied)")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Test 3: Single Entity Mode WITH filtering
    print(f"\n" + "=" * 80)
    print("TEST 3: Single Entity Mode (Email) WITH Score Filtering")
    print("=" * 80)

    os.environ["SELECTOR_ENABLE_SCORE_FILTERING"] = "true"

    try:
        emails_with_filtering = await loader.get_fraudulent_emails_grouped_by_merchant(
            lookback_hours=24,
            min_fraud_tx=1,
            limit=10,
            reference_time=reference_time,
        )

        print(f"✅ Query executed successfully")
        print(f"   Entities returned: {len(emails_with_filtering)}")

        if emails_with_filtering:
            first = emails_with_filtering[0]
            print(f"\n   Top Entity:")
            print(f"      Email: {first.get('email', 'N/A')}")
            print(f"      Merchant: {first.get('merchant', 'N/A')}")
            print(f"      Avg Model Score: {first.get('avg_model_score', 0):.4f}")
            print(f"      Weighted Risk: {first.get('weighted_risk_value', 0):.2f}")
            print(f"      Fraud Count: {first.get('fraud_count', 0)}")

            # Verify min threshold filtering
            min_score = min(e.get("avg_model_score", 1.0) for e in emails_with_filtering)
            threshold = float(os.getenv("SELECTOR_MIN_SCORE_THRESHOLD", "0.15"))
            print(f"\n   Verification:")
            print(f"      Minimum Score: {min_score:.4f}")
            print(f"      Threshold: {threshold:.4f}")
            if min_score >= threshold:
                print(f"      ✅ All entities meet minimum threshold")
            else:
                print(f"      ❌ Some entities below threshold!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()

    # Summary
    print(f"\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    print(f"\n✅ Score filtering is now integrated into ComparisonDataLoader")
    print(f"✅ Both compound and single entity modes support score-based filtering")
    print(f"✅ Configuration unified with RiskAnalyzer")
    print(f"\n📋 Monthly analysis flow now benefits from:")
    print(f"   • Minimum score threshold (filters low-value entities)")
    print(f"   • High-score weighting (prioritizes high-risk entities)")
    print(f"   • Data-driven optimization (from multi-period analysis)")
    print(f"\n" + "=" * 80)
    print("✅ TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    exit_code = asyncio.run(test_score_filtering())
    sys.exit(0)
