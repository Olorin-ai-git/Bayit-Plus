"""
File Organization Configuration Schema

This module defines the configuration schema for the unified file organization system.
All values MUST come from environment variables with Pydantic validation.

Constitutional Compliance:
- NO hardcoded values (all from environment variables)
- Pydantic validation with clear error messages
- Configurable base directories and settings
- Migration period support
"""

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class FileOrganizationConfig(BaseSettings):
    """Configuration for file organization system."""

    # Base directories (configurable via environment variables)
    artifacts_base_dir: Path = Field(
        default=Path("artifacts"),
        description="Base directory for investigation artifacts"
    )

    logs_base_dir: Path = Field(
        default=Path("logs"),
        description="Base directory for investigation logs"
    )

    workspace_base_dir: Path = Field(
        default=Path("workspace"),
        description="Base directory for workspace structure"
    )

    # Entity ID normalization settings
    entity_id_max_length: int = Field(
        default=255,
        ge=1,
        le=255,
        description="Maximum length for normalized entity IDs"
    )

    # Timestamp format
    timestamp_format: str = Field(
        default="%Y%m%d_%H%M%S",
        description="Format string for timestamp-based folder names"
    )

    # Legacy support
    enable_legacy_path_support: bool = Field(
        default=True,
        description="Enable backward compatibility with legacy file paths"
    )

    # Migration mode
    migration_mode: bool = Field(
        default=False,
        description="Enable migration mode (creates symlinks during transition)"
    )

    # Migration period settings
    migration_period_days: int = Field(
        default=30,
        ge=1,
        le=365,
        description="Migration period duration in days (legacy paths become read-only after)"
    )

    migration_start_date: Optional[datetime] = Field(
        default=None,
        description="Migration start date (ISO format). If None, uses current date when migration_mode=True"
    )

    @field_validator("artifacts_base_dir", "logs_base_dir", "workspace_base_dir", mode="before")
    @classmethod
    def convert_to_path(cls, v):
        """Convert string to Path object."""
        if isinstance(v, str):
            return Path(v)
        return v

    @property
    def migration_end_date(self) -> Optional[datetime]:
        """Calculate migration end date."""
        if not self.migration_mode:
            return None

        start_date = self.migration_start_date or datetime.now()
        return start_date + timedelta(days=self.migration_period_days)

    @property
    def is_migration_period_active(self) -> bool:
        """Check if migration period is currently active."""
        if not self.migration_mode:
            return False

        if self.migration_end_date is None:
            return False

        return datetime.now() < self.migration_end_date

    model_config = {
        "env_prefix": "FILE_ORG_",
        "case_sensitive": False,
        "populate_by_name": True,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra env vars that don't match FILE_ORG_ prefix
    }

