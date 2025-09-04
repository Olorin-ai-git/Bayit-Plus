import asyncio
import logging
from app.service.logging import get_bridge_logger
import time
from functools import wraps
from typing import Any, Dict

logger = get_bridge_logger(__name__)


def async_lru_cache(ttl_seconds=300):  # default TTL of 5 minutes
    def decorator(async_func):
        cache = {}

        @wraps(async_func)
        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)

            # Check if result exists in cache and is not expired
            if key in cache:
                result, timestamp = cache[key]
                if time.time() - timestamp < ttl_seconds:
                    return result
                else:
                    # Remove expired result
                    del cache[key]

            # If not in cache or expired, call the function
            logger.debug(f"Cache is empty calling method={async_func}")
            result = await async_func(*args, **kwargs)
            cache[key] = (result, time.time())
            return result

        # Add method to clear cache
        wrapper.clear_cache = lambda: cache.clear()

        # Add method to get cache info
        wrapper.cache_info = lambda: {
            "cache_size": len(cache),
            "cached_keys": list(cache.keys()),
        }

        return wrapper

    return decorator
