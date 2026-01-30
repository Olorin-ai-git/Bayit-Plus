"""
Web Search Service

Searches for information about topics using Wikipedia API (primary)
and DuckDuckGo instant answers (fallback).

Both APIs are free and don't require API keys.
"""

import json
import logging
import urllib.parse
from typing import Dict, Optional

import aiohttp

from app.core.config import settings
from app.services.olorin.resilience import get_circuit_breaker

logger = logging.getLogger(__name__)


class WebSearchService:
    """Service for searching web sources for trivia facts."""

    def __init__(self):
        """Initialize web search service."""
        self.wikipedia_api_url = settings.olorin.live_trivia.wikipedia_api_url
        self.duckduckgo_api_url = settings.olorin.live_trivia.duckduckgo_api_url
        self.timeout = aiohttp.ClientTimeout(
            total=settings.olorin.live_trivia.search_timeout_seconds
        )
        self.summary_truncate_length = settings.olorin.live_trivia.summary_truncate_length

        # Circuit breakers for external APIs (using Olorin resilience)
        self.wikipedia_breaker = get_circuit_breaker("wikipedia")
        self.duckduckgo_breaker = get_circuit_breaker("duckduckgo")

        # Reusable aiohttp session for connection pooling
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with connection pooling."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self):
        """Close aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()

    def _truncate_summary(self, summary: str) -> str:
        """Truncate summary to configured length."""
        if len(summary) > self.summary_truncate_length:
            return summary[:self.summary_truncate_length] + "..."
        return summary

    async def search_wikipedia(self, query: str) -> Optional[Dict]:
        """
        Search Wikipedia for topic summary.

        Args:
            query: Search query (topic name)

        Returns:
            Dict with keys: title, summary, url, categories (or None if not found)
        """
        # Check circuit breaker
        if not await self.wikipedia_breaker.can_execute():
            logger.warning("Wikipedia circuit breaker is open, skipping request")
            return None

        try:
            # Wikipedia API uses URL format: /page/summary/{title}
            # We URL-encode the query
            encoded_query = urllib.parse.quote(query.replace(" ", "_"))

            url = f"{self.wikipedia_api_url}/{encoded_query}"

            session = await self._get_session()
            async with session.get(url) as response:
                    if response.status == 404:
                        logger.info(f"Wikipedia: No page found for '{query}'")
                        return None

                    if response.status != 200:
                        logger.warning(f"Wikipedia API returned status {response.status}")
                        return None

                    data = await response.json()

                    # Extract relevant fields
                    result = {
                        "title": data.get("title", query),
                        "summary": self._truncate_summary(data.get("extract", "")),
                        "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                        "categories": [],  # Wikipedia API v1 doesn't provide categories easily
                        "source": "wikipedia"
                    }

                    logger.info(f"Wikipedia found: '{result['title']}' ({len(result['summary'])} chars)")

                    # Record success
                    await self.wikipedia_breaker.record_success()
                    return result

        except aiohttp.ClientError as e:
            logger.error(f"Wikipedia search failed for '{query}': {e}")
            await self.wikipedia_breaker.record_failure(e)
            return None
        except Exception as e:
            logger.error(f"Unexpected error searching Wikipedia for '{query}': {e}")
            await self.wikipedia_breaker.record_failure(e)
            return None

    async def search_duckduckgo(self, query: str) -> Optional[Dict]:
        """
        Search DuckDuckGo instant answers for topic info.

        Args:
            query: Search query

        Returns:
            Dict with keys: title, summary, url, source (or None if not found)
        """
        # Check circuit breaker
        if not await self.duckduckgo_breaker.can_execute():
            logger.warning("DuckDuckGo circuit breaker is open, skipping request")
            return None

        try:
            params = {
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1"
            }

            session = await self._get_session()
            async with session.get(self.duckduckgo_api_url, params=params) as response:
                    if response.status != 200:
                        logger.warning(f"DuckDuckGo API returned status {response.status}")
                        return None

                    data = await response.json()

                    # DuckDuckGo returns abstract or answer
                    abstract = data.get("Abstract", "")
                    answer = data.get("Answer", "")
                    summary = abstract or answer

                    if not summary:
                        logger.info(f"DuckDuckGo: No instant answer for '{query}'")
                        return None

                    result = {
                        "title": data.get("Heading", query),
                        "summary": self._truncate_summary(summary),
                        "url": data.get("AbstractURL", ""),
                        "source": "duckduckgo"
                    }

                    logger.info(f"DuckDuckGo found: '{result['title']}' ({len(result['summary'])} chars)")

                    # Record success
                    await self.duckduckgo_breaker.record_success()
                    return result

        except aiohttp.ClientError as e:
            logger.error(f"DuckDuckGo search failed for '{query}': {e}")
            await self.duckduckgo_breaker.record_failure(e)
            return None
        except Exception as e:
            logger.error(f"Unexpected error searching DuckDuckGo for '{query}': {e}")
            await self.duckduckgo_breaker.record_failure(e)
            return None

    async def search(self, query: str) -> Optional[Dict]:
        """
        Search for topic information using Wikipedia (primary) and DuckDuckGo (fallback).

        Args:
            query: Search query

        Returns:
            Search result dict or None if not found
        """
        # Try Wikipedia first (more reliable for factual info)
        result = await self.search_wikipedia(query)

        if result and result.get("summary"):
            return result

        # Fallback to DuckDuckGo
        logger.info(f"Wikipedia failed for '{query}', trying DuckDuckGo...")
        result = await self.search_duckduckgo(query)

        return result
