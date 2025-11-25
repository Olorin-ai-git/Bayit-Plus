#!/usr/bin/env python3
"""
Script to create a zip package from the last comparison results.
Finds comparison reports and investigation folders, then packages them.
"""

import asyncio
import json
import re

# Add parent directory to path for imports
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.investigation.auto_comparison import (
    generate_summary_html,
    package_comparison_results,
)
from app.service.logging.investigation_folder_manager import get_folder_manager


async def find_last_comparisons() -> List[Dict[str, Any]]:
    """
    Find the last comparison results by searching for comparison HTML files
    and matching investigation IDs.
    """
    # Search for comparison HTML files
    comparison_reports = []
    base_dir = Path(__file__).parent.parent  # olorin-server directory

    # Check common locations
    search_paths = [
        base_dir / "artifacts/comparisons",
        base_dir / "artifacts/comparisons/auto_startup",
        base_dir / "logs/comparisons",
    ]

    for search_path in search_paths:
        if search_path.exists():
            print(f"  Searching in: {search_path}")
            for html_file in search_path.glob("comparison_*.html"):
                print(f"    Found: {html_file.name}")
                # Parse filename: comparison_{entity_type}_{entity_value}_{timestamp}.html
                # Handle cases where entity_value might have underscores (like email addresses)
                # Pattern: comparison_email_okuoku1959122_gmail.com_20251114_075517.html
                match = re.match(
                    r"comparison_([^_]+)_(.+?)_(\d{8}_\d{6})\.html", html_file.name
                )
                if match:
                    entity_type, entity_value, timestamp = match.groups()
                    # Clean up entity_value (replace underscores with dots for emails)
                    if "@" in entity_value:
                        entity_value = entity_value.replace("_", ".")
                    comparison_reports.append(
                        {
                            "report_path": str(html_file.absolute()),
                            "entity_type": entity_type,
                            "entity_value": entity_value,
                            "timestamp": timestamp,
                            "file": html_file,
                        }
                    )
                else:
                    print(f"    ⚠️ Could not parse filename: {html_file.name}")

    # Sort by timestamp (newest first) and take top 3
    comparison_reports.sort(key=lambda x: x["timestamp"], reverse=True)
    top_3 = comparison_reports[:3]

    print(f"Found {len(comparison_reports)} comparison reports")
    print(f"Using top {len(top_3)} reports:")
    for i, report in enumerate(top_3, 1):
        print(
            f"  {i}. {report['entity_type']}: {report['entity_value']} ({report['timestamp']})"
        )

    # Try to find investigation IDs by searching investigation folders
    folder_manager = get_folder_manager()

    # Search for investigations matching these entities
    results = []
    for i, report in enumerate(top_3, 1):
        entity_value = report["entity_value"]
        entity_type = report["entity_type"]

        # Try to find investigation folder by searching metadata
        investigation_id = None
        investigation_folder = None

        # Search investigation folders
        base_inv_dir = folder_manager.base_logs_dir
        # Ensure absolute path
        if not base_inv_dir.is_absolute():
            base_inv_dir = base_dir / base_inv_dir
        if base_inv_dir.exists():
            for inv_folder in base_inv_dir.iterdir():
                if not inv_folder.is_dir():
                    continue

                # Check metadata.json
                metadata_file = inv_folder / "metadata.json"
                if metadata_file.exists():
                    try:
                        with open(metadata_file) as f:
                            metadata = json.load(f)
                            config = metadata.get("config", {})

                            # Check if entity matches
                            if isinstance(config, dict):
                                entities = config.get("entities", [])
                                if isinstance(entities, list) and len(entities) > 0:
                                    entity_config = (
                                        entities[0]
                                        if isinstance(entities[0], dict)
                                        else {}
                                    )
                                    if (
                                        entity_config.get("entity_value")
                                        == entity_value
                                        or entity_config.get("entity_id")
                                        == entity_value
                                    ):
                                        investigation_id = metadata.get(
                                            "investigation_id"
                                        )
                                        investigation_folder = inv_folder
                                        break
                    except Exception as e:
                        continue

        # If not found, try legacy investigation_logs
        if not investigation_folder:
            legacy_dir = base_dir / "investigation_logs"
            if legacy_dir.exists():
                # Search for folders that might match
                for inv_folder in legacy_dir.iterdir():
                    if inv_folder.is_dir() and entity_value in inv_folder.name:
                        investigation_id = inv_folder.name
                        investigation_folder = inv_folder
                        break

        results.append(
            {
                "status": "success",
                "entity_type": entity_type,
                "entity_value": entity_value,
                "report_path": report["report_path"],
                "investigation_id": investigation_id,
                "investigation_folder": (
                    str(investigation_folder) if investigation_folder else None
                ),
            }
        )

    return results


async def create_package_from_files():
    """Create zip package from found comparison files."""
    print("🔍 Searching for last comparison results...")

    comparison_results = await find_last_comparisons()

    if not comparison_results:
        print("❌ No comparison results found!")
        return None

    print(f"\n📦 Creating package from {len(comparison_results)} comparisons...")

    # Create output directory
    base_dir = Path(__file__).parent.parent  # olorin-server directory
    output_dir = base_dir / "artifacts/comparisons"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create timestamped zip filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"comparison_package_{timestamp}.zip"
    zip_path = output_dir / zip_filename

    print(f"📦 Creating comparison package: {zip_path}")

    folder_manager = get_folder_manager()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        investigation_data = []

        for i, result in enumerate(comparison_results, 1):
            entity_value = result.get("entity_value", f"entity_{i}")
            entity_type = result.get("entity_type", "unknown")
            investigation_id = result.get("investigation_id")
            report_path = result.get("report_path")

            print(f"\n  Processing comparison {i}/{len(comparison_results)}:")
            print(f"    Entity: {entity_type}={entity_value}")

            # Add comparison report to zip
            if report_path and Path(report_path).exists():
                report_name = f"comparison_reports/comparison_{i}_{entity_type}_{entity_value[:30]}.html"
                zipf.write(report_path, report_name)
                print(f"    ✅ Added comparison report: {report_name}")
            else:
                print(f"    ⚠️ Comparison report not found: {report_path}")

            # Find and add investigation folder
            investigation_folder = None
            if investigation_id:
                investigation_folder = folder_manager.get_investigation_folder(
                    investigation_id
                )

            # Also try the investigation_folder from result
            if not investigation_folder and result.get("investigation_folder"):
                investigation_folder = Path(result["investigation_folder"])

            if investigation_folder and investigation_folder.exists():
                folder_name_in_zip = (
                    f"investigations/investigation_{i}_{investigation_id or 'unknown'}"
                )

                # Walk through folder and add all files
                import os

                for root, dirs, files in os.walk(investigation_folder):
                    dirs[:] = [d for d in dirs if d not in ["__pycache__", ".git"]]

                    for file in files:
                        if file.endswith(".pyc") or file.startswith("."):
                            continue

                        file_path = Path(root) / file
                        arcname = folder_name_in_zip / file_path.relative_to(
                            investigation_folder
                        )
                        zipf.write(file_path, str(arcname))

                print(f"    ✅ Added investigation folder: {investigation_id}")

                # Load investigation metadata
                metadata_file = investigation_folder / "metadata.json"
                investigation_metadata = None
                if metadata_file.exists():
                    try:
                        with open(metadata_file) as f:
                            investigation_metadata = json.load(f)
                    except Exception as e:
                        print(f"    ⚠️ Failed to load metadata: {e}")

                investigation_data.append(
                    {
                        "index": i,
                        "entity_type": entity_type,
                        "entity_value": entity_value,
                        "investigation_id": investigation_id,
                        "investigation_folder": str(investigation_folder),
                        "metadata": investigation_metadata,
                        "comparison_metrics": {},  # We don't have the full comparison response
                    }
                )
            else:
                print(f"    ⚠️ Investigation folder not found for: {investigation_id}")
                # Still add entry without investigation folder
                investigation_data.append(
                    {
                        "index": i,
                        "entity_type": entity_type,
                        "entity_value": entity_value,
                        "investigation_id": investigation_id,
                        "investigation_folder": None,
                        "metadata": None,
                        "comparison_metrics": {},
                    }
                )

        # Generate summary HTML
        summary_html = generate_summary_html(investigation_data)
        zipf.writestr("summary.html", summary_html)
        print(f"\n  ✅ Added summary HTML")

    print(f"\n✅ Comparison package created: {zip_path}")
    return zip_path


if __name__ == "__main__":
    zip_path = asyncio.run(create_package_from_files())
    if zip_path:
        print(f"\n📦 Package location: {zip_path.absolute()}")
