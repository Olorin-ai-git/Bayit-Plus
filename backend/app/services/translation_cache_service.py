"""Translation cache service with two-tier caching (in-memory LRU + MongoDB)."""

import hashlib
import logging
import re
from collections import OrderedDict
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Dict, Optional, Tuple

from app.core.config import settings
from app.models.chat_translation import ChatTranslationCacheDoc

logger = logging.getLogger(__name__)


def sanitize_channel_id(channel_id: Optional[str]) -> Optional[str]:
    """
    Sanitize channel ID to prevent cache poisoning attacks.

    Only allows alphanumeric characters, hyphens, and underscores.
    Rejects channel IDs longer than 100 characters.

    Args:
        channel_id: Raw channel ID from user input

    Returns:
        Sanitized channel ID or None if invalid

    Raises:
        ValueError: If channel ID format is invalid
    """
    if channel_id is None:
        return None

    # Maximum length check
    if len(channel_id) > 100:
        raise ValueError("Channel ID too long (max 100 characters)")

    # Only alphanumeric, hyphen, and underscore allowed
    if not re.match(r'^[a-zA-Z0-9_-]+$', channel_id):
        raise ValueError(
            "Invalid channel ID format. Only alphanumeric characters, hyphens, and underscores allowed."
        )

    return channel_id


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """
    Sanitize translation text to prevent cache poisoning and injection attacks.

    Args:
        text: Raw text from user input
        max_length: Maximum allowed text length

    Returns:
        Sanitized text

    Raises:
        ValueError: If text is too long or contains null bytes
    """
    if not text:
        return text

    # Check for null bytes (potential injection)
    if '\x00' in text:
        raise ValueError("Text contains invalid null bytes")

    # Maximum length check
    if len(text) > max_length:
        raise ValueError(f"Text too long (max {max_length} characters)")

    # Strip leading/trailing whitespace
    return text.strip()


def sanitize_language_code(lang_code: str) -> str:
    """
    Sanitize language code to prevent injection attacks.

    Only allows 2-5 character language codes with lowercase letters and hyphens.
    Examples: "en", "en-US", "zh-CN"

    Args:
        lang_code: Raw language code from user input

    Returns:
        Sanitized language code

    Raises:
        ValueError: If language code format is invalid
    """
    if not lang_code:
        raise ValueError("Language code cannot be empty")

    # Only lowercase letters and hyphens, 2-5 characters
    if not re.match(r'^[a-z]{2}(-[A-Z]{2})?$', lang_code):
        raise ValueError(
            "Invalid language code format. Must be 2-5 characters (e.g., 'en', 'en-US')"
        )

    return lang_code.lower()


class LRUCache:
    """Thread-safe LRU cache for in-memory translation caching."""

    def __init__(self, max_size: int):
        self.max_size = max_size
        self._cache: OrderedDict[str, Tuple[str, str, str]] = OrderedDict()

    def get(self, key: str) -> Optional[Tuple[str, str, str]]:
        """Get value from cache, move to end if found."""
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key: str, value: Tuple[str, str, str]) -> None:
        """Put value in cache, evicting oldest if at capacity."""
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
        self._cache[key] = value

    def clear(self) -> None:
        """Clear all entries from cache."""
        self._cache.clear()


class TranslationCacheService:
    """
    Two-tier caching service for chat translations.

    Tier 1: In-memory LRU cache for fast lookups
    Tier 2: MongoDB cache with TTL for persistent storage
    """

    # In-memory cache (shared across all instances)
    _memory_cache: Optional[LRUCache] = None

    @classmethod
    def _get_memory_cache(cls) -> LRUCache:
        """Get or create the in-memory cache."""
        if cls._memory_cache is None:
            cls._memory_cache = LRUCache(settings.TRANSLATION_MEMORY_CACHE_SIZE)
        return cls._memory_cache

    @staticmethod
    def _generate_cache_key(
        text: str, source_lang: str, target_lang: str, channel_id: Optional[str] = None
    ) -> str:
        """
        Generate a unique cache key for a translation.

        Args:
            text: Text to translate (will be sanitized)
            source_lang: Source language code (will be sanitized)
            target_lang: Target language code (will be sanitized)
            channel_id: Optional channel ID for channel-specific caching (will be sanitized)

        Returns:
            SHA256 hash of the cache key

        Raises:
            ValueError: If any input fails validation
        """
        # Sanitize all inputs
        sanitized_text = sanitize_text(text)
        sanitized_source = sanitize_language_code(source_lang)
        sanitized_target = sanitize_language_code(target_lang)
        sanitized_channel = sanitize_channel_id(channel_id)

        normalized_text = sanitized_text.strip().lower()
        if sanitized_channel:
            key_string = f"{normalized_text}:{sanitized_source}:{sanitized_target}:{sanitized_channel}"
        else:
            key_string = f"{normalized_text}:{sanitized_source}:{sanitized_target}"
        return hashlib.sha256(key_string.encode()).hexdigest()

    @classmethod
    async def get_cached_translation(
        cls,
        text: str,
        source_lang: str,
        target_lang: str,
        channel_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Get a cached translation if available.

        Checks in-memory cache first, then MongoDB.

        Args:
            text: Original text to translate
            source_lang: Source language code
            target_lang: Target language code
            channel_id: Optional channel ID for channel-specific caching (live features)

        Returns:
            Translated text if cached, None otherwise
        """
        if source_lang == target_lang:
            return text

        cache_key = cls._generate_cache_key(text, source_lang, target_lang, channel_id)

        # Check in-memory cache first (Tier 1)
        memory_cache = cls._get_memory_cache()
        cached = memory_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Translation cache hit (memory): {cache_key[:8]}...")
            return cached[2]  # translated_text

        # Check MongoDB cache (Tier 2)
        try:
            doc = await ChatTranslationCacheDoc.find_one(
                ChatTranslationCacheDoc.message_hash == cache_key
            )

            if doc and doc.expires_at > datetime.utcnow():
                # Update hit count
                doc.hit_count += 1
                await doc.save()

                # Store in memory cache for future lookups
                memory_cache.put(
                    cache_key, (doc.original_text, doc.source_lang, doc.translated_text)
                )

                logger.debug(f"Translation cache hit (MongoDB): {cache_key[:8]}...")
                return doc.translated_text

        except Exception as e:
            logger.warning(f"Error reading from translation cache: {e}")

        return None

    @classmethod
    async def store_translation(
        cls,
        text: str,
        source_lang: str,
        target_lang: str,
        translated_text: str,
        channel_id: Optional[str] = None,
        ttl_seconds: Optional[int] = None,
    ) -> None:
        """
        Store a translation in both cache tiers.

        Args:
            text: Original text
            source_lang: Source language code
            target_lang: Target language code
            translated_text: Translated text
            channel_id: Optional channel ID for channel-specific caching (live features)
            ttl_seconds: Optional custom TTL in seconds (overrides default days TTL)
        """
        if source_lang == target_lang:
            return

        cache_key = cls._generate_cache_key(text, source_lang, target_lang, channel_id)

        # Store in memory cache (Tier 1)
        memory_cache = cls._get_memory_cache()
        memory_cache.put(cache_key, (text, source_lang, translated_text))

        # Store in MongoDB cache (Tier 2)
        try:
            if ttl_seconds is not None:
                # Use custom TTL (for live features - e.g., 5 minutes)
                expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            else:
                # Use default TTL (for chat - e.g., 7 days)
                expires_at = datetime.utcnow() + timedelta(
                    days=settings.CHAT_TRANSLATION_CACHE_TTL_DAYS
                )

            existing = await ChatTranslationCacheDoc.find_one(
                ChatTranslationCacheDoc.message_hash == cache_key
            )

            if existing:
                existing.translated_text = translated_text
                existing.expires_at = expires_at
                existing.hit_count += 1
                await existing.save()
            else:
                doc = ChatTranslationCacheDoc(
                    message_hash=cache_key,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    original_text=text,
                    translated_text=translated_text,
                    expires_at=expires_at,
                )
                await doc.insert()

            logger.debug(f"Translation cached: {cache_key[:8]}...")

        except Exception as e:
            logger.warning(f"Error storing translation in cache: {e}")

    @classmethod
    async def get_or_translate(
        cls, text: str, source_lang: str, target_lang: str, translator_func
    ) -> Tuple[str, bool]:
        """
        Get cached translation or execute translator function.

        Args:
            text: Original text to translate
            source_lang: Source language code
            target_lang: Target language code
            translator_func: Async function to call if cache miss

        Returns:
            Tuple of (translated_text, is_cached)
        """
        # Check cache first
        cached = await cls.get_cached_translation(text, source_lang, target_lang)
        if cached is not None:
            return cached, True

        # Execute translation
        translated = await translator_func(text, source_lang, target_lang)

        # Store in cache
        await cls.store_translation(text, source_lang, target_lang, translated)

        return translated, False

    @classmethod
    def clear_memory_cache(cls) -> None:
        """Clear the in-memory cache."""
        if cls._memory_cache is not None:
            cls._memory_cache.clear()

    @classmethod
    async def cleanup_expired(cls) -> int:
        """
        Remove expired entries from MongoDB cache.

        Returns:
            Number of entries removed
        """
        try:
            result = await ChatTranslationCacheDoc.find(
                ChatTranslationCacheDoc.expires_at < datetime.utcnow()
            ).delete()
            count = result.deleted_count if result else 0
            logger.info(f"Cleaned up {count} expired translation cache entries")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up expired translations: {e}")
            return 0

    @classmethod
    async def get_cache_stats(cls) -> Dict:
        """Get cache statistics."""
        try:
            total = await ChatTranslationCacheDoc.count()
            expired = await ChatTranslationCacheDoc.find(
                ChatTranslationCacheDoc.expires_at < datetime.utcnow()
            ).count()

            memory_size = (
                len(cls._get_memory_cache()._cache) if cls._memory_cache else 0
            )

            return {
                "mongodb_total": total,
                "mongodb_expired": expired,
                "mongodb_active": total - expired,
                "memory_cache_size": memory_size,
                "memory_cache_max_size": settings.TRANSLATION_MEMORY_CACHE_SIZE,
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


# Global instance
translation_cache_service = TranslationCacheService()
