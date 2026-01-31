"""
Base service for AI-powered text transformations.
Provides common functionality for Hebrew text processing (nikud, shoresh, etc.).
"""

import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Generic, List, Optional, TypeVar

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class AITextTransformService(ABC, Generic[T]):
    """
    Abstract base class for AI-powered text transformation services.
    Handles caching, batching, and common Anthropic API interactions.
    """

    def __init__(self, cache_max_size: int, service_name: str):
        """
        Initialize the service.

        Args:
            cache_max_size: Maximum number of cache entries
            service_name: Name of the service for logging
        """
        self._cache: Dict[str, T] = {}
        self._cache_max_size = cache_max_size
        self._service_name = service_name
        self._logger = get_logger(f"{__name__}.{service_name}")

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        return hashlib.md5(text.encode()).hexdigest()

    def _get_from_cache(self, cache_key: str) -> Optional[T]:
        """Get value from cache if exists"""
        return self._cache.get(cache_key)

    def _add_to_cache(self, cache_key: str, value: T) -> None:
        """Add value to cache if space available"""
        if len(self._cache) < self._cache_max_size:
            self._cache[cache_key] = value

    @abstractmethod
    async def _transform_single(self, text: str) -> T:
        """
        Transform a single text using AI.
        Must be implemented by subclasses.

        Args:
            text: Text to transform

        Returns:
            Transformed result
        """
        pass

    @abstractmethod
    def _create_batch_prompt(self, texts: List[str]) -> str:
        """
        Create prompt for batch transformation.
        Must be implemented by subclasses.

        Args:
            texts: List of texts to transform

        Returns:
            Formatted prompt for batch processing
        """
        pass

    @abstractmethod
    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[T]:
        """
        Parse batch transformation response.
        Must be implemented by subclasses.

        Args:
            response_text: Response from AI
            original_texts: Original input texts

        Returns:
            List of transformed results
        """
        pass

    async def transform(self, text: str, use_cache: bool = True) -> T:
        """
        Transform a single text with caching.

        Args:
            text: Text to transform
            use_cache: Whether to use cache

        Returns:
            Transformed result
        """
        if not text or not text.strip():
            return text  # type: ignore

        # Check cache
        cache_key = self._get_cache_key(text)
        if use_cache:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached

        # Transform
        try:
            result = await self._transform_single(text)

            # Cache result
            if use_cache:
                self._add_to_cache(cache_key, result)

            self._logger.info(
                f"{self._service_name} transformation completed",
                extra={"text_length": len(text), "cached": False},
            )

            return result

        except Exception as e:
            self._logger.error(
                f"{self._service_name} transformation failed",
                extra={"error": str(e), "text": text},
            )
            return text  # type: ignore

    async def transform_batch(
        self, texts: List[str], use_cache: bool = True
    ) -> List[T]:
        """
        Transform multiple texts efficiently using batching.

        Args:
            texts: List of texts to transform
            use_cache: Whether to use cache

        Returns:
            List of transformed results in same order
        """
        results: List[Optional[T]] = []
        uncached_indices = []
        uncached_texts = []

        # Check cache first
        for i, text in enumerate(texts):
            if not text or not text.strip():
                results.append(text)  # type: ignore
                continue

            cache_key = self._get_cache_key(text)
            if use_cache:
                cached = self._get_from_cache(cache_key)
                if cached is not None:
                    results.append(cached)
                    continue

            results.append(None)
            uncached_indices.append(i)
            uncached_texts.append(text)

        # If all cached, return
        if not uncached_texts:
            cache_hit_rate = 1.0
            self._logger.info(
                f"{self._service_name} batch - all cached",
                extra={"total_texts": len(texts), "cache_hit_rate": cache_hit_rate},
            )
            return results  # type: ignore

        # Batch process uncached texts
        try:
            prompt = self._create_batch_prompt(uncached_texts)

            client = get_anthropic_client()
            response = await client.messages.create(
                model=settings.SUBTITLE_AI_MODEL,
                max_tokens=sum(len(t) * 4 for t in uncached_texts),
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text.strip()

            # Parse response
            parsed_results = self._parse_batch_response(response_text, uncached_texts)

            # Update results and cache
            for idx, result in zip(uncached_indices, parsed_results):
                results[idx] = result

                # Cache
                if use_cache:
                    cache_key = self._get_cache_key(texts[idx])
                    self._add_to_cache(cache_key, result)

            # Fill any remaining Nones with original text (fallback)
            for i, result in enumerate(results):
                if result is None:
                    results[i] = texts[i]  # type: ignore

            cache_hit_rate = (len(texts) - len(uncached_texts)) / len(texts)
            self._logger.info(
                f"{self._service_name} batch completed",
                extra={
                    "total_texts": len(texts),
                    "uncached_texts": len(uncached_texts),
                    "cache_hit_rate": cache_hit_rate,
                },
            )

            return results  # type: ignore

        except Exception as e:
            self._logger.error(
                f"{self._service_name} batch transformation failed",
                extra={
                    "error": str(e),
                    "total_texts": len(texts),
                    "uncached_count": len(uncached_texts),
                },
            )
            # Return original texts for uncached items
            for idx in uncached_indices:
                if results[idx] is None:
                    results[idx] = texts[idx]  # type: ignore

            return results  # type: ignore

    def clear_cache(self) -> None:
        """Clear the cache"""
        self._cache.clear()
        self._logger.info(f"{self._service_name} cache cleared")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            "cache_size": len(self._cache),
            "max_size": self._cache_max_size,
        }
