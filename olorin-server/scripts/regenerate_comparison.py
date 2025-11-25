#!/usr/bin/env python3
"""
Script to regenerate comparison reports with entity labels.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from pathlib import Path

from app.service.investigation.auto_comparison import run_auto_comparison_for_entity


async def regenerate_comparison(entity_id: str, entity_type: str = "email"):
    """Regenerate comparison report for a specific entity."""
    print(f"🔄 Regenerating comparison for {entity_type}:{entity_id}\n")

    try:
        result = await run_auto_comparison_for_entity(
            entity_value=entity_id,
            entity_type=entity_type,
            reports_dir=Path("artifacts/comparisons/regenerated"),
        )

        if result.get("status") == "success":
            print(f"✅ Comparison regenerated successfully!")
            print(f"   Report: {result.get('report_path')}")
            print(
                f"   Window A: {result.get('metrics', {}).get('window_a_transactions', 0)} transactions"
            )
            print(
                f"   Window B: {result.get('metrics', {}).get('window_b_transactions', 0)} transactions"
            )
            return result
        else:
            print(f"❌ Comparison failed: {result.get('error', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"❌ Error regenerating comparison: {e}")
        import traceback

        traceback.print_exc()
        return None


if __name__ == "__main__":
    entities = [
        ("moeller2media@gmail.com", "email"),
        ("okuoku1959122@gmail.com", "email"),
    ]

    if len(sys.argv) > 1:
        entity_id = sys.argv[1]
        entity_type = sys.argv[2] if len(sys.argv) > 2 else "email"
        entities = [(entity_id, entity_type)]

    print(f"Regenerating {len(entities)} comparison(s) with entity labels...\n")

    async def run_all():
        results = []
        for entity_id, entity_type in entities:
            result = await regenerate_comparison(entity_id, entity_type)
            results.append(result)
            print()  # Blank line between results
        return results

    asyncio.run(run_all())
