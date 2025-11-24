#!/usr/bin/env python3
"""
Regenerate startup analysis report with full enrichment from zip package data.

This script finds the latest zip package, extracts data from it, and regenerates
the startup report with all aggregated metrics and investigation summaries.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.reporting.startup_report_generator import generate_startup_report
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def find_latest_zip_package() -> Optional[Path]:
    """Find the latest zip package directory (extracted) or zip file."""
    base_dir = Path("artifacts/comparisons/auto_startup")
    if not base_dir.exists():
        return None
    
    # Look for zip package directories (extracted)
    zip_dirs = []
    for item in base_dir.iterdir():
        if item.is_dir() and "comparison_package" in item.name:
            zip_dirs.append(item)
    
    # Also look for timestamp directories that might contain comparison data
    timestamp_dirs = []
    for item in base_dir.iterdir():
        if item.is_dir() and len(item.name) == 15 and item.name.replace("_", "").isdigit():
            # Check if it has comparison reports or investigation artifacts
            if (item / "comparison_reports").exists() or (item / "investigations").exists():
                timestamp_dirs.append(item)
    
    # Combine and sort by modification time
    all_dirs = zip_dirs + timestamp_dirs
    if all_dirs:
        all_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return all_dirs[0]
    
    # Fallback: look for zip files
    zip_files = list(base_dir.glob("comparison_package_*.zip"))
    if zip_files:
        zip_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        # Extract the latest zip to a temp directory
        import tempfile
        import zipfile
        temp_dir = Path(tempfile.mkdtemp(prefix="olorin_zip_"))
        with zipfile.ZipFile(zip_files[0], 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        logger.info(f"Extracted zip to temporary directory: {temp_dir}")
        return temp_dir
    
    return None


def create_mock_app_state(zip_dir: Path) -> Dict[str, Any]:
    """Create a mock app.state with data extracted from zip package."""
    app_state = type('MockAppState', (), {})()
    
    # Set basic attributes
    app_state.database_available = True
    app_state.database_provider = type('MockProvider', (), {'__name__': 'SnowflakeProvider'})()
    app_state.risk_entities_loaded = True
    app_state.risk_entities_loaded_at = datetime.now().isoformat()
    app_state.auto_comparison_completed = True
    app_state.rag_system_available = False  # RAG is disabled
    app_state.anomaly_detection_available = True
    app_state.detection_scheduler = type('MockScheduler', (), {})()
    app_state.logstream_config_valid = False
    
    # Extract comparison results from manifests
    comparison_results = []
    manifests_file = zip_dir / "comparison_manifests.json"
    if manifests_file.exists():
        try:
            with open(manifests_file, 'r') as f:
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
    
    # Extract risk entities from comparison results (deduplicate)
    top_risk_entities = {
        "summary": {"group_by": "email"},
        "entities": []
    }
    
    seen_entities = set()
    # Get entities from comparison results first
    for result in comparison_results:
        entity_value = result.get("entity_value")
        if entity_value and entity_value not in seen_entities:
            seen_entities.add(entity_value)
            top_risk_entities["entities"].append({
                "entity": entity_value,
                "risk_score": 0.0,  # Will be enriched from DB
            })
    
    # Also check investigation artifacts if available
    investigations_dir = zip_dir / "investigations"
    if investigations_dir.exists():
        for inv_folder in investigations_dir.iterdir():
            if inv_folder.is_dir():
                for artifact_file in inv_folder.rglob("*.json"):
                    if "artifact" in artifact_file.name.lower():
                        try:
                            with open(artifact_file, 'r') as f:
                                artifact_data = json.load(f)
                                entity = artifact_data.get("entity", {})
                                entity_value = entity.get("value")
                                if entity_value and entity_value not in seen_entities:
                                    seen_entities.add(entity_value)
                                    top_risk_entities["entities"].append({
                                        "entity": entity_value,
                                        "risk_score": 0.0,  # Will be enriched from DB
                                    })
                        except Exception as e:
                            logger.debug(f"Failed to read artifact {artifact_file}: {e}")
    
    app_state.top_risk_entities = top_risk_entities
    
    return app_state


def main():
    """Main function to regenerate startup report."""
    logger.info("🔄 Regenerating startup analysis report with full enrichment...")
    
    # Find latest zip package
    zip_dir = find_latest_zip_package()
    if not zip_dir:
        logger.error("❌ No zip package directory found")
        return
    
    logger.info(f"✅ Found zip package: {zip_dir}")
    
    # Create mock app state
    app_state = create_mock_app_state(zip_dir)
    
    # Generate report with zip_dir as reports_dir
    try:
        report_path = generate_startup_report(
            app_state=app_state,
            startup_duration_seconds=120.0,  # Mock duration
            reports_dir=zip_dir  # Pass zip_dir so enrichment can find data
        )
        logger.info(f"✅ Startup report regenerated: {report_path}")
        
        # Also copy to zip package directory
        zip_report_path = zip_dir / "startup_analysis_report.html"
        if report_path != zip_report_path:
            import shutil
            shutil.copy2(report_path, zip_report_path)
            logger.info(f"✅ Copied report to zip package: {zip_report_path}")
    except Exception as e:
        logger.error(f"❌ Failed to regenerate report: {e}", exc_info=True)
        return


if __name__ == "__main__":
    main()

