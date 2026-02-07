"""
Feature Flag Service
Centralized feature flag management and checking
"""

import logging
import os
from typing import Dict, Optional

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
