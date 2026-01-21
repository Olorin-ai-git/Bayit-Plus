#!/usr/bin/env python3
"""
Repeat Investigation Script

Runs an investigation with the exact same parameters as a previous investigation.
For entity: thejockerchileno16@gmail.com
Investigation window: 2023-12-22 22:24:11 to 2024-12-16 22:24:11
GMV window: 2024-12-17 00:00:00 to 2025-06-15 00:00:00
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

from app.service.investigation.comparison_modules.comparison_executor import ComparisonExecutor
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def main():
    """Run investigation with exact same parameters as original."""

    # Original investigation parameters from auto-comp-1b8f14e1f64c
    entity_type = "email"
    entity_value = "thejockerchileno16@gmail.com"

    # Investigation window (when fraud was analyzed)
    investigation_start = datetime(2023, 12, 22, 22, 24, 11)
    investigation_end = datetime(2024, 12, 16, 22, 24, 11)

    # GMV window (future period showing what would have been saved)
    gmv_start = datetime(2024, 12, 17, 0, 0, 0)
    gmv_end = datetime(2025, 6, 15, 0, 0, 0)

    # Merchant context from original
    merchant_name = "Paybis"
    fraud_tx_count = 6  # From GMV window
    total_tx_count = 91  # From investigation window

    print("=" * 80)
    print("🔄 REPEATING INVESTIGATION: auto-comp-1b8f14e1f64c")
    print("=" * 80)
    print(f"Entity: {entity_type}:{entity_value}")
    print(f"Merchant: {merchant_name}")
    print(f"Investigation Window: {investigation_start} to {investigation_end}")
    print(f"GMV Window: {gmv_start} to {gmv_end}")
    print(f"Expected: {fraud_tx_count} fraud tx / {total_tx_count} total tx")
    print("=" * 80)

    # Set environment for max transactions
    os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "20000"

    executor = ComparisonExecutor()

    # Selector metadata for context
    selector_metadata = {
        "start_time": investigation_start,
        "end_time": investigation_end,
        "original_investigation_id": "auto-comp-1b8f14e1f64c",
        "repeat_timestamp": datetime.now().isoformat(),
    }

    logger.info(f"🚀 Starting investigation for {entity_type}={entity_value}")

    try:
        result = await executor.create_and_wait_for_investigation(
            entity_type=entity_type,
            entity_value=entity_value,
            window_start=investigation_start,
            window_end=investigation_end,
            merchant_name=merchant_name,
            fraud_tx_count=fraud_tx_count,
            total_tx_count=total_tx_count,
            selector_metadata=selector_metadata,
            max_wait_seconds=600,  # 10 minutes timeout
        )

        if result:
            investigation_id = result["investigation_id"]
            print(f"\n✅ Investigation completed: {investigation_id}")

            # Generate confusion matrix
            await executor.generate_confusion_matrix(investigation_id)
            print(f"✅ Confusion matrix generated")

            # Print results
            print("\n" + "=" * 80)
            print("INVESTIGATION RESULTS")
            print("=" * 80)
            print(f"Investigation ID: {investigation_id}")
            print(f"Status: {result.get('status', 'unknown')}")
            print(f"Merchant: {result.get('merchant_name', 'N/A')}")

            # Save result info
            output_dir = Path("artifacts/investigation_repeat_20251212_043120")
            output_dir.mkdir(parents=True, exist_ok=True)

            import json
            result_file = output_dir / "repeat_investigation_result.json"
            with open(result_file, "w") as f:
                # Convert datetime objects to strings for JSON serialization
                serializable_result = {
                    "investigation_id": investigation_id,
                    "status": result.get("status"),
                    "merchant_name": result.get("merchant_name"),
                    "entity_type": entity_type,
                    "entity_value": entity_value,
                    "investigation_start": investigation_start.isoformat(),
                    "investigation_end": investigation_end.isoformat(),
                    "gmv_start": gmv_start.isoformat(),
                    "gmv_end": gmv_end.isoformat(),
                    "repeat_timestamp": datetime.now().isoformat(),
                }
                json.dump(serializable_result, f, indent=2)

            print(f"\n📄 Result saved to: {result_file}")
            return investigation_id
        else:
            print("❌ Investigation failed")
            return None

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
