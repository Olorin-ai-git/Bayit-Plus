"""
Base Content Cache Module - Shared TTL-based caching logic.

Provides in-memory caching with TTL support and stale fallback for content services.
This module is used by youngsters, kids, and tel_aviv content services.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


class ContentCache:
    """In-memory cache for content with TTL support and stale fallback."""

    def __init__(self, ttl_minutes: int):
        """
        Initialize content cache with TTL.

        Args:
            ttl_minutes: Time-to-live in minutes before cache expires
        """
        self._cache: Dict[str, tuple[List[Dict[str, Any]], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached items if not expired.

        Args:
            key: Cache key

        Returns:
            List of cached items if valid, None if expired or not found
        """
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.now(timezone.utc) - cached_at > self._ttl:
            # Don't delete - keep for stale fallback
            return None

        return items

    def set(self, key: str, items: List[Dict[str, Any]]) -> None:
        """
        Cache items with current timestamp.

        Args:
            key: Cache key
            items: List of items to cache
        """
        self._cache[key] = (items, datetime.now(timezone.utc))

    def get_stale(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached items ignoring TTL (stale fallback).

        Args:
            key: Cache key

        Returns:
            List of cached items regardless of TTL, None if not found
        """
        if key in self._cache:
            return self._cache[key][0]  # Return items, ignore timestamp
        return None

    def clear(self) -> None:
        """Clear all cached items."""
        self._cache.clear()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """
        Get the timestamp when the cache was last updated.

        Args:
            key: Cache key

        Returns:
            DateTime of last update, None if key not found
        """
        if key in self._cache:
            return self._cache[key][1]
        return None
