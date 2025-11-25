#!/usr/bin/env python3
"""
Delete existing "unknown" artifacts and regenerate them with proper investigation IDs.

This script:
1. Finds all artifacts with "unknown" investigation IDs
2. Identifies which comparisons created them (from comparison reports)
3. Deletes the unknown artifacts
4. Regenerates the comparisons with proper investigation IDs
"""
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.file_organization_config import FileOrganizationConfig
from app.router.models.investigation_comparison_models import (
    ComparisonRequest,
    WindowPreset,
)
from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
from app.service.investigation.comparison_service import compare_windows
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def find_unknown_artifacts():
    """Find all artifacts with 'unknown' investigation IDs."""
    config = FileOrganizationConfig()
    artifacts_base = config.artifacts_base_dir / "investigations"

    unknown_artifacts = []
    if artifacts_base.exists():
        for unknown_file in artifacts_base.rglob("*unknown*"):
            if unknown_file.is_file():
                unknown_artifacts.append(unknown_file)

    return unknown_artifacts


def extract_entity_info_from_path(filepath: Path):
    """Extract entity type and ID from artifact file path."""
    # Path format: artifacts/investigations/{entity_type}/{entity_id}/{YYYY}/{MM}/inv_unknown__artifact.{ext}
    parts = filepath.parts

    try:
        # Find artifacts/investigations index
        inv_idx = None
        for i, part in enumerate(parts):
            if part == "investigations":
                inv_idx = i
                break

        if inv_idx is None or inv_idx + 1 >= len(parts):
            return None, None

        entity_type = parts[inv_idx + 1]  # email, device_id, etc.
        entity_id = parts[inv_idx + 2]  # normalized entity ID

        # Denormalize entity ID (replace -at- with @, etc.)
        entity_id = entity_id.replace("-at-", "@")

        return entity_type, entity_id
    except Exception as e:
        logger.warning(f"Failed to extract entity info from {filepath}: {e}")
        return None, None


def find_comparison_reports_for_entity(entity_type: str, entity_id: str):
    """Find comparison reports for a given entity."""
    config = FileOrganizationConfig()
    comparisons_base = config.artifacts_base_dir / "comparisons"

    comparison_reports = []

    # Search in auto_startup and manual directories
    for source_type in ["auto_startup", "manual"]:
        source_dir = comparisons_base / source_type
        if not source_dir.exists():
            continue

        # Search all timestamp directories
        for timestamp_dir in source_dir.iterdir():
            if not timestamp_dir.is_dir():
                continue

            # Look for comparison reports matching this entity
            # Format: comparison_{entity_type}_{normalized_entity_id}_{timestamp}.html
            normalized_entity_id = entity_id.replace("@", "-at-").replace(".", "-")
            pattern = f"comparison_{entity_type}_{normalized_entity_id}_*.html"

            for report_file in timestamp_dir.glob(pattern):
                comparison_reports.append(
                    {
                        "path": report_file,
                        "source_type": source_type,
                        "timestamp_dir": timestamp_dir,
                    }
                )

    return comparison_reports


async def regenerate_comparison_for_entity(entity_type: str, entity_id: str):
    """Regenerate comparison for an entity using auto_comparison."""
    logger.info(f"🔄 Regenerating comparison for {entity_type}:{entity_id}")

    try:
        # Use run_auto_comparison_for_entity which will create proper investigation IDs
        result = await run_auto_comparison_for_entity(
            entity_value=entity_id,
            entity_type=entity_type,
            reports_dir=None,  # Use default location
        )

        if result.get("status") == "success":
            logger.info(
                f"✅ Successfully regenerated comparison for {entity_type}:{entity_id}"
            )
            logger.info(f"   Investigation ID: {result.get('investigation_id', 'N/A')}")
            logger.info(f"   Report: {result.get('report_path', 'N/A')}")
            return True
        else:
            logger.error(
                f"❌ Failed to regenerate comparison: {result.get('error', 'Unknown error')}"
            )
            return False

    except Exception as e:
        logger.error(
            f"❌ Error regenerating comparison for {entity_type}:{entity_id}: {e}",
            exc_info=True,
        )
        return False


async def main():
    """Main function."""
    print("=" * 70)
    print("Delete and Regenerate Unknown Artifacts")
    print("=" * 70)

    # Step 1: Find all unknown artifacts
    print("\n📋 Step 1: Finding unknown artifacts...")
    unknown_artifacts = find_unknown_artifacts()

    if not unknown_artifacts:
        print("✅ No unknown artifacts found!")
        return

    print(f"   Found {len(unknown_artifacts)} unknown artifact(s)")

    # Group by entity (to avoid duplicate regenerations)
    entity_map = {}
    for artifact in unknown_artifacts:
        entity_type, entity_id = extract_entity_info_from_path(artifact)
        if entity_type and entity_id:
            key = f"{entity_type}:{entity_id}"
            if key not in entity_map:
                entity_map[key] = {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "artifacts": [],
                }
            entity_map[key]["artifacts"].append(artifact)

    print(f"   Grouped into {len(entity_map)} unique entity/entity_type combination(s)")

    # Step 2: Delete unknown artifacts
    print("\n🗑️  Step 2: Deleting unknown artifacts...")
    deleted_count = 0
    for key, entity_data in entity_map.items():
        for artifact in entity_data["artifacts"]:
            try:
                artifact.unlink()
                deleted_count += 1
                print(f"   ✅ Deleted: {artifact.name}")
            except Exception as e:
                logger.error(f"Failed to delete {artifact}: {e}")

    print(f"   ✅ Deleted {deleted_count} artifact(s)")

    # Step 3: Regenerate comparisons for each entity
    print("\n🔄 Step 3: Regenerating comparisons with proper investigation IDs...")
    regenerated_count = 0
    failed_count = 0

    for key, entity_data in entity_map.items():
        entity_type = entity_data["entity_type"]
        entity_id = entity_data["entity_id"]

        print(f"\n   Processing {entity_type}:{entity_id}...")
        success = await regenerate_comparison_for_entity(entity_type, entity_id)

        if success:
            regenerated_count += 1
        else:
            failed_count += 1

    print("\n" + "=" * 70)
    print("✅ Complete!")
    print("=" * 70)
    print(f"   Deleted: {deleted_count} unknown artifact(s)")
    print(f"   Regenerated: {regenerated_count} comparison(s)")
    if failed_count > 0:
        print(f"   Failed: {failed_count} comparison(s)")

    if regenerated_count > 0:
        print(f"\n✅ New artifacts created with proper investigation IDs!")
        print(f"   Check: artifacts/investigations/{entity_type}/...")
    else:
        print(
            f"\n⚠️  No comparisons were regenerated. You may need to manually trigger comparisons."
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
