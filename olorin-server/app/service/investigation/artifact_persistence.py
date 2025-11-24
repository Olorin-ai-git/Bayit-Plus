"""
Artifact Persistence Service

Handles persistence of comparison results to JSON artifacts using FileOrganizationService.

Constitutional Compliance:
- Uses FileOrganizationService for all path resolution
- Creates canonical files and entity view symlinks
- No hardcoded paths
"""

import json
from datetime import datetime
from typing import Optional
from pathlib import Path

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.file_organization_service import FileOrganizationService
from app.service.logging import get_bridge_logger
from app.router.models.investigation_comparison_models import ComparisonResponse

logger = get_bridge_logger(__name__)

# Global service instance (initialized on first use)
_file_org_service: Optional[FileOrganizationService] = None


def _get_file_org_service() -> FileOrganizationService:
    """Get or create FileOrganizationService instance."""
    global _file_org_service
    if _file_org_service is None:
        config = FileOrganizationConfig()
        _file_org_service = FileOrganizationService(config)
    return _file_org_service


def persist_artifact(
    response: ComparisonResponse,
    entity_type: Optional[str],
    entity_value: Optional[str],
    window_a_start: datetime,
    window_b_end: datetime,
    investigation_id: Optional[str] = None,
    created_at: Optional[datetime] = None
) -> str:
    """
    Persist comparison response to artifacts directory in organized structure.
    
    Uses FileOrganizationService to resolve paths and create:
    - Canonical file: investigations/<YYYY>/<MM>/<inv_id>/artifacts/investigation_*.json
    - Entity view symlink: artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__artifact.json
    
    Args:
        response: Comparison response to persist
        entity_type: Entity type (e.g., "email", "device_id")
        entity_value: Entity identifier
        window_a_start: Investigation window start date
        window_b_end: Investigation window end date
        investigation_id: Optional investigation ID for canonical path
        created_at: Optional creation timestamp for canonical path
        
    Returns:
        Path to persisted artifact file (canonical path)
    """
    service = _get_file_org_service()
    
    # Use defaults if entity info missing
    entity_type_str = entity_type or "global"
    entity_value_str = entity_value or "global"
    
    # Resolve paths using FileOrganizationService
    canonical_path, entity_view_path = service.resolve_investigation_artifact_path(
        entity_type=entity_type_str,
        entity_id=entity_value_str,
        date_start=window_a_start,
        date_end=window_b_end,
        file_type="json",
        investigation_id=investigation_id,
        created_at=created_at or window_b_end
    )
    
    # Use canonical path if available, otherwise fall back to entity view path
    if canonical_path:
        filepath = canonical_path
        logger.debug(
            f"Using canonical path for artifact: {filepath} "
            f"(investigation_id={investigation_id})"
        )
    elif entity_view_path:
        filepath = entity_view_path
        logger.debug(f"Using entity view path for artifact: {filepath}")
    else:
        # Fallback: create a simple path structure
        # This should rarely happen, but provides a safety net
        base_dir = service.config.artifacts_base_dir
        normalized_entity_id = service.normalize_entity_id(entity_value_str)
        normalized_entity_type = service.entity_normalizer.normalize_for_filename(
            entity_type_str
        )
        date_start_str = window_a_start.strftime("%Y%m%d")
        date_end_str = window_b_end.strftime("%Y%m%d")
        
        fallback_dir = base_dir / "investigations" / normalized_entity_type / normalized_entity_id
        filepath = fallback_dir / (
            f"investigation_{normalized_entity_type}_{normalized_entity_id}"
            f"_{date_start_str}_{date_end_str}.json"
        )
        logger.warning(f"Using fallback path for artifact: {filepath}")
    
    # Create directory structure with validation
    service.create_directory_structure(filepath.parent)
    
    # Acquire file lock before writing
    file_handle = None
    try:
        file_handle = service.lock_file_for_write(filepath, create_if_missing=True)
        
        # Write artifact
        with open(filepath, "w") as f:
            json.dump(response.model_dump(), f, indent=2, default=str)
        
        logger.info(
            f"Comparison artifact persisted: {filepath} "
            f"(canonical={'yes' if canonical_path else 'no'}, "
            f"entity_view={'yes' if entity_view_path else 'no'})"
        )
        
        # Create entity view symlink if both paths available
        entity_view_created = False
        if canonical_path and entity_view_path and canonical_path != entity_view_path:
            view_type, error_msg = service.create_entity_view_symlink(
                canonical_path=canonical_path,
                entity_view_path=entity_view_path,
                force=False
            )
            if error_msg:
                logger.warning(
                    f"Failed to create entity view {view_type} for {entity_view_path}: {error_msg}"
                )
            else:
                entity_view_created = True
                logger.debug(
                    f"Created entity view {view_type}: {entity_view_path} -> {canonical_path}"
                )
        
        # Index file in workspace registry
        try:
            from app.service.investigation.workspace_registry import get_registry
            
            registry = get_registry()
            
            # Index the file with both canonical and entity view paths
            # CRITICAL: Only index if we have an investigation_id - don't use "unknown"
            if investigation_id:
                registry.index_file(
                    investigation_id=investigation_id,
                    canonical_path=str(filepath),
                    file_kind="artifact",
                    file_ext="json",
                    entity_view_path=str(entity_view_path) if entity_view_path and entity_view_created else None,
                    relative_path=str(filepath.relative_to(filepath.parent.parent.parent)) if filepath.is_relative_to(Path("workspace")) else None
                )
                logger.debug(f"Indexed artifact file in registry: {filepath}")
            else:
                logger.debug(
                    f"Skipping registry indexing for artifact {filepath} - no investigation_id provided. "
                    f"This is expected for comparisons without investigations."
                )
        except Exception as e:
            # Don't fail artifact persistence if registry indexing fails
            logger.warning(f"Failed to index artifact in registry: {e}")
        
    finally:
        if file_handle is not None:
            service.unlock_file(file_handle)
    
    return str(filepath)

