#!/usr/bin/env python3
"""
Script to fix all reports in the analysis flow by regenerating them with entity labels.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from pathlib import Path

from app.service.investigation.auto_comparison import (
    package_comparison_results,
    run_auto_comparison_for_entity,
)
from app.service.reporting.startup_report_generator import generate_startup_report


async def fix_all_reports():
    """Fix all reports by regenerating them with entity labels."""
    print("🔧 Fixing all reports in analysis flow...\n")

    # Entities that now have labels
    entities = [
        ("moeller2media@gmail.com", "email"),
        ("okuoku1959122@gmail.com", "email"),
    ]

    # Regenerate comparison reports in auto_startup directory
    print("=" * 70)
    print("Step 1: Regenerating comparison reports with entity labels")
    print("=" * 70)

    comparison_results = []
    reports_dir = Path("artifacts/comparisons/auto_startup")
    reports_dir.mkdir(parents=True, exist_ok=True)

    for entity_id, entity_type in entities:
        print(f"\n🔄 Regenerating comparison for {entity_type}:{entity_id}")
        try:
            result = await run_auto_comparison_for_entity(
                entity_value=entity_id, entity_type=entity_type, reports_dir=reports_dir
            )

            if result.get("status") == "success":
                comparison_results.append(result)
                print(f"✅ Comparison regenerated: {result.get('report_path')}")
            else:
                print(f"❌ Comparison failed: {result.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"❌ Error regenerating comparison: {e}")
            import traceback

            traceback.print_exc()

    print(f"\n✅ Regenerated {len(comparison_results)} comparison reports")

    # Regenerate startup analysis report
    print("\n" + "=" * 70)
    print("Step 2: Regenerating startup analysis report")
    print("=" * 70)

    try:
        # Create mock app.state with comparison results
        app_state = {
            "auto_comparison_results": comparison_results,
            "auto_comparison_completed": True,
            "startup_duration_seconds": None,
        }

        startup_report_path = generate_startup_report(
            app_state=app_state, startup_duration_seconds=None
        )
        print(f"✅ Startup analysis report regenerated: {startup_report_path}")

        # Regenerate zip package with updated reports
        print("\n" + "=" * 70)
        print("Step 3: Regenerating zip package")
        print("=" * 70)

        zip_path = await package_comparison_results(
            comparison_results=comparison_results,
            output_dir=Path("artifacts/comparisons"),
            startup_report_path=str(startup_report_path),
        )
        print(f"✅ Zip package regenerated: {zip_path}")

    except Exception as e:
        print(f"❌ Error regenerating startup report or zip: {e}")
        import traceback

        traceback.print_exc()

    print("\n" + "=" * 70)
    print("✅ All reports fixed!")
    print("=" * 70)
    print(f"   - Regenerated {len(comparison_results)} comparison reports")
    print(f"   - Regenerated startup analysis report")
    print(f"   - Regenerated zip package")


if __name__ == "__main__":
    asyncio.run(fix_all_reports())
