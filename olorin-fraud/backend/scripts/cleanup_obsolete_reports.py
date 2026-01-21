#!/usr/bin/env python3
"""
Script to delete obsolete reports that don't have entity labels.
Keeps only the latest regenerated reports.
"""
import os
import sys
from datetime import datetime
from pathlib import Path


def cleanup_obsolete_reports():
    """Delete obsolete reports, keeping only the latest regenerated ones."""
    print("🧹 Cleaning up obsolete reports...\n")

    # Keep the latest regenerated reports (from 20251114_15*)
    latest_timestamp_prefix = "20251114_15"

    deleted_count = 0

    # 1. Clean up old comparison reports in auto_startup
    print("=" * 70)
    print("Step 1: Cleaning up old comparison reports")
    print("=" * 70)

    auto_startup_dir = Path("artifacts/comparisons/auto_startup")
    if auto_startup_dir.exists():
        for report_file in auto_startup_dir.glob("comparison_*.html"):
            # Keep only reports from latest regeneration (15:24+)
            if (
                latest_timestamp_prefix not in report_file.name
                or "152435" not in report_file.name
                and "152727" not in report_file.name
            ):
                print(f"  🗑️  Deleting: {report_file.name}")
                report_file.unlink()
                deleted_count += 1
            else:
                print(f"  ✅ Keeping: {report_file.name}")

    # 2. Clean up old startup analysis reports
    print("\n" + "=" * 70)
    print("Step 2: Cleaning up old startup analysis reports")
    print("=" * 70)

    reports_dir = Path("artifacts/reports")
    if reports_dir.exists():
        for report_file in reports_dir.glob("startup_analysis_*.html"):
            # Keep only the latest one (152727)
            if "20251114_152727" not in report_file.name:
                print(f"  🗑️  Deleting: {report_file.name}")
                report_file.unlink()
                deleted_count += 1
            else:
                print(f"  ✅ Keeping: {report_file.name}")

    # 3. Clean up old zip packages
    print("\n" + "=" * 70)
    print("Step 3: Cleaning up old zip packages")
    print("=" * 70)

    comparisons_dir = Path("artifacts/comparisons")
    if comparisons_dir.exists():
        for zip_file in comparisons_dir.glob("comparison_package_*.zip"):
            # Keep only the latest one (152727)
            if "20251114_152727" not in zip_file.name:
                print(f"  🗑️  Deleting: {zip_file.name}")
                zip_file.unlink()
                deleted_count += 1
            else:
                print(f"  ✅ Keeping: {zip_file.name}")

    # 4. Clean up old regenerated reports (keep them, but remove duplicates)
    print("\n" + "=" * 70)
    print("Step 4: Checking regenerated reports directory")
    print("=" * 70)

    regenerated_dir = Path("artifacts/comparisons/regenerated")
    if regenerated_dir.exists():
        regenerated_reports = list(regenerated_dir.glob("comparison_*.html"))
        if regenerated_reports:
            print(
                f"  ✅ Found {len(regenerated_reports)} regenerated reports (keeping all)"
            )
            for report in regenerated_reports:
                print(f"     - {report.name}")

    print("\n" + "=" * 70)
    print(f"✅ Cleanup complete! Deleted {deleted_count} obsolete reports")
    print("=" * 70)

    # Show what's kept
    print("\n📊 Remaining reports:")
    print(
        f"   - Comparison reports in auto_startup: {len(list(auto_startup_dir.glob('*.html'))) if auto_startup_dir.exists() else 0}"
    )
    print(
        f"   - Startup analysis reports: {len(list(reports_dir.glob('startup_analysis_*.html'))) if reports_dir.exists() else 0}"
    )
    print(
        f"   - Zip packages: {len(list(comparisons_dir.glob('comparison_package_*.zip'))) if comparisons_dir.exists() else 0}"
    )
    print(
        f"   - Regenerated reports: {len(list(regenerated_dir.glob('*.html'))) if regenerated_dir.exists() else 0}"
    )


if __name__ == "__main__":
    cleanup_obsolete_reports()
