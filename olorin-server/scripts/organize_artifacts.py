#!/usr/bin/env python3
"""
Organize artifacts folder into a proper hierarchical structure.

Target structure:
artifacts/
├── investigations/
│   ├── {entity_type}/
│   │   └── {entity_id}/
│   │       ├── investigation_{entity_type}_{entity_id}_{date_range}.html
│   │       └── investigation_{entity_type}_{entity_id}_{date_range}.json
├── comparisons/
│   ├── auto_startup/
│   │   ├── comparison_{entity_type}_{entity_id}_{timestamp}.html
│   │   └── comparison_package_{timestamp}.zip
│   └── manual/
│       └── comparison_{entity_type}_{entity_id}_{timestamp}.html
└── reports/
    └── startup/
        └── startup_analysis_{timestamp}.html
"""

import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


def parse_investigation_filename(filename: str) -> dict:
    """Parse investigation filename to extract entity info."""
    # Format: investigation_email_moeller2media-gmail-com_20251028_20251114.html
    pattern = r"investigation_(\w+)_([\w\-\.]+)_(\d{8})_(\d{8})\.(html|json)"
    match = re.match(pattern, filename)
    if match:
        return {
            "entity_type": match.group(1),
            "entity_id": match.group(2).replace("-", "."),
            "date_start": match.group(3),
            "date_end": match.group(4),
            "ext": match.group(5),
        }
    return None


def parse_comparison_filename(filename: str) -> dict:
    """Parse comparison filename to extract entity info."""
    # Format: comparison_email_moeller2media_gmail.com_20251114_153855.html
    pattern = r"comparison_(\w+)_([\w\-\.]+)_(\d{8}_\d{6})\.html"
    match = re.match(pattern, filename)
    if match:
        return {
            "entity_type": match.group(1),
            "entity_id": match.group(2),
            "timestamp": match.group(3),
        }
    return None


def organize_artifacts():
    """Organize artifacts folder into proper structure."""
    artifacts_dir = Path("artifacts")
    if not artifacts_dir.exists():
        print("❌ Artifacts directory not found")
        return

    print("🧹 Organizing artifacts folder...\n")

    # Create target directories
    investigations_dir = artifacts_dir / "investigations"
    comparisons_dir = artifacts_dir / "comparisons"
    reports_dir = artifacts_dir / "reports"

    investigations_dir.mkdir(exist_ok=True)
    (comparisons_dir / "auto_startup").mkdir(parents=True, exist_ok=True)
    (comparisons_dir / "manual").mkdir(parents=True, exist_ok=True)
    (reports_dir / "startup").mkdir(parents=True, exist_ok=True)

    moved_count = 0

    # 1. Move investigation files from root to investigations/{entity_type}/{entity_id}/
    print("📁 Organizing investigation files...")
    for file_path in list(artifacts_dir.glob("investigation_*.html")) + list(
        artifacts_dir.glob("investigation_*.json")
    ):
        info = parse_investigation_filename(file_path.name)
        if info:
            entity_type_dir = investigations_dir / info["entity_type"]
            entity_id_dir = entity_type_dir / info["entity_id"]
            entity_id_dir.mkdir(parents=True, exist_ok=True)

            target_path = entity_id_dir / file_path.name
            if not target_path.exists():
                shutil.move(str(file_path), str(target_path))
                print(
                    f"  ✅ Moved: {file_path.name} → investigations/{info['entity_type']}/{info['entity_id']}/"
                )
                moved_count += 1
            else:
                print(f"  ⚠️  Skipped (exists): {file_path.name}")
                file_path.unlink()  # Remove duplicate
        else:
            print(f"  ⚠️  Could not parse: {file_path.name}")

    # 2. Move comparison files from regenerated/ to auto_startup/
    print("\n📊 Organizing comparison files...")
    regenerated_dir = artifacts_dir / "comparisons" / "regenerated"
    if regenerated_dir.exists():
        for file_path in regenerated_dir.glob("comparison_*.html"):
            target_path = comparisons_dir / "auto_startup" / file_path.name
            if not target_path.exists():
                shutil.move(str(file_path), str(target_path))
                print(f"  ✅ Moved: {file_path.name} → comparisons/auto_startup/")
                moved_count += 1
            else:
                print(f"  ⚠️  Skipped (exists): {file_path.name}")
                file_path.unlink()

        # Remove empty regenerated directory
        try:
            regenerated_dir.rmdir()
            print(f"  🗑️  Removed empty directory: comparisons/regenerated/")
        except:
            pass

    # 3. Move comparison packages (zip files) to auto_startup/
    print("\n📦 Organizing comparison packages...")
    for zip_file in artifacts_dir.glob("comparisons/comparison_package_*.zip"):
        target_path = comparisons_dir / "auto_startup" / zip_file.name
        if not target_path.exists():
            shutil.move(str(zip_file), str(target_path))
            print(f"  ✅ Moved: {zip_file.name} → comparisons/auto_startup/")
            moved_count += 1
        else:
            print(f"  ⚠️  Skipped (exists): {zip_file.name}")
            zip_file.unlink()

    # 4. Move startup analysis reports to reports/startup/
    print("\n📈 Organizing startup reports...")
    reports_source_dir = artifacts_dir / "reports"
    if reports_source_dir.exists():
        for report_file in reports_source_dir.glob("startup_analysis_*.html"):
            target_path = reports_dir / "startup" / report_file.name
            if not target_path.exists():
                shutil.move(str(report_file), str(target_path))
                print(f"  ✅ Moved: {report_file.name} → reports/startup/")
                moved_count += 1
            else:
                print(f"  ⚠️  Skipped (exists): {report_file.name}")
                report_file.unlink()

    # 5. Clean up empty comparison package directories
    print("\n🧹 Cleaning up empty directories...")
    for pkg_dir in artifacts_dir.glob("comparisons/comparison_package_*"):
        if pkg_dir.is_dir():
            try:
                # Check if directory is empty or only contains expected subdirectories
                contents = list(pkg_dir.iterdir())
                if not contents:
                    pkg_dir.rmdir()
                    print(f"  🗑️  Removed empty directory: {pkg_dir.name}/")
            except:
                pass

    print(f"\n✅ Organization complete! Moved {moved_count} files.")
    print(f"\n📂 New structure:")
    print(f"   artifacts/investigations/{{entity_type}}/{{entity_id}}/")
    print(f"   artifacts/comparisons/auto_startup/")
    print(f"   artifacts/reports/startup/")


if __name__ == "__main__":
    organize_artifacts()
