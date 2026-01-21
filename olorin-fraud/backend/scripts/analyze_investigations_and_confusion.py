#!/usr/bin/env python3
"""
Analyze recent investigations and confusion tables.

This script:
1. Lists recent investigations from the database
2. Extracts confusion matrix data from comparison results
3. Analyzes per-transaction scoring usage
4. Generates summary report
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def analyze_comparison_package(package_path: Path) -> Dict[str, Any]:
    """Analyze a comparison package zip file."""
    import re
    import zipfile

    results = {
        "package_path": str(package_path),
        "investigation_ids": [],
        "entities": [],
        "risk_scores": [],
        "confusion_metrics": {},
        "has_confusion_data": False,
    }

    try:
        with zipfile.ZipFile(package_path, "r") as zip_ref:
            # Extract and analyze HTML file
            html_files = [f for f in zip_ref.namelist() if f.endswith(".html")]

            for html_file in html_files:
                content = zip_ref.read(html_file).decode("utf-8", errors="ignore")

                # Find investigation IDs
                inv_pattern = r"auto-comp-[a-f0-9]+"
                inv_ids = list(set(re.findall(inv_pattern, content)))
                results["investigation_ids"].extend(inv_ids)

                # Find risk scores
                risk_pattern = r"risk[_\s]*score[:\s]*([0-9.]+)"
                risks = re.findall(risk_pattern, content, re.IGNORECASE)
                results["risk_scores"].extend([float(r) for r in risks])

                # Find entity info
                entity_pattern = r"entity[:\s]*([a-z]+)[\s-]+([^\s<,]+)"
                entities = re.findall(entity_pattern, content, re.IGNORECASE)
                results["entities"].extend(entities)

                # Find confusion matrix metrics
                confusion_pattern = (
                    r"(TP|FP|TN|FN|Precision|Recall|F1|Accuracy)[:\s]*([0-9.]+)"
                )
                confusion = re.findall(confusion_pattern, content, re.IGNORECASE)
                if confusion:
                    results["has_confusion_data"] = True
                    for metric, value in confusion:
                        metric_key = metric.lower()
                        if metric_key not in results["confusion_metrics"]:
                            results["confusion_metrics"][metric_key] = []
                        results["confusion_metrics"][metric_key].append(float(value))

    except Exception as e:
        logger.error(f"Failed to analyze package {package_path}: {e}", exc_info=True)

    return results


def main():
    """Main analysis function."""
    print("=" * 80)
    print("INVESTIGATIONS AND CONFUSION TABLE ANALYSIS")
    print("=" * 80)
    print()

    # Find comparison packages
    comparison_dir = Path("artifacts/comparisons/auto_startup")
    packages = sorted(
        comparison_dir.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True
    )

    print(f"Found {len(packages)} comparison packages")
    print()

    if packages:
        print("=" * 80)
        print("LATEST COMPARISON PACKAGE ANALYSIS")
        print("=" * 80)
        print()

        latest_package = packages[0]
        print(f"Package: {latest_package.name}")
        print(f"Modified: {datetime.fromtimestamp(latest_package.stat().st_mtime)}")
        print()

        analysis = analyze_comparison_package(latest_package)

        print("Investigation IDs found:")
        unique_inv_ids = list(set(analysis["investigation_ids"]))[:10]
        for inv_id in unique_inv_ids:
            print(f"  - {inv_id}")
        print()

        print("Entities found:")
        unique_entities = list(set(analysis["entities"]))[:10]
        for entity_type, entity_id in unique_entities:
            print(f"  - {entity_type}: {entity_id[:50]}")
        print()

        print("Risk Scores found:")
        if analysis["risk_scores"]:
            print(f"  - Count: {len(analysis['risk_scores'])}")
            print(f"  - Min: {min(analysis['risk_scores']):.3f}")
            print(f"  - Max: {max(analysis['risk_scores']):.3f}")
            print(
                f"  - Avg: {sum(analysis['risk_scores']) / len(analysis['risk_scores']):.3f}"
            )
        else:
            print("  - No risk scores found")
        print()

        print("Confusion Matrix Metrics:")
        if analysis["has_confusion_data"]:
            for metric, values in analysis["confusion_metrics"].items():
                if values:
                    print(
                        f"  - {metric.upper()}: {values[:5]} (found {len(values)} values)"
                    )
        else:
            print("  - No confusion matrix data found in HTML")
        print()

    # Check for confusion table HTML files
    confusion_files = list(
        Path("artifacts/comparisons/auto_startup").glob("confusion_table_*.html")
    )

    print("=" * 80)
    print("CONFUSION TABLE FILES")
    print("=" * 80)
    print()

    if confusion_files:
        print(f"Found {len(confusion_files)} confusion table files")
        for cf in sorted(
            confusion_files, key=lambda p: p.stat().st_mtime, reverse=True
        )[:5]:
            print(
                f"  - {cf.name} (modified: {datetime.fromtimestamp(cf.stat().st_mtime)})"
            )
    else:
        print("No confusion table files found")
    print()

    print("=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
