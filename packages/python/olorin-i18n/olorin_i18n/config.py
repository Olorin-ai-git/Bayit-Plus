"""Configuration models for olorin-i18n service."""

from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

from .types import ConfigurationError, LanguageCode, SUPPORTED_LANGUAGES


class I18nConfig(BaseModel):
    """Configuration for internationalization service.

    This model is designed to be integrated into Olorin's configuration system
    using Pydantic settings and environment variables.
    """

    default_language: LanguageCode = Field(
        default="he",
        description="Default language for the system (fallback if user language not available)",
        json_schema_extra={"env": "I18N_DEFAULT_LANGUAGE"},
    )

    fallback_language: LanguageCode = Field(
        default="he",
        description="Fallback language if translation key not found",
        json_schema_extra={"env": "I18N_FALLBACK_LANGUAGE"},
    )

    locales_path: Optional[Path] = Field(
        default=None,
        description="Path to locales directory containing translation JSON files. "
        "If None, uses shared/i18n/locales from repository root",
        json_schema_extra={"env": "I18N_LOCALES_PATH"},
    )

    cache_enabled: bool = Field(
        default=True,
        description="Enable caching of loaded translation files",
        json_schema_extra={"env": "I18N_CACHE_ENABLED"},
    )

    cache_ttl_seconds: int = Field(
        default=3600,
        description="Time-to-live for cache entries in seconds",
        json_schema_extra={"env": "I18N_CACHE_TTL_SECONDS"},
        ge=0,
    )

    track_missing_keys: bool = Field(
        default=False,
        description="Track and log missing translation keys for debugging",
        json_schema_extra={"env": "I18N_TRACK_MISSING_KEYS"},
    )

    supported_languages: list[LanguageCode] = Field(
        default_factory=lambda: list(SUPPORTED_LANGUAGES),
        description="List of supported language codes",
    )

    class Config:
        """Pydantic model configuration."""

        validate_assignment = True
        use_enum_values = True

    def validate_config(self) -> None:
        """Validate configuration consistency.

        Raises:
            ConfigurationError: If configuration is invalid
        """
        if self.default_language not in self.supported_languages:
            raise ConfigurationError(
                f"Default language '{self.default_language}' not in supported languages"
            )

        if self.fallback_language not in self.supported_languages:
            raise ConfigurationError(
                f"Fallback language '{self.fallback_language}' not in supported languages"
            )

        if self.cache_ttl_seconds < 0:
            raise ConfigurationError("cache_ttl_seconds must be non-negative")

        if self.locales_path and not self.locales_path.is_dir():
            raise ConfigurationError(f"Locales path does not exist: {self.locales_path}")

    @property
    def default_locales_path(self) -> Path:
        """Get the default locales path if not configured."""
        if self.locales_path:
            return self.locales_path

        # Assume shared/i18n/locales relative to project root
        # This works when running from backend or any project root
        current_dir = Path.cwd()
        shared_locales = current_dir / "shared" / "i18n" / "locales"

        if shared_locales.exists():
            return shared_locales

        # Fallback: look in parent directories
        for parent in current_dir.parents:
            shared_locales = parent / "shared" / "i18n" / "locales"
            if shared_locales.exists():
                return shared_locales

        raise ConfigurationError(
            "Could not find locales directory. "
            "Set I18N_LOCALES_PATH or ensure shared/i18n/locales exists in project root"
        )
