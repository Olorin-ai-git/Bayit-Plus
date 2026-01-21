"""
Feature Cache Management.

Provides caching functionality for feature extraction results.
"""

import time
from typing import Any, Dict, Optional

# Feature cache configuration
FEATURE_CACHE_TTL_SECONDS = 300  # 5 minutes
_feature_cache: Dict[str, tuple[Dict[str, Any], float]] = {}


def get_from_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    Get features from cache if not expired.

    Args:
        cache_key: Cache key to lookup

    Returns:
        Cached features if found and not expired, None otherwise
    """
    if cache_key in _feature_cache:
        features, expiry_time = _feature_cache[cache_key]
        if time.time() < expiry_time:
            return features
        else:
            del _feature_cache[cache_key]
    return None


def set_in_cache(cache_key: str, features: Dict[str, Any]) -> None:
    """
    Set features in cache with expiry.

    Args:
        cache_key: Cache key
        features: Features to cache
    """
    expiry_time = time.time() + FEATURE_CACHE_TTL_SECONDS
    _feature_cache[cache_key] = (features, expiry_time)


def clear_cache() -> None:
    """Clear all cached features."""
    _feature_cache.clear()
