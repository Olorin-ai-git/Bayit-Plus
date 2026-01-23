"""
Centralized configuration for backend scripts.
Eliminates hardcoded paths and values.
"""
import os
import subprocess
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class ScriptConfig(BaseSettings):
    """Configuration for backend scripts - all paths externalized."""

    # Project structure
    project_root: Path = Field(default_factory=lambda: ScriptConfig._find_project_root())
    backend_dir: Optional[Path] = None
    shared_dir: Optional[Path] = None

    # Storage paths
    backup_dir: Path = Field(
        default_factory=lambda: Path.home() / "Documents" / "olorin" / "backend" / "backups"
    )
    upload_dir: Path = Field(default="/tmp/bayit-uploads")
    vod_upload_dir: Optional[Path] = None
    podcast_upload_dir: Optional[Path] = None
    temp_audio_dir: Path = Field(default="/tmp/podcast_audio")

    # Localization
    i18n_locales_dir: Optional[Path] = None

    # Migration paths
    migration_scripts_dir: Optional[Path] = None

    # Python binary
    python_bin_path: str = Field(default_factory=lambda: ScriptConfig._find_python())

    # Backup encryption (REQUIRED for production)
    backup_encryption_key: str = Field(default="")

    def __init__(self, **data):
        super().__init__(**data)

        # Auto-populate derived paths if not explicitly set
        if self.backend_dir is None:
            self.backend_dir = self.project_root / "backend"

        if self.shared_dir is None:
            self.shared_dir = self.project_root / "shared"

        if self.vod_upload_dir is None:
            self.vod_upload_dir = self.upload_dir / "vod"

        if self.podcast_upload_dir is None:
            self.podcast_upload_dir = self.upload_dir / "podcasts"

        if self.i18n_locales_dir is None:
            self.i18n_locales_dir = self.shared_dir / "i18n" / "locales"

        if self.migration_scripts_dir is None:
            self.migration_scripts_dir = self.backend_dir / "scripts" / "migrations"

    @staticmethod
    def _find_project_root() -> Path:
        """Find project root using git, or fall back to environment variable."""
        # Try git root first
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True,
                text=True,
                check=True,
            )
            return Path(result.stdout.strip())
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

        # Try PROJECT_ROOT environment variable
        project_root = os.getenv("PROJECT_ROOT")
        if project_root:
            return Path(project_root)

        # Fall back to current working directory
        return Path.cwd()

    @staticmethod
    def _find_python() -> str:
        """Find Python 3 binary path."""
        python_path = os.getenv("PYTHON_BIN_PATH")
        if python_path:
            return python_path

        # Try common Python 3 locations
        for cmd in ["python3", "python"]:
            try:
                result = subprocess.run(
                    ["which", cmd],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                return result.stdout.strip()
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        return "python3"  # Default fallback

    def ensure_directories(self):
        """Create all necessary directories if they don't exist."""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.vod_upload_dir.mkdir(parents=True, exist_ok=True)
        self.podcast_upload_dir.mkdir(parents=True, exist_ok=True)
        self.temp_audio_dir.mkdir(parents=True, exist_ok=True)

    class Config:
        env_file = ".env"
        env_prefix = ""  # No prefix, use exact names from paths.env
        case_sensitive = False


# Global instance
_config: Optional[ScriptConfig] = None


def get_script_config() -> ScriptConfig:
    """Get or create global script configuration instance."""
    global _config
    if _config is None:
        _config = ScriptConfig()
    return _config


def load_config() -> ScriptConfig:
    """Alias for get_script_config() for backward compatibility."""
    return get_script_config()
