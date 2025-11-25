#!/usr/bin/env python3
"""
Script to recreate the zip package for the last startup analysis flow.

This script finds the latest comparison reports and startup report,
then recreates the zip package.
"""

import asyncio
import json
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import only what we need without triggering full app initialization
from app.config.file_organization_config import FileOrganizationConfig


def find_latest_startup_files():
    """Find the latest startup comparison files and report."""
    file_org_config = FileOrganizationConfig()
    auto_startup_dir = (
        file_org_config.artifacts_base_dir / "comparisons" / "auto_startup"
    )
    startup_reports_dir = file_org_config.artifacts_base_dir / "reports" / "startup"

    # Find latest startup report
    startup_reports = []
    if startup_reports_dir.exists():
        startup_reports = sorted(
            startup_reports_dir.glob("startup_analysis_*.html"),
            key=lambda x: x.stat().st_mtime,
            reverse=True,
        )

    latest_startup_report = startup_reports[0] if startup_reports else None

    # Find latest comparison directory
    timestamp_dirs = []
    if auto_startup_dir.exists():
        for item in auto_startup_dir.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                timestamp_dirs.append(item)

    if not timestamp_dirs:
        print("❌ No timestamp directories found in auto_startup")
        return None, None, None

    # Sort by modification time (newest first)
    timestamp_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    latest_dir = timestamp_dirs[0]

    print(f"📁 Found latest startup comparison directory: {latest_dir.name}")

    # Find all comparison HTML files in this directory
    comparison_files = list(latest_dir.glob("comparison_*.html"))

    if not comparison_files:
        print("❌ No comparison files found in latest directory")
        return None, None, None

    print(f"📄 Found {len(comparison_files)} comparison reports")
    if latest_startup_report:
        print(f"📊 Found startup report: {latest_startup_report.name}")

    return comparison_files, latest_startup_report, latest_dir


def create_zip_package(comparison_files, startup_report, output_dir):
    """Create zip package with comparison reports and startup report."""
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"comparison_package_{timestamp_str}.zip"
    zip_path = output_dir / zip_filename

    print(f"\n📦 Creating zip package: {zip_path.name}")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Add comparison reports
        comparison_reports_dir = "comparison_reports"
        for i, comp_file in enumerate(comparison_files, 1):
            arcname = f"{comparison_reports_dir}/comparison_{i}_{comp_file.name}"
            zipf.write(comp_file, arcname)
            print(f"   ✅ Added: {arcname}")

        # Add startup report if available
        if startup_report and startup_report.exists():
            zipf.write(startup_report, startup_report.name)
            print(f"   ✅ Added: {startup_report.name}")

        # Create summary HTML
        summary_html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Comparison Summary</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        .summary {{ background: #f5f5f5; padding: 15px; border-radius: 5px; }}
        .comparison {{ margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #007bff; }}
    </style>
</head>
<body>
    <h1>Comparison Summary</h1>
    <div class="summary">
        <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <p><strong>Total Comparisons:</strong> {len(comparison_files)}</p>
    </div>
    <h2>Comparison Reports</h2>
"""
        for i, comp_file in enumerate(comparison_files, 1):
            summary_html += f"""
    <div class="comparison">
        <h3>Comparison {i}</h3>
        <p><a href="comparison_reports/comparison_{i}_{comp_file.name}">{comp_file.name}</a></p>
    </div>
"""
        summary_html += """
</body>
</html>
"""
        zipf.writestr("summary.html", summary_html)
        print(f"   ✅ Added: summary.html")

    print(f"\n✅ Zip package created: {zip_path}")
    print(f"   Size: {zip_path.stat().st_size / 1024:.1f} KB")

    return zip_path


def main():
    """Main function."""
    print("=" * 70)
    print("Recreating Startup Zip Package")
    print("=" * 70)

    comparison_files, startup_report, output_dir = find_latest_startup_files()

    if not comparison_files or not output_dir:
        print("\n❌ Failed to find required files")
        sys.exit(1)

    zip_path = create_zip_package(comparison_files, startup_report, output_dir)

    print("\n" + "=" * 70)
    print("✅ Success!")
    print("=" * 70)
    print(f"Zip package: {zip_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
