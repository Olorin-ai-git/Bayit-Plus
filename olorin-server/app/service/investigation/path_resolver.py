"""
Path Resolver

Utility for resolving filesystem paths for investigations, comparisons, and reports.
Supports hybrid structure: canonical (date-based) and entity views (date-grouped).

Constitutional Compliance:
- NO hardcoded paths (all from config)
- Complete implementation with no stubs/mocks
- Supports both canonical and entity view paths
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.entity_normalizer import EntityNormalizer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PathResolver:
    """Path resolution utilities supporting hybrid structure."""

    def __init__(
        self,
        config: FileOrganizationConfig,
        entity_normalizer: Optional[EntityNormalizer] = None
    ):
        """
        Initialize path resolver.

        Args:
            config: File organization configuration
            entity_normalizer: Optional entity normalizer (creates default if None)
        """
        self.config = config
        self.entity_normalizer = (
            entity_normalizer
            or EntityNormalizer(max_length=config.entity_id_max_length)
        )

    def resolve_canonical_investigation_path(
        self,
        investigation_id: str,
        created_at: datetime
    ) -> Path:
        """
        Resolve canonical investigation path: investigations/<YYYY>/<MM>/<inv_id>/

        Args:
            investigation_id: Investigation identifier
            created_at: Investigation creation timestamp

        Returns:
            Path to canonical investigation directory
        """
        year = created_at.strftime("%Y")
        month = created_at.strftime("%m")

        # Normalize investigation_id for path safety
        safe_inv_id = self.entity_normalizer.normalize_for_filename(investigation_id)

        base_dir = self.config.workspace_base_dir
        canonical_path = (
            base_dir / "investigations" / year / month / safe_inv_id
        )

        return canonical_path

    def resolve_entity_view_path(
        self,
        entity_type: str,
        entity_id: str,
        investigation_id: str,
        created_at: datetime,
        file_kind: str,
        file_ext: str
    ) -> Path:
        """
        Resolve date-grouped entity view path:
        artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>

        Args:
            entity_type: Entity type (e.g., "email", "device_id")
            entity_id: Entity identifier
            investigation_id: Investigation identifier
            created_at: Investigation creation timestamp
            file_kind: File kind (e.g., "artifact", "report")
            file_ext: File extension (e.g., "json", "html")

        Returns:
            Path to entity view file (symlink target or indexed view)
        """
        year = created_at.strftime("%Y")
        month = created_at.strftime("%m")

        # Normalize entity_id and investigation_id
        normalized_entity_id = self.entity_normalizer.normalize(entity_id)
        normalized_entity_type = self.entity_normalizer.normalize_for_filename(
            entity_type
        )
        safe_inv_id = self.entity_normalizer.normalize_for_filename(
            investigation_id
        )

        # Build entity view path
        base_dir = self.config.artifacts_base_dir
        entity_view_path = (
            base_dir
            / "investigations"
            / normalized_entity_type
            / normalized_entity_id
            / year
            / month
            / f"inv_{safe_inv_id}__{file_kind}.{file_ext}"
        )

        return entity_view_path

    def resolve_investigation_artifact_path(
        self,
        entity_type: str,
        entity_id: str,
        date_start: datetime,
        date_end: datetime,
        file_type: str = "json",
        investigation_id: Optional[str] = None,
        created_at: Optional[datetime] = None
    ) -> tuple[Path, Optional[Path]]:
        """
        Resolve paths for investigation artifact (canonical + entity view).

        Returns tuple: (canonical_path, entity_view_path)
        - canonical_path: Path in canonical structure
        - entity_view_path: Path in entity view structure (None if no entity info)

        Args:
            entity_type: Entity type
            entity_id: Entity identifier
            date_start: Investigation start date
            date_end: Investigation end date
            file_type: File type ("json" or "html")
            investigation_id: Optional investigation ID for canonical path
            created_at: Optional creation timestamp for canonical path

        Returns:
            Tuple of (canonical_path, entity_view_path)
        """
        # Build filename
        normalized_entity_id = self.entity_normalizer.normalize(entity_id)
        normalized_entity_type = self.entity_normalizer.normalize_for_filename(
            entity_type
        )
        date_start_str = date_start.strftime("%Y%m%d")
        date_end_str = date_end.strftime("%Y%m%d")

        filename = (
            f"investigation_{normalized_entity_type}_{normalized_entity_id}"
            f"_{date_start_str}_{date_end_str}.{file_type}"
        )

        # Resolve canonical path if investigation_id provided
        canonical_path = None
        if investigation_id and created_at:
            canonical_dir = self.resolve_canonical_investigation_path(
                investigation_id, created_at
            )
            # Create artifacts subdirectory in canonical structure
            artifacts_dir = canonical_dir / "artifacts"
            canonical_path = artifacts_dir / filename

        # Resolve entity view path
        entity_view_path = None
        if entity_type and entity_id:
            # Use date_end as created_at fallback
            view_created_at = created_at or date_end
            # CRITICAL: Only create entity view path if we have an investigation_id
            # If investigation_id is None, we should NOT create an "unknown" artifact
            # This prevents creating artifacts with "inv_unknown__artifact" filenames
            if investigation_id:
                entity_view_path = self.resolve_entity_view_path(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    investigation_id=investigation_id,
                    created_at=view_created_at,
                    file_kind="artifact",
                    file_ext=file_type
                )
            else:
                # Don't log warning - this is expected when comparison doesn't have an investigation
                # (e.g., when comparing windows without running investigations)
                logger.debug(
                    f"Skipping entity view path creation for {entity_type}:{entity_id} "
                    f"- no investigation_id provided. Artifact will only be saved to canonical/fallback path."
                )

        return canonical_path, entity_view_path

    def resolve_comparison_report_path(
        self,
        source_type: str,
        entity_type: str,
        entity_id: str,
        timestamp: datetime
    ) -> Path:
        """
        Resolve path for comparison report.

        Args:
            source_type: Source type ("auto_startup" or "manual")
            entity_type: Entity type
            entity_id: Entity identifier
            timestamp: Comparison timestamp

        Returns:
            Path to comparison report file
        """
        if source_type not in ("auto_startup", "manual"):
            raise ValueError(
                f"Invalid source_type: {source_type}. Must be 'auto_startup' or 'manual'"
            )

        timestamp_str = timestamp.strftime(self.config.timestamp_format)
        normalized_entity_id = self.entity_normalizer.normalize(entity_id)
        normalized_entity_type = self.entity_normalizer.normalize_for_filename(
            entity_type
        )

        base_dir = self.config.artifacts_base_dir
        report_path = (
            base_dir
            / "comparisons"
            / source_type
            / timestamp_str
            / f"comparison_{normalized_entity_type}_{normalized_entity_id}_{timestamp_str}.html"
        )

        return report_path

    def resolve_startup_report_path(self, timestamp: datetime) -> Path:
        """
        Resolve path for startup analysis report.

        Args:
            timestamp: Report timestamp

        Returns:
            Path to startup report file
        """
        timestamp_str = timestamp.strftime(self.config.timestamp_format)

        base_dir = self.config.artifacts_base_dir
        report_path = (
            base_dir
            / "reports"
            / "startup"
            / timestamp_str
            / f"startup_analysis_{timestamp_str}.html"
        )

        return report_path

    def resolve_investigation_log_path(
        self,
        mode: str,
        investigation_id: str,
        timestamp: datetime
    ) -> Path:
        """
        Resolve path for investigation log folder.

        Args:
            mode: Investigation mode ("LIVE", "MOCK", "DEMO")
            investigation_id: Investigation identifier
            timestamp: Investigation timestamp

        Returns:
            Path to investigation log folder
        """
        if mode not in ("LIVE", "MOCK", "DEMO"):
            raise ValueError(
                f"Invalid mode: {mode}. Must be 'LIVE', 'MOCK', or 'DEMO'"
            )

        timestamp_str = timestamp.strftime(self.config.timestamp_format)
        safe_inv_id = self.entity_normalizer.normalize_for_filename(
            investigation_id
        )

        base_dir = self.config.logs_base_dir
        log_path = (
            base_dir
            / "investigations"
            / f"{mode}_{safe_inv_id}_{timestamp_str}"
        )

        return log_path

