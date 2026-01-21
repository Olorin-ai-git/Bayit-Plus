"""
Olorin.ai Platform Configuration

Centralized Pydantic configuration models for the Olorin AI overlay platform.
Provides separation of concerns for Olorin-specific settings with full type safety
and environment variable support.

Usage:
    from olorin_config import OlorinSettings

    # Load from environment variables
    settings = OlorinSettings()

    # Access nested configurations
    if settings.semantic_search_enabled:
        api_key = settings.pinecone.api_key

    # Validate enabled features
    errors = settings.validate_enabled_features()
    if errors:
        raise ValueError(f"Configuration errors: {errors}")
"""

from .settings import (
    CulturalContextConfig,
    DatabaseConfig,
    DubbingConfig,
    EmbeddingConfig,
    MeteringConfig,
    OlorinSettings,
    PartnerAPIConfig,
    PineconeConfig,
    RecapConfig,
    ResilienceConfig,
)

__version__ = "1.0.0"
__all__ = [
    "OlorinSettings",
    "PartnerAPIConfig",
    "PineconeConfig",
    "EmbeddingConfig",
    "DubbingConfig",
    "RecapConfig",
    "CulturalContextConfig",
    "MeteringConfig",
    "ResilienceConfig",
    "DatabaseConfig",
]
