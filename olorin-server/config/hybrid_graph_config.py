"""
Hybrid Graph Integration Configuration

Centralized configuration for hybrid graph investigation features with Pydantic validation.
All values sourced from environment variables - no hardcoded defaults.
"""

import os
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class HybridGraphConfig(BaseModel):
    """
    Configuration schema for hybrid graph investigation features.

    All fields are loaded from environment variables with strict validation.
    No defaults provided - missing values will cause startup failure.
    """

    # Feature flags
    feature_enabled: bool = Field(
        ...,
        description="Enable hybrid graph polling integration"
    )
    feature_multi_entity_enabled: bool = Field(
        ...,
        description="Enable multi-entity investigation support"
    )

    # Investigation configuration
    max_duration_minutes: int = Field(
        ...,
        gt=0,
        le=60,
        description="Maximum investigation duration in minutes"
    )
    max_concurrent_per_user: int = Field(
        ...,
        gt=0,
        le=10,
        description="Maximum concurrent investigations per user"
    )
    history_retention_days: int = Field(
        ...,
        gt=0,
        le=365,
        description="Investigation history retention period in days"
    )

    # Polling configuration
    status_cache_ttl_seconds: int = Field(
        ...,
        gt=0,
        le=10,
        description="Status response cache TTL in seconds"
    )
    status_query_timeout_ms: int = Field(
        ...,
        gt=0,
        le=5000,
        description="Database query timeout for status endpoint in milliseconds"
    )
    results_query_timeout_ms: int = Field(
        ...,
        gt=0,
        le=10000,
        description="Database query timeout for results endpoint in milliseconds"
    )

    # Export configuration
    export_max_size_mb: int = Field(
        ...,
        gt=0,
        le=500,
        description="Maximum export file size in megabytes"
    )
    export_url_expiry_hours: int = Field(
        ...,
        gt=0,
        le=168,
        description="Export download URL expiry time in hours"
    )

    # Database configuration
    database_url: str = Field(
        ...,
        description="Database connection URL"
    )

    @field_validator('max_duration_minutes')
    @classmethod
    def validate_max_duration(cls, v: int) -> int:
        """Validate investigation max duration is reasonable."""
        if v < 5:
            raise ValueError("max_duration_minutes must be at least 5 minutes")
        return v

    @field_validator('status_cache_ttl_seconds')
    @classmethod
    def validate_cache_ttl(cls, v: int) -> int:
        """Validate cache TTL is reasonable for polling."""
        if v < 1:
            raise ValueError("status_cache_ttl_seconds must be at least 1 second")
        return v

    @field_validator('database_url')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL is not empty."""
        if not v or not v.strip():
            raise ValueError("database_url cannot be empty")
        return v

    class Config:
        """Pydantic model configuration."""
        frozen = True  # Make config immutable after creation
        extra = "forbid"  # Reject unknown fields


def load_hybrid_graph_config() -> HybridGraphConfig:
    """
    Load and validate hybrid graph configuration from environment variables.

    Returns:
        HybridGraphConfig: Validated configuration object

    Raises:
        ValueError: If configuration validation fails
        KeyError: If required environment variables are missing
    """
    try:
        config = HybridGraphConfig(
            feature_enabled=os.environ.get("FEATURE_ENABLE_HYBRID_GRAPH_POLLING", "").lower() == "true",
            feature_multi_entity_enabled=os.environ.get("FEATURE_ENABLE_MULTI_ENTITY_INVESTIGATIONS", "").lower() == "true",
            max_duration_minutes=int(os.environ["INVESTIGATION_MAX_DURATION_MINUTES"]),
            max_concurrent_per_user=int(os.environ["INVESTIGATION_MAX_CONCURRENT_PER_USER"]),
            history_retention_days=int(os.environ["INVESTIGATION_HISTORY_RETENTION_DAYS"]),
            status_cache_ttl_seconds=int(os.environ["INVESTIGATION_POLLING_STATUS_CACHE_TTL_SECONDS"]),
            status_query_timeout_ms=int(os.environ["INVESTIGATION_STATUS_QUERY_TIMEOUT_MS"]),
            results_query_timeout_ms=int(os.environ["INVESTIGATION_RESULTS_QUERY_TIMEOUT_MS"]),
            export_max_size_mb=int(os.environ["INVESTIGATION_EXPORT_MAX_SIZE_MB"]),
            export_url_expiry_hours=int(os.environ["INVESTIGATION_EXPORT_URL_EXPIRY_HOURS"]),
            database_url=os.environ["DATABASE_URL"],
        )
        return config
    except KeyError as e:
        raise KeyError(
            f"Missing required environment variable: {e}. "
            "Please configure all INVESTIGATION_* and DATABASE_URL environment variables."
        ) from e
    except ValueError as e:
        raise ValueError(f"Invalid hybrid graph configuration: {e}") from e


# Singleton instance
_config_instance: Optional[HybridGraphConfig] = None


def get_hybrid_graph_config() -> HybridGraphConfig:
    """
    Get validated hybrid graph configuration singleton.

    Configuration is loaded once at application startup and cached.

    Returns:
        HybridGraphConfig: Validated configuration object
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = load_hybrid_graph_config()
    return _config_instance


def reset_hybrid_graph_config() -> None:
    """Reset configuration singleton (for testing purposes)."""
    global _config_instance
    _config_instance = None