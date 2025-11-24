"""
File Organization Service

Central service for file path resolution and organization.
Implements FileOrganizationService contract with hybrid structure support.

Constitutional Compliance:
- NO hardcoded paths (all from config)
- Complete implementation with no stubs/mocks
- Integrates all foundational components
"""

from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.directory_manager import DirectoryManager
from app.service.investigation.entity_normalizer import EntityNormalizer
from app.service.investigation.file_locker import FileLocker
from app.service.investigation.path_resolver import PathResolver
from app.service.investigation.symlink_manager import SymlinkManager
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FileOrganizationService:
    """Central service for file path resolution and organization."""

    def __init__(
        self,
        config: FileOrganizationConfig,
        entity_normalizer: Optional[EntityNormalizer] = None,
        path_resolver: Optional[PathResolver] = None,
        directory_manager: Optional[DirectoryManager] = None,
        file_locker: Optional[FileLocker] = None,
        symlink_manager: Optional[SymlinkManager] = None
    ):
        """
        Initialize file organization service.

        Args:
            config: File organization configuration
            entity_normalizer: Optional entity normalizer (creates default if None)
            path_resolver: Optional path resolver (creates default if None)
            directory_manager: Optional directory manager (creates default if None)
            file_locker: Optional file locker (creates default if None)
            symlink_manager: Optional symlink manager (creates default if None)
        """
        self.config = config

        # Initialize components
        self.entity_normalizer = (
            entity_normalizer
            or EntityNormalizer(max_length=config.entity_id_max_length)
        )
        self.path_resolver = (
            path_resolver
            or PathResolver(config, self.entity_normalizer)
        )
        self.directory_manager = (
            directory_manager or DirectoryManager()
        )
        self.file_locker = file_locker or FileLocker()
        self.symlink_manager = symlink_manager or SymlinkManager()

    def resolve_investigation_artifact_path(
        self,
        entity_type: str,
        entity_id: str,
        date_start: datetime,
        date_end: datetime,
        file_type: str = "json",
        investigation_id: Optional[str] = None,
        created_at: Optional[datetime] = None
    ) -> Tuple[Optional[Path], Optional[Path]]:
        """
        Resolve filesystem path for investigation artifact (JSON or HTML).

        Returns both canonical and entity view paths.

        Args:
            entity_type: Type of entity (e.g., "email", "device_id", "ip")
            entity_id: Entity identifier (will be normalized)
            date_start: Start date of investigation window
            date_end: End date of investigation window
            file_type: File type extension ("json" or "html"), default "json"
            investigation_id: Optional investigation ID for canonical path
            created_at: Optional creation timestamp for canonical path

        Returns:
            Tuple of (canonical_path, entity_view_path)

        Raises:
            ValueError: If entity_type or entity_id is empty
            ValueError: If file_type is not "json" or "html"
        """
        if not entity_type:
            raise ValueError("entity_type cannot be empty")
        if not entity_id:
            raise ValueError("entity_id cannot be empty")
        if file_type not in ("json", "html"):
            raise ValueError(f"file_type must be 'json' or 'html', got '{file_type}'")

        canonical_path, entity_view_path = self.path_resolver.resolve_investigation_artifact_path(
            entity_type=entity_type,
            entity_id=entity_id,
            date_start=date_start,
            date_end=date_end,
            file_type=file_type,
            investigation_id=investigation_id,
            created_at=created_at
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
        Resolve filesystem path for comparison report HTML.

        Args:
            source_type: Source of comparison ("auto_startup" or "manual")
            entity_type: Type of entity
            entity_id: Entity identifier (will be normalized)
            timestamp: Timestamp for comparison

        Returns:
            Path object to comparison report file

        Raises:
            ValueError: If source_type is not "auto_startup" or "manual"
            ValueError: If entity_type or entity_id is empty
        """
        if source_type not in ("auto_startup", "manual"):
            raise ValueError(
                f"source_type must be 'auto_startup' or 'manual', got '{source_type}'"
            )
        if not entity_type:
            raise ValueError("entity_type cannot be empty")
        if not entity_id:
            raise ValueError("entity_id cannot be empty")

        return self.path_resolver.resolve_comparison_report_path(
            source_type=source_type,
            entity_type=entity_type,
            entity_id=entity_id,
            timestamp=timestamp
        )

    def resolve_startup_report_path(self, timestamp: datetime) -> Path:
        """
        Resolve filesystem path for startup analysis report HTML.

        Args:
            timestamp: Timestamp for startup report

        Returns:
            Path object to startup report file
        """
        return self.path_resolver.resolve_startup_report_path(timestamp)

    def resolve_investigation_log_path(
        self,
        mode: str,
        investigation_id: str,
        timestamp: datetime
    ) -> Path:
        """
        Resolve filesystem path for investigation log folder.

        Args:
            mode: Investigation mode ("LIVE", "MOCK", "DEMO")
            investigation_id: Investigation identifier
            timestamp: Timestamp for investigation

        Returns:
            Path object to investigation log folder

        Raises:
            ValueError: If mode is not "LIVE", "MOCK", or "DEMO"
            ValueError: If investigation_id is empty
        """
        if mode not in ("LIVE", "MOCK", "DEMO"):
            raise ValueError(
                f"mode must be 'LIVE', 'MOCK', or 'DEMO', got '{mode}'"
            )
        if not investigation_id:
            raise ValueError("investigation_id cannot be empty")

        return self.path_resolver.resolve_investigation_log_path(
            mode=mode,
            investigation_id=investigation_id,
            timestamp=timestamp
        )

    def create_directory_structure(self, path: Path) -> None:
        """
        Create directory structure for given path with validation.

        Args:
            path: Path to directory to create

        Raises:
            ValueError: If path validation fails
            OSError: If directory creation fails (permissions, disk full, etc.)
        """
        self.directory_manager.create_directory(path, validate=True)

    def normalize_entity_id(self, entity_id: str) -> str:
        """
        Normalize entity ID for filesystem safety.

        Args:
            entity_id: Raw entity identifier

        Returns:
            Normalized entity ID string

        Raises:
            ValueError: If entity_id is None
        """
        return self.entity_normalizer.normalize(entity_id)

    def create_entity_view_symlink(
        self,
        canonical_path: Path,
        entity_view_path: Path,
        force: bool = False
    ) -> Tuple[str, Optional[str]]:
        """
        Create entity view symlink or indexed view.

        Args:
            canonical_path: Canonical file path
            entity_view_path: Entity view path (symlink target)
            force: Whether to overwrite existing link (default: False)

        Returns:
            Tuple of (view_type, error_message)
            - view_type: "symlink" or "indexed"
            - error_message: Error message if creation failed, None if successful
        """
        return self.symlink_manager.create_symlink(
            target=canonical_path,
            link_path=entity_view_path,
            force=force
        )

    def lock_file_for_write(
        self,
        file_path: Path,
        create_if_missing: bool = True
    ) -> Optional[int]:
        """
        Acquire exclusive lock on file for writing.

        Args:
            file_path: Path to file to lock
            create_if_missing: Whether to create file if it doesn't exist

        Returns:
            File handle if lock acquired, None if max retries exceeded
        """
        return self.file_locker.lock_file(
            file_path=file_path,
            create_if_missing=create_if_missing
        )

    def unlock_file(self, file_handle: int) -> None:
        """
        Release file lock.

        Args:
            file_handle: File descriptor to unlock
        """
        self.file_locker.unlock_file(file_handle)
    
    def is_migration_active(self) -> bool:
        """
        Check if migration period is currently active.
        
        Returns:
            True if migration period is active, False otherwise
        """
        return self.config.is_migration_period_active
    
    def is_legacy_path_read_only(self) -> bool:
        """
        Check if legacy paths should be treated as read-only.
        
        This is true if:
        - Legacy support is disabled, OR
        - Migration period has expired
        
        Returns:
            True if legacy paths should be read-only, False otherwise
        """
        if not self.config.enable_legacy_path_support:
            return True
        
        if self.config.migration_mode and self.config.migration_end_date:
            return datetime.now() >= self.config.migration_end_date
        
        return False
    
    def resolve_comparison_package_path(
        self,
        source_type: str,
        timestamp: datetime
    ) -> Path:
        """
        Resolve filesystem path for comparison zip package.
        
        Args:
            source_type: Source of comparison ("auto_startup" or "manual")
            timestamp: Timestamp for comparison package
            
        Returns:
            Path object to comparison package directory
        """
        return self.path_resolver.resolve_comparison_package_path(
            source_type=source_type,
            timestamp=timestamp
        )

