"""
Feature Flag Service
Centralized feature flag management and checking
"""

import logging
import os
from typing import Dict, Optional

from fastapi import HTTPException, status

from app.models.admin import SystemSettings

logger = logging.getLogger(__name__)

# In-memory cache for feature flags (refreshed periodically)
_feature_flags_cache: Optional[Dict[str, bool]] = None


async def get_feature_flags() -> Dict[str, bool]:
    """
    Get current feature flags from database.

    Returns:
        Dictionary of feature flag names to their enabled status
    """
    global _feature_flags_cache

    # Try database first
    settings = await SystemSettings.find_one(SystemSettings.key == "system_settings")

    if settings and settings.feature_flags:
        _feature_flags_cache = settings.feature_flags
        return settings.feature_flags

    # Fallback to cache if DB unavailable
    if _feature_flags_cache:
        logger.warning("Using cached feature flags (database unavailable)")
        return _feature_flags_cache

    # Last resort: default flags
    logger.warning("Using default feature flags (no database or cache)")
    return {
        "new_player": True,
        "dark_mode": True,
        "offline_mode": False,
        "recommendations": True,
        "social_features": False,
        "live_chat": True,
        "analytics_v2": False,
        "scene_search": True,
    }


async def is_feature_enabled(feature_name: str) -> bool:
    """
    Check if a feature flag is enabled.

    Checks in this order:
    1. Environment variable FEATURE_{NAME}_ENABLED (override)
    2. Database SystemSettings.feature_flags
    3. Cached flags
    4. Default to False for unknown features

    Args:
        feature_name: Name of the feature (e.g., "scene_search")

    Returns:
        True if enabled, False otherwise
    """
    # Check environment variable override (deployment-level control)
    env_var = f"FEATURE_{feature_name.upper()}_ENABLED"
    env_value = os.getenv(env_var)
    if env_value is not None:
        enabled = env_value.lower() in ("true", "1", "yes")
        logger.info(
            f"Feature '{feature_name}' controlled by env var {env_var}: {enabled}"
        )
        return enabled

    # Check database/cache
    flags = await get_feature_flags()
    enabled = flags.get(feature_name, False)

    logger.debug(f"Feature '{feature_name}' enabled: {enabled}")
    return enabled


async def require_feature(feature_name: str) -> None:
    """
    Verify a feature is enabled. Raises HTTPException if not.

    Use as FastAPI dependency:
        @router.get("/endpoint")
        async def my_endpoint(
            _: None = Depends(lambda: require_feature("scene_search"))
        ):
            ...

    Args:
        feature_name: Feature to check

    Raises:
        HTTPException: 503 Service Unavailable if feature disabled
    """
    if not await is_feature_enabled(feature_name):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "feature_disabled",
                "message": f"The '{feature_name}' feature is currently unavailable.",
                "feature": feature_name,
            },
        )


async def check_multiple_features(
    *feature_names: str, require_all: bool = True
) -> bool:
    """
    Check multiple feature flags.

    Args:
        *feature_names: Feature names to check
        require_all: If True, all must be enabled. If False, any can be enabled.

    Returns:
        True if check passes, False otherwise
    """
    flags = await get_feature_flags()
    statuses = [flags.get(name, False) for name in feature_names]

    if require_all:
        return all(statuses)
    else:
        return any(statuses)


async def get_enabled_features() -> list[str]:
    """
    Get list of all currently enabled features.

    Returns:
        List of enabled feature names
    """
    flags = await get_feature_flags()
    return [name for name, enabled in flags.items() if enabled]


def clear_cache() -> None:
    """Clear the in-memory feature flags cache."""
    global _feature_flags_cache
    _feature_flags_cache = None
    logger.info("Feature flags cache cleared")
