"""
Investigation State Configuration Schema
Feature: 005-polling-and-persistence

Provides configuration validation for investigation state polling and persistence.
All values loaded from environment variables with fail-fast validation.

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- All configuration from environment variables
- No hardcoded defaults for required values
- Fail-fast validation on startup
- Type-safe configuration objects
"""

from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseSettings):
    """Database configuration schema."""

    url: str = Field(..., validation_alias="DATABASE_URL")
    pool_size: int = Field(5, validation_alias="DB_POOL_SIZE", ge=1, le=20)
    max_overflow: int = Field(10, validation_alias="DB_MAX_OVERFLOW", ge=0, le=50)

    @field_validator("url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v or v == "<required>":
            raise ValueError("DATABASE_URL must be configured")
        if not v.startswith(("sqlite:///", "postgresql://", "mysql://")):
            raise ValueError("Unsupported database URL scheme")
        return v

    class Config:
        env_file = ".env"


class PollingConfig(BaseSettings):
    """Adaptive polling configuration schema."""

    fast_interval_ms: int = Field(
        ..., validation_alias="POLLING_FAST_INTERVAL_MS", ge=100, le=1000
    )
    normal_interval_ms: int = Field(
        ..., validation_alias="POLLING_NORMAL_INTERVAL_MS", ge=1000, le=5000
    )
    slow_interval_ms: int = Field(
        ..., validation_alias="POLLING_SLOW_INTERVAL_MS", ge=3000, le=10000
    )
    max_backoff_ms: int = Field(
        ..., validation_alias="POLLING_MAX_BACKOFF_MS", ge=10000, le=60000
    )
    max_retries: int = Field(3, validation_alias="POLLING_MAX_RETRIES", ge=1, le=10)

    @model_validator(mode="after")
    def validate_interval_ordering(self) -> "PollingConfig":
        """Ensure polling intervals are properly ordered."""
        if not (
            self.fast_interval_ms < self.normal_interval_ms < self.slow_interval_ms
        ):
            raise ValueError("Polling intervals must be ordered: fast < normal < slow")
        return self

    class Config:
        env_file = ".env"


class RateLimitConfig(BaseSettings):
    """Rate limiting configuration schema."""

    requests_per_minute: int = Field(
        100, validation_alias="RATE_LIMIT_REQUESTS_PER_MINUTE", ge=10, le=1000
    )
    burst: int = Field(20, validation_alias="RATE_LIMIT_BURST", ge=5, le=100)

    class Config:
        env_file = ".env"


class InvestigationFeatureFlags(BaseSettings):
    """Investigation feature flags schema."""

    enable_persistence: bool = Field(True, validation_alias="ENABLE_STATE_PERSISTENCE")
    enable_templates: bool = Field(True, validation_alias="ENABLE_TEMPLATE_MANAGEMENT")
    enable_audit_log: bool = Field(True, validation_alias="ENABLE_AUDIT_LOG")

    class Config:
        env_file = ".env"


class InvestigationStateConfig(BaseSettings):
    """Complete investigation state configuration."""

    database: DatabaseConfig
    polling: PollingConfig
    rate_limit: RateLimitConfig
    features: InvestigationFeatureFlags

    class Config:
        env_file = ".env"

    @model_validator(mode="after")
    def validate_persistence_config(self) -> "InvestigationStateConfig":
        """Validate database URL is set if persistence enabled."""
        if self.features.enable_persistence:
            if not self.database.url:
                raise ValueError("DATABASE_URL required when persistence enabled")
        return self


def load_investigation_config() -> InvestigationStateConfig:
    """Load and validate investigation state configuration.

    Returns:
        Validated InvestigationStateConfig instance

    Raises:
        RuntimeError: If configuration is invalid
    """
    try:
        return InvestigationStateConfig(
            database=DatabaseConfig(),
            polling=PollingConfig(),
            rate_limit=RateLimitConfig(),
            features=InvestigationFeatureFlags(),
        )
    except Exception as e:
        raise RuntimeError(
            f"Invalid investigation configuration – refusing to start: {e}"
        )
