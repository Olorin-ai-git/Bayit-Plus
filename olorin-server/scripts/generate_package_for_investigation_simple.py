#!/usr/bin/env python3
"""
Simple script to generate package for a completed investigation.

This script queries the database directly and generates the comparison package
without importing the full application stack.

Usage:
    python scripts/generate_package_for_investigation_simple.py <investigation_id>
"""

import asyncio
import json
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.file_organization_config import FileOrganizationConfig

# Minimal imports
from app.persistence.database import get_db
from app.service.investigation.file_organization_service import FileOrganizationService
from app.service.investigation_state_service import InvestigationStateService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def generate_package_simple(investigation_id: str):
    """Generate package using minimal imports."""

    logger.info(f"📦 Generating package for investigation: {investigation_id}")

    # Get investigation state
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = InvestigationStateService(db)
        # Use the same user_id as auto-comparison system
        state = service.get_state_with_auth(
            investigation_id=investigation_id, user_id="auto-comparison-system"
        )

        if state.status != "COMPLETED":
            logger.warning(
                f"⚠️ Investigation {investigation_id} is not completed (status: {state.status})"
            )
            return None

        # Extract entity information
        settings_dict = {}
        if state.settings_json:
            try:
                settings_dict = json.loads(state.settings_json)
            except json.JSONDecodeError:
                pass

        entities = settings_dict.get("entities", [])
        entity_type = None
        entity_value = None
        if entities and len(entities) > 0:
            entity_type = (
                entities[0].get("entity_type")
                if isinstance(entities[0], dict)
                else getattr(entities[0], "entity_type", None)
            )
            entity_value = (
                entities[0].get("entity_value")
                if isinstance(entities[0], dict)
                else getattr(entities[0], "entity_value", None)
            )

        logger.info(f"   Entity: {entity_type}={entity_value}")

        # Extract risk score
        risk_score = None
        if state.progress_json:
            try:
                progress_dict = json.loads(state.progress_json)
                risk_score = progress_dict.get(
                    "overall_risk_score"
                ) or progress_dict.get("risk_score")
            except json.JSONDecodeError:
                pass

        logger.info(f"   Risk Score: {risk_score}")

        # Create reports directory
        file_org_config = FileOrganizationConfig()
        file_org_service = FileOrganizationService(file_org_config)
        reports_dir = Path("artifacts/comparisons/auto_startup")
        reports_dir.mkdir(parents=True, exist_ok=True)

        # Create timestamped zip filename
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"comparison_package_{timestamp_str}.zip"
        zip_path = reports_dir / zip_filename

        logger.info(f"📦 Creating zip package: {zip_path}")

        # Find investigation folder
        from app.service.logging.investigation_folder_manager import get_folder_manager

        folder_manager = get_folder_manager()
        investigation_folder = folder_manager.get_investigation_folder(investigation_id)

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            # Add investigation folder contents if it exists
            if investigation_folder and investigation_folder.exists():
                logger.info(f"   Adding investigation folder: {investigation_folder}")
                for file_path in investigation_folder.rglob("*"):
                    if file_path.is_file():
                        arcname = f"investigations/{investigation_id}/{file_path.relative_to(investigation_folder)}"
                        zipf.write(file_path, arcname)
                        logger.debug(f"      Added: {arcname}")

            # Add analysis summary document
            summary_path = Path("INVESTIGATION_ANALYSIS_SUMMARY.md")
            if summary_path.exists():
                zipf.write(summary_path, "INVESTIGATION_ANALYSIS_SUMMARY.md")
                logger.info(f"   Added analysis summary")

            # Create a simple manifest
            manifest = {
                "investigation_id": investigation_id,
                "entity_type": entity_type,
                "entity_value": entity_value,
                "risk_score": risk_score,
                "status": state.status,
                "completed_at": (
                    state.updated_at.isoformat() if state.updated_at else None
                ),
                "package_created_at": datetime.now().isoformat(),
            }

            import io

            manifest_json = json.dumps(manifest, indent=2)
            zipf.writestr("manifest.json", manifest_json)
            logger.info(f"   Added manifest.json")

        logger.info(f"✅ Package created: {zip_path}")
        if zip_path.exists():
            size_mb = zip_path.stat().st_size / 1024 / 1024
            logger.info(f"   Size: {size_mb:.2f} MB")

        return zip_path

    finally:
        db.close()


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/generate_package_for_investigation_simple.py <investigation_id>"
        )
        print("\nExample:")
        print(
            "  python scripts/generate_package_for_investigation_simple.py auto-comp-ee88621fd85b"
        )
        sys.exit(1)

    investigation_id = sys.argv[1]

    try:
        zip_path = await generate_package_simple(investigation_id)
        if zip_path:
            print(f"\n✅ Success! Package generated: {zip_path}")
            print(f"   Location: {zip_path.absolute()}")
            sys.exit(0)
        else:
            print("\n⚠️ Package generation skipped")
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Failed to generate package: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
