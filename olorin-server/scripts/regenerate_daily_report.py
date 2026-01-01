#!/usr/bin/env python3
"""
Regenerate Daily Startup Report with Blindspot Heatmap.

Regenerates a daily startup analysis report for a specific date,
including the 2D blindspot heatmap from the ModelBlindspotAnalyzer.

Usage:
    poetry run python scripts/regenerate_daily_report.py --date 2024-12-15
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer
from app.service.logging import get_bridge_logger
from app.service.reporting.startup_report_generator import generate_startup_report

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("/Users/olorin/Documents/olorin/olorin-server/artifacts")
AUTO_STARTUP_DIR = ARTIFACTS_DIR / "comparisons" / "auto_startup"


def find_zip_package_for_date(target_date: str) -> Optional[Path]:
    """Find the zip package directory for a specific date."""
    if not AUTO_STARTUP_DIR.exists():
        return None

    # Look for directories matching the date pattern (YYYYMMDD_*)
    date_prefix = target_date.replace("-", "")

    for item in AUTO_STARTUP_DIR.iterdir():
        if item.is_dir() and item.name.startswith(date_prefix):
            if (item / "comparison_manifests.json").exists():
                return item

    # Also check for directories with timestamp format
    for item in sorted(AUTO_STARTUP_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if item.is_dir():
            manifests_file = item / "comparison_manifests.json"
            if manifests_file.exists():
                try:
                    with open(manifests_file, "r") as f:
                        data = json.load(f)
                        if data and len(data) > 0:
                            first_manifest = data[0]
                            manifest_date = first_manifest.get("metadata", {}).get("reference_date", "")
                            if target_date in manifest_date:
                                return item
                except Exception:
                    continue

    return None


def create_mock_app_state(zip_dir: Path) -> Any:
    """Create a mock app.state with data extracted from zip package."""
    app_state = type("MockAppState", (), {})()

    app_state.database_available = True
    app_state.database_provider = type("MockProvider", (), {"__name__": "SnowflakeProvider"})()
    app_state.risk_entities_loaded = True
    app_state.risk_entities_loaded_at = datetime.now().isoformat()
    app_state.auto_comparison_completed = True
    app_state.rag_system_available = False
    app_state.anomaly_detection_available = True
    app_state.detection_scheduler = type("MockScheduler", (), {})()
    app_state.logstream_config_valid = False

    comparison_results = []
    manifests_file = zip_dir / "comparison_manifests.json"
    if manifests_file.exists():
        try:
            with open(manifests_file, "r") as f:
                manifests = json.load(f)
                for manifest in manifests:
                    entity_info = manifest.get("entity", {})
                    comparison_results.append({
                        "entity_type": entity_info.get("entity_type"),
                        "entity_value": entity_info.get("entity_id"),
                        "investigation_id": manifest.get("metadata", {}).get("investigation_id"),
                        "status": "success",
                        "report_path": manifest.get("paths", {}).get("canonical"),
                        "metrics": manifest.get("metadata", {}).get("metrics", {}),
                    })
        except Exception as e:
            logger.warning(f"Failed to read manifests: {e}")

    app_state.auto_comparison_results = comparison_results
    app_state.auto_comparison_zip_path = str(zip_dir)

    top_risk_entities = {"summary": {"group_by": "email"}, "entities": []}
    seen_entities = set()
    for result in comparison_results:
        entity_value = result.get("entity_value")
        if entity_value and entity_value not in seen_entities:
            seen_entities.add(entity_value)
            top_risk_entities["entities"].append({
                "entity": entity_value,
                "risk_score": 0.0,
            })

    app_state.top_risk_entities = top_risk_entities
    app_state.blindspot_data = None  # Will be set after analysis

    return app_state


async def regenerate_daily(target_date: str) -> Optional[Path]:
    """Regenerate daily report for a specific date with blindspot heatmap."""
    logger.info(f"{'='*60}")
    logger.info(f"REGENERATING DAILY REPORT: {target_date}")
    logger.info(f"{'='*60}")

    # Find the zip package for this date
    zip_dir = find_zip_package_for_date(target_date)
    if not zip_dir:
        logger.error(f"No zip package found for date: {target_date}")
        return None

    logger.info(f"Found zip package: {zip_dir}")

    # Create mock app state
    app_state = create_mock_app_state(zip_dir)

    # Run blindspot analysis
    logger.info("\nRunning blindspot analysis for heatmap...")
    blindspot_data = None
    try:
        analyzer = ModelBlindspotAnalyzer()
        blindspot_data = await analyzer.analyze_blindspots(export_csv=False)
        if blindspot_data.get("status") == "success":
            logger.info(
                f"Blindspot analysis complete: "
                f"{len(blindspot_data.get('matrix', {}).get('cells', []))} cells, "
                f"{len(blindspot_data.get('blindspots', []))} blindspots identified"
            )
            app_state.blindspot_data = blindspot_data
        else:
            logger.warning(f"Blindspot analysis failed: {blindspot_data.get('error')}")
    except Exception as e:
        logger.warning(f"Could not run blindspot analysis: {e}")

    # Determine output path
    output_path = ARTIFACTS_DIR / f"startup_analysis_DAILY_{target_date}.html"

    # Generate report
    try:
        report_path = generate_startup_report(
            app_state=app_state,
            output_path=output_path,
            startup_duration_seconds=120.0,
            reports_dir=zip_dir,
        )
        logger.info(f"✅ Daily report regenerated: {report_path}")
        return report_path
    except Exception as e:
        logger.error(f"❌ Failed to regenerate report: {e}", exc_info=True)
        return None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Regenerate daily report with blindspot heatmap")
    parser.add_argument("--date", type=str, required=True, help="Date in YYYY-MM-DD format")
    args = parser.parse_args()

    result = asyncio.run(regenerate_daily(args.date))
    if result:
        print(f"\nSuccess: {result}")
    else:
        print("\nFailed to regenerate report")
        sys.exit(1)
