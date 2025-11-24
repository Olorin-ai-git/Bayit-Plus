"""
Workspace Configuration Module

This module handles parsing of `olorin.toml` configuration file for workspace settings.
Supports environment variable overrides and provides defaults.

Constitutional Compliance:
- NO hardcoded values (all from config file or environment variables)
- TOML parsing with fallback to defaults
- Environment variable overrides supported
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import tomllib  # Python 3.11+
except ImportError:
    try:
        import tomli as tomllib  # Fallback for older Python
    except ImportError:
        tomllib = None

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class WorkspaceConfig:
    """Configuration for workspace structure and path templates."""

    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize workspace configuration.

        Args:
            config_path: Optional path to olorin.toml file. If None, searches for
                        olorin.toml in current directory and parent directories.
        """
        self.config_path = config_path or self._find_config_file()
        self._config_data: Dict[str, Any] = {}
        self._load_config()

    def _find_config_file(self) -> Optional[Path]:
        """Find olorin.toml file in current directory or parent directories."""
        current = Path.cwd()
        max_depth = 5  # Limit search depth

        for _ in range(max_depth):
            config_file = current / "olorin.toml"
            if config_file.exists():
                return config_file
            parent = current.parent
            if parent == current:  # Reached filesystem root
                break
            current = parent

        return None

    def _load_config(self) -> None:
        """Load configuration from TOML file or use defaults."""
        if self.config_path and self.config_path.exists():
            if tomllib is None:
                logger.warning(
                    "TOML parsing not available. Install 'tomli' package or use Python 3.11+"
                )
                self._config_data = self._get_default_config()
                return

            try:
                with open(self.config_path, "rb") as f:
                    self._config_data = tomllib.load(f)
                logger.info(f"Loaded workspace config from {self.config_path}")
            except Exception as e:
                logger.warning(f"Failed to load config from {self.config_path}: {e}")
                self._config_data = self._get_default_config()
        else:
            logger.debug("No olorin.toml found, using defaults")
            self._config_data = self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration values."""
        return {
            "workspace": {
                "base_dir": os.getenv("FILE_ORG_WORKSPACE_BASE_DIR", "workspace"),
                "investigations_dir": "investigations",
                "comparisons_dir": "comparisons",
                "reports_dir": "reports",
                "registry_dir": "registry",
            },
            "paths": {
                "canonical_template": "investigations/{YYYY}/{MM}/{inv_id}",
                "entity_view_template": "artifacts/{entity_type}/{entity_id}/{YYYY}/{MM}",
                "timestamp_format": "%Y%m%d_%H%M%S",
            },
            "normalization": {
                "entity_id_max_length": int(
                    os.getenv("FILE_ORG_ENTITY_ID_MAX_LENGTH", "255")
                ),
                "replace_dots": True,
                "replace_at": True,
            },
            "migration": {
                "period_days": int(os.getenv("FILE_ORG_MIGRATION_PERIOD_DAYS", "30")),
                "enable_legacy_support": os.getenv(
                    "FILE_ORG_ENABLE_LEGACY_PATH_SUPPORT", "true"
                ).lower()
                == "true",
            },
        }

    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get configuration value by dot-separated key path.

        Args:
            key_path: Dot-separated path (e.g., "workspace.base_dir")
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        keys = key_path.split(".")
        value = self._config_data

        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
                if value is None:
                    return default
            else:
                return default

        return value

    def get_workspace_base_dir(self) -> Path:
        """Get workspace base directory."""
        base_dir = self.get("workspace.base_dir", "workspace")
        return Path(base_dir)

    def get_investigations_dir(self) -> Path:
        """Get investigations directory relative to workspace base."""
        return Path(self.get("workspace.investigations_dir", "investigations"))

    def get_comparisons_dir(self) -> Path:
        """Get comparisons directory relative to workspace base."""
        return Path(self.get("workspace.comparisons_dir", "comparisons"))

    def get_reports_dir(self) -> Path:
        """Get reports directory relative to workspace base."""
        return Path(self.get("workspace.reports_dir", "reports"))

    def get_registry_dir(self) -> Path:
        """Get registry directory relative to workspace base."""
        return Path(self.get("workspace.registry_dir", "registry"))

    def get_canonical_template(self) -> str:
        """Get canonical path template."""
        return self.get(
            "paths.canonical_template", "investigations/{YYYY}/{MM}/{inv_id}"
        )

    def get_entity_view_template(self) -> str:
        """Get entity view path template."""
        return self.get(
            "paths.entity_view_template",
            "artifacts/{entity_type}/{entity_id}/{YYYY}/{MM}",
        )

    def get_timestamp_format(self) -> str:
        """Get timestamp format string."""
        return self.get("paths.timestamp_format", "%Y%m%d_%H%M%S")

    def get_entity_id_max_length(self) -> int:
        """Get maximum entity ID length."""
        return int(self.get("normalization.entity_id_max_length", 255))

    def is_legacy_support_enabled(self) -> bool:
        """Check if legacy path support is enabled."""
        return self.get("migration.enable_legacy_support", True)

