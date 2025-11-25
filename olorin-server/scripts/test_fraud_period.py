#!/usr/bin/env python3
"""
Test Analyzer on Known Fraud Period (Apr-May 2025)

Based on systematic testing findings, we know Apr-May 2025 has fraud.
This script runs the analyzer on that specific period to verify fraud detection.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Load environment from env file if exists
env_file = Path(__file__).parent.parent / "env"
if env_file.exists():
    logger.info(f"Loading environment from {env_file}")
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key, value)


async def test_fraud_period():
    """
    Test analyzer on Apr-May 2025 period where systematic testing found fraud.

    From systematic testing:
    - Apr-May 2025 showed 2.6% precision
    - Found 39 fraud entities per 1,500 entities
    - 600+ fraud transactions
    """

    logger.info("=" * 80)
    logger.info("🔍 TESTING ANALYZER ON KNOWN FRAUD PERIOD")
    logger.info("=" * 80)
    logger.info("")
    logger.info(
        "📅 Target Period: April-May 2025 (6 months ago from systematic testing)"
    )
    logger.info("🎯 Expected: ~2.6% precision, 39 fraud entities per 1,500")
    logger.info("🔧 Filter: MODEL_SCORE > 0.4 + volume ranking")
    logger.info("")

    # Calculate date range for Apr-May 2025
    # From systematic testing, this was "6 months ago" when tests ran
    # Let's target specific dates where we know fraud exists

    # Option 1: Use exact window from systematic testing
    # Window: 2025-05-25 to 2025-05-26 (24H)
    target_date = datetime(2025, 5, 25, 0, 0, 0)

    # Calculate offset from current date
    now = datetime.now()
    days_ago = (now - target_date).days

    logger.info(f"📊 Calculation:")
    logger.info(f"   Current Date: {now.strftime('%Y-%m-%d')}")
    logger.info(f"   Target Date:  {target_date.strftime('%Y-%m-%d')}")
    logger.info(f"   Days Ago:     {days_ago} days")
    logger.info("")

    # Temporarily override analyzer configuration to target this specific window
    # We'll set the END_OFFSET to point to May 25, 2025
    original_end_offset = os.getenv("ANALYZER_END_OFFSET_MONTHS", "6")

    # Calculate months offset from now to May 25, 2025
    months_offset = (now.year - target_date.year) * 12 + (now.month - target_date.month)

    logger.info(f"🔧 Configuration:")
    logger.info(f"   Original End Offset: {original_end_offset} months")
    logger.info(f"   Calculated Offset:   ~{months_offset} months to reach May 2025")
    logger.info(f"   Window Size:         24 hours")
    logger.info("")

    # Set environment for this test
    os.environ["ANALYZER_END_OFFSET_MONTHS"] = str(months_offset)
    os.environ["ANALYZER_TIME_WINDOW_HOURS"] = "24"

    try:
        # Get risk analyzer
        logger.info("🚀 Running analyzer on fraud period...")
        analyzer = get_risk_analyzer()

        # Run analysis
        results = await analyzer.get_top_risk_entities(force_refresh=True)

        if results.get("status") != "success":
            logger.error(f"❌ Analyzer failed: {results.get('error', 'Unknown error')}")
            return

        entities = results.get("entities", [])
        summary = results.get("summary", {})

        logger.info("")
        logger.info("=" * 80)
        logger.info("📊 ANALYZER RESULTS")
        logger.info("=" * 80)
        logger.info(f"Total Entities Found: {len(entities)}")
        logger.info(f"Time Window: {summary.get('time_window', 'N/A')}")
        logger.info(f"Query Type: {summary.get('query_type', 'N/A')}")
        logger.info("")

        # Show top 10 entities
        logger.info("🎯 Top 10 Entities:")
        for i, entity in enumerate(entities[:10], 1):
            logger.info(
                f"   {i:2d}. {entity.get('entity_value', 'N/A'):40s} "
                f"| Txs: {entity.get('transaction_count', 0):3d} "
                f"| Score: {entity.get('risk_score', 0):.3f}"
            )

        logger.info("")
        logger.info("=" * 80)
        logger.info("📋 NEXT STEPS")
        logger.info("=" * 80)
        logger.info("1. Investigate top 5-10 entities from this list")
        logger.info("2. Generate confusion matrices")
        logger.info("3. Compare precision with expected 2.6%")
        logger.info("4. Verify fraud transactions are detected")
        logger.info("")

        # Save results to file
        output_file = Path("artifacts/analyzer_fraud_period_test.json")
        output_file.parent.mkdir(parents=True, exist_ok=True)

        import json

        with open(output_file, "w") as f:
            json.dump(results, f, indent=2, default=str)

        logger.info(f"✅ Results saved to: {output_file}")
        logger.info("")

        return results

    finally:
        # Restore original configuration
        os.environ["ANALYZER_END_OFFSET_MONTHS"] = original_end_offset
        logger.info("🔄 Restored original analyzer configuration")


if __name__ == "__main__":
    # Run the test
    results = asyncio.run(test_fraud_period())

    if results and results.get("status") == "success":
        print("\n✅ Fraud period test completed successfully!")
        print(f"   Entities found: {len(results.get('entities', []))}")
        print("\nTo investigate these entities, run:")
        print("   python -m app.local_server")
        print("   # Then navigate to the analyzer results")
    else:
        print("\n❌ Fraud period test failed")
        sys.exit(1)
