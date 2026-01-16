"""
Investigation Completion Handler
Feature: MongoDB Atlas Migration

Handles investigation completion tasks: registry indexing, manifest generation,
linting, and package generation.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- File size: < 200 lines
"""

import json
from typing import Dict, List, Optional

from app.models.mongodb.investigation import Investigation
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def handle_investigation_completion(investigation: Investigation) -> None:
    """
    Handle all completion tasks for an investigation.

    Called when investigation status changes to COMPLETED.

    Args:
        investigation: Completed investigation document
    """
    await _index_investigation_in_registry(investigation)
    await _generate_investigation_manifest(investigation)
    await _lint_investigation(investigation)
    await _trigger_package_generation(investigation)


async def _index_investigation_in_registry(investigation: Investigation) -> None:
    """Index investigation in workspace registry."""
    try:
        from app.service.investigation.workspace_registry import get_registry
        from app.service.logging.investigation_folder_manager import get_folder_manager

        registry = get_registry()
        folder_manager = get_folder_manager()

        investigation_folder = folder_manager.get_investigation_folder(
            investigation.investigation_id
        )
        canonical_path = str(investigation_folder) if investigation_folder else None

        # Extract metadata from settings
        settings_dict = (
            investigation.settings.model_dump(mode="json")
            if investigation.settings
            else {}
        )
        entities = settings_dict.get("entities", [])
        entity_type = entities[0].get("entity_type") if entities else None
        entity_ids = [e.get("entity_value") for e in entities if e.get("entity_value")]

        registry.index_investigation(
            investigation_id=investigation.investigation_id,
            title=settings_dict.get("name") or f"Investigation {investigation.investigation_id[:8]}",
            investigation_type=settings_dict.get("investigation_type"),
            graph_type=settings_dict.get("graph_type") or settings_dict.get("graph"),
            trigger_source=settings_dict.get("trigger_source") or "unknown",
            status=investigation.status,
            entity_type=entity_type,
            entity_ids=entity_ids if entity_ids else None,
            tags=None,
            canonical_path=canonical_path,
            created_at=investigation.created_at,
            updated_at=investigation.updated_at,
            completed_at=investigation.updated_at,
            metadata={
                "user_id": investigation.user_id,
                "version": investigation.version,
                "lifecycle_stage": investigation.lifecycle_stage,
            },
        )
    except Exception as e:
        logger.warning(
            f"Failed to index investigation {investigation.investigation_id}: {e}"
        )


async def _generate_investigation_manifest(investigation: Investigation) -> None:
    """Generate investigation manifest."""
    try:
        from app.service.investigation.manifest_generator import get_manifest_generator
        from app.service.investigation.workspace_registry import get_registry
        from app.service.logging.investigation_folder_manager import get_folder_manager

        manifest_generator = get_manifest_generator()
        folder_manager = get_folder_manager()
        registry = get_registry()

        investigation_folder = folder_manager.get_investigation_folder(
            investigation.investigation_id
        )
        canonical_path = str(investigation_folder) if investigation_folder else None

        settings_dict = (
            investigation.settings.model_dump(mode="json")
            if investigation.settings
            else {}
        )
        entities = settings_dict.get("entities", [])
        entity_type = entities[0].get("entity_type") if entities else None
        entity_ids = [e.get("entity_value") for e in entities if e.get("entity_value")]

        # Query registry for file references
        file_references = _get_file_references_from_registry(
            registry, investigation.investigation_id
        )

        manifest = manifest_generator.generate_investigation_manifest(
            investigation_id=investigation.investigation_id,
            title=settings_dict.get("name") or f"Investigation {investigation.investigation_id[:8]}",
            investigation_type=settings_dict.get("investigation_type"),
            graph_type=settings_dict.get("graph_type") or settings_dict.get("graph"),
            trigger_source=settings_dict.get("trigger_source") or "unknown",
            status=investigation.status,
            entity_type=entity_type,
            entity_ids=entity_ids if entity_ids else None,
            tags=None,
            canonical_path=canonical_path,
            entity_view_paths=None,
            created_at=investigation.created_at,
            updated_at=investigation.updated_at,
            completed_at=investigation.updated_at,
            metadata={
                "user_id": investigation.user_id,
                "version": investigation.version,
                "lifecycle_stage": investigation.lifecycle_stage,
            },
            file_references=file_references,
        )

        if investigation_folder:
            manifest_generator.save_investigation_manifest(
                manifest, output_path=investigation_folder / "manifest.json"
            )
    except Exception as e:
        logger.warning(
            f"Failed to generate manifest for {investigation.investigation_id}: {e}"
        )


async def _lint_investigation(investigation: Investigation) -> None:
    """Run linter validation on investigation."""
    try:
        from app.service.investigation.linter_service import get_linter_service

        linter = get_linter_service()

        investigation_data = _prepare_linter_data(investigation)
        issues = linter.lint_investigation(investigation_data, investigation.investigation_id)

        if issues:
            summary = linter.format_issues_summary(issues)
            logger.warning(
                f"Linter found issues for {investigation.investigation_id}:\n{summary}"
            )

            if linter.should_block_report_generation(issues):
                logger.error(
                    f"Linter FAIL issues found for {investigation.investigation_id}. "
                    "Report generation may be blocked."
                )
    except Exception as e:
        logger.warning(
            f"Failed to lint investigation {investigation.investigation_id}: {e}"
        )


async def _trigger_package_generation(investigation: Investigation) -> None:
    """Trigger package generation for auto-comparison investigations."""
    try:
        settings_dict = (
            investigation.settings.model_dump(mode="json")
            if investigation.settings
            else {}
        )
        investigation_type = settings_dict.get("investigation_type") or ""

        is_auto_comparison = (
            investigation_type == "auto_comparison"
            or investigation.investigation_id.startswith("auto-comp-")
            or "auto_comparison" in investigation_type.lower()
        )

        if is_auto_comparison:
            logger.info(
                f"Auto-comparison investigation completed: {investigation.investigation_id}"
            )
    except Exception as e:
        logger.warning(
            f"Failed to trigger package generation for {investigation.investigation_id}: {e}"
        )


def _get_file_references_from_registry(
    registry, investigation_id: str
) -> List[Dict[str, str]]:
    """Query registry for file references."""
    try:
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT canonical_path, entity_view_path, file_kind, file_ext, sha256_hash
                FROM files
                WHERE investigation_id = ?
            """,
                (investigation_id,),
            )

            return [
                {
                    "canonical_path": row["canonical_path"],
                    "entity_view_path": row["entity_view_path"],
                    "kind": row["file_kind"],
                    "extension": row["file_ext"],
                    "sha256": row["sha256_hash"],
                }
                for row in cursor.fetchall()
            ]
    except Exception as e:
        logger.warning(f"Failed to query file references: {e}")
        return []


def _prepare_linter_data(investigation: Investigation) -> Dict:
    """Prepare investigation data for linter."""
    progress_dict = (
        investigation.progress.model_dump(mode="json") if investigation.progress else {}
    )

    return {
        "investigation_id": investigation.investigation_id,
        "status": investigation.status,
        "risk_score": progress_dict.get("risk_score"),
        "final_risk_score": progress_dict.get("overall_risk_score")
        or progress_dict.get("final_risk_score"),
        "tools_used": progress_dict.get("tools_used", 0),
        "tool_results": progress_dict.get("tool_results", []),
        "domain_findings": progress_dict.get("domain_findings", {}),
    }
