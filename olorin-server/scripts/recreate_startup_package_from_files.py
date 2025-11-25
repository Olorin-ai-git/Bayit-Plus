#!/usr/bin/env python3
"""
Recreate the startup comparison zip package from existing comparison files.

This script finds the latest comparison reports and startup report,
then recreates the zip package using the proper package_comparison_results function.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.auto_comparison import package_comparison_results
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def recreate_package_from_files():
    """Recreate package from existing comparison files."""
    print("📦 Recreating startup comparison package from existing files...\n")

    config = FileOrganizationConfig()
    auto_startup_dir = config.artifacts_base_dir / "comparisons" / "auto_startup"
    startup_reports_dir = config.artifacts_base_dir / "reports" / "startup"

    # Find latest comparison directory with files
    timestamp_dirs = []
    if auto_startup_dir.exists():
        for item in auto_startup_dir.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                # Check if directory has comparison files
                comparison_files = list(item.glob("comparison_*.html"))
                if comparison_files:
                    timestamp_dirs.append((item, comparison_files))

    if not timestamp_dirs:
        print("❌ No comparison directories with files found")
        return None

    # Sort by modification time (newest first)
    timestamp_dirs.sort(key=lambda x: x[0].stat().st_mtime, reverse=True)
    latest_dir, comparison_files = timestamp_dirs[0]

    print(f"📁 Found latest comparison directory: {latest_dir.name}")
    print(f"📄 Found {len(comparison_files)} comparison report(s)")

    # Find latest startup report
    startup_report_path = None
    if startup_reports_dir.exists():
        startup_reports = sorted(
            startup_reports_dir.glob("startup_analysis_*.html"),
            key=lambda x: x.stat().st_mtime,
            reverse=True,
        )
        if startup_reports:
            startup_report_path = str(startup_reports[0])
            print(f"📊 Found startup report: {startup_reports[0].name}")

    # Build comparison_results list from files
    comparison_results = []
    for comp_file in comparison_files:
        # Extract entity info from filename: comparison_email_entity-id_timestamp.html
        parts = comp_file.stem.split("_")
        if len(parts) >= 3:
            entity_type = parts[1]  # email, device_id, etc.
            entity_id = "_".join(parts[2:-1])  # Everything between type and timestamp
            timestamp = parts[-1]

            comparison_results.append(
                {
                    "status": "success",
                    "entity_type": entity_type,
                    "entity_value": entity_id.replace("-at-", "@").replace("-", "."),
                    "report_path": str(comp_file),
                    "investigation_id": None,  # Not available from file alone
                }
            )

    print(f"\n📋 Reconstructed {len(comparison_results)} comparison result(s)")
    for i, result in enumerate(comparison_results, 1):
        print(f"   {i}. {result['entity_type']}:{result['entity_value']}")

    # Use the latest directory as output directory
    output_dir = latest_dir

    # Create package using proper function
    print(f"\n📦 Creating zip package in: {output_dir}")
    zip_path = await package_comparison_results(
        comparison_results=comparison_results,
        output_dir=output_dir,
        startup_report_path=startup_report_path,
    )

    print(f"\n✅ Package created successfully!")
    print(f"   Location: {zip_path}")
    print(f"   Size: {zip_path.stat().st_size:,} bytes")

    return zip_path


if __name__ == "__main__":
    result = asyncio.run(recreate_package_from_files())
    if result:
        print(f"\n✅ Success! Package available at: {result}")
    else:
        print("\n❌ Failed to create package")
        sys.exit(1)
