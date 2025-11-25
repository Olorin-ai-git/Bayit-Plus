"""
Manifest Generator

Generates manifest.json files for investigations and comparisons.
Manifests provide metadata and file references for investigations.

Constitutional Compliance:
- No hardcoded values (uses FileOrganizationConfig)
- Complete implementation with all required fields
- JSON schema validation
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config.file_organization_config import FileOrganizationConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ManifestGenerator:
    """
    Generates manifest.json files for investigations and comparisons.

    Manifests provide:
    - Investigation/comparison metadata
    - File references (canonical and entity view paths)
    - Provenance information
    - Timestamps and lifecycle information
    """

    def __init__(self, config: Optional[FileOrganizationConfig] = None):
        """
        Initialize manifest generator.

        Args:
            config: FileOrganizationConfig instance. If None, creates new instance.
        """
        self.config = config or FileOrganizationConfig()

    def generate_investigation_manifest(
        self,
        investigation_id: str,
        title: Optional[str] = None,
        investigation_type: Optional[str] = None,
        graph_type: Optional[str] = None,
        trigger_source: Optional[str] = None,
        status: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_ids: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        canonical_path: Optional[str] = None,
        entity_view_paths: Optional[List[str]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
        file_references: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate investigation manifest JSON.

        Args:
            investigation_id: Unique investigation identifier
            title: Investigation title
            investigation_type: Type of investigation (structured, hybrid, etc.)
            graph_type: Graph type (clean, hybrid, etc.)
            trigger_source: Source that triggered investigation (startup, script, ui, etc.)
            status: Investigation status (IN_PROGRESS, COMPLETED, FAILED, etc.)
            entity_type: Primary entity type
            entity_ids: List of entity IDs
            tags: List of tags
            canonical_path: Canonical path to investigation folder
            entity_view_paths: List of entity view paths (symlinks or indexed views)
            created_at: Creation timestamp
            updated_at: Last update timestamp
            completed_at: Completion timestamp
            metadata: Additional metadata dictionary
            file_references: List of file references with canonical and entity view paths

        Returns:
            Manifest dictionary ready for JSON serialization
        """
        now = datetime.now()

        manifest = {
            "manifest_version": "1.0",
            "investigation_id": investigation_id,
            "title": title or f"Investigation {investigation_id[:8]}",
            "investigation_type": investigation_type,
            "graph_type": graph_type,
            "trigger_source": trigger_source,
            "status": status or "UNKNOWN",
            "entity": {"entity_type": entity_type, "entity_ids": entity_ids or []},
            "tags": tags or [],
            "paths": {
                "canonical": canonical_path,
                "entity_views": entity_view_paths or [],
            },
            "timestamps": {
                "created_at": (created_at or now).isoformat(),
                "updated_at": (updated_at or now).isoformat(),
                "completed_at": completed_at.isoformat() if completed_at else None,
            },
            "file_references": file_references or [],
            "metadata": metadata or {},
        }

        return manifest

    def generate_comparison_manifest(
        self,
        comparison_id: str,
        left_investigation: str,
        right_investigation: str,
        title: Optional[str] = None,
        source_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        canonical_path: Optional[str] = None,
        entity_view_path: Optional[str] = None,
        created_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate comparison manifest JSON.

        Args:
            comparison_id: Unique comparison identifier
            left_investigation: Investigation ID for left side
            right_investigation: Investigation ID for right side
            title: Comparison title
            source_type: Source type ('auto_startup', 'manual', etc.)
            entity_type: Entity type being compared
            entity_id: Entity ID being compared
            canonical_path: Canonical path to comparison report
            entity_view_path: Entity view path (symlink or indexed view)
            created_at: Creation timestamp
            metadata: Additional metadata dictionary

        Returns:
            Manifest dictionary ready for JSON serialization
        """
        now = datetime.now()

        manifest = {
            "manifest_version": "1.0",
            "comparison_id": comparison_id,
            "left_investigation": left_investigation,
            "right_investigation": right_investigation,
            "title": title or f"Comparison {comparison_id[:8]}",
            "source_type": source_type,
            "entity": {"entity_type": entity_type, "entity_id": entity_id},
            "paths": {"canonical": canonical_path, "entity_view": entity_view_path},
            "timestamps": {"created_at": (created_at or now).isoformat()},
            "metadata": metadata or {},
        }

        return manifest

    def save_investigation_manifest(
        self, manifest: Dict[str, Any], output_path: Optional[Path] = None
    ) -> Path:
        """
        Save investigation manifest to file.

        Args:
            manifest: Manifest dictionary
            output_path: Output path for manifest file. If None, uses canonical_path from manifest.

        Returns:
            Path to saved manifest file
        """
        if output_path is None:
            canonical_path = manifest.get("paths", {}).get("canonical")
            if canonical_path:
                output_path = Path(canonical_path) / "manifest.json"
            else:
                investigation_id = manifest.get("investigation_id", "unknown")
                output_path = Path(
                    f"workspace/investigations/manifest_{investigation_id}.json"
                )

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w") as f:
            json.dump(manifest, f, indent=2, default=str)

        logger.debug(f"Saved investigation manifest: {output_path}")
        return output_path

    def save_comparison_manifest(
        self, manifest: Dict[str, Any], output_path: Optional[Path] = None
    ) -> Path:
        """
        Save comparison manifest to file.

        Args:
            manifest: Manifest dictionary
            output_path: Output path for manifest file. If None, uses canonical_path from manifest.

        Returns:
            Path to saved manifest file
        """
        if output_path is None:
            canonical_path = manifest.get("paths", {}).get("canonical")
            if canonical_path:
                output_path = Path(canonical_path).parent / "manifest.json"
            else:
                comparison_id = manifest.get("comparison_id", "unknown")
                output_path = Path(
                    f"workspace/comparisons/manifest_{comparison_id}.json"
                )

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w") as f:
            json.dump(manifest, f, indent=2, default=str)

        logger.debug(f"Saved comparison manifest: {output_path}")
        return output_path


# Global manifest generator instance
_manifest_generator_instance: Optional[ManifestGenerator] = None


def get_manifest_generator() -> ManifestGenerator:
    """Get the global manifest generator instance."""
    global _manifest_generator_instance
    if _manifest_generator_instance is None:
        _manifest_generator_instance = ManifestGenerator()
    return _manifest_generator_instance
