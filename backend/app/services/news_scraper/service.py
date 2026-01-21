"""
News Scraper Service.

Main coordinator class for news scraping operations.
Handles caching and aggregation of headlines from multiple sources.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from app.services.news_scraper.constants import CACHE_TTL_MINUTES
from app.services.news_scraper.models import HeadlineItem, ScrapedNews
from app.services.news_scraper.source_scrapers import (scrape_mako,
                                                       scrape_walla,
                                                       scrape_ynet)

logger = logging.getLogger(__name__)

# Simple in-memory cache
_cache: Dict[str, Any] = {}
_cache_ttl = timedelta(minutes=CACHE_TTL_MINUTES)


async def scrape_all_sources() -> ScrapedNews:
    """
    Scrape all news sources concurrently.

    Returns aggregated headlines from all sources.
    """
    sources = ["ynet", "walla", "mako"]
    error_sources: list[str] = []

    # Run all scrapers concurrently
    results = await asyncio.gather(
        scrape_ynet(),
        scrape_walla(),
        scrape_mako(),
        return_exceptions=True,
    )

    all_headlines: list[HeadlineItem] = []

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            error_sources.append(sources[i])
            logger.error(f"Error from {sources[i]}: {result}")
        elif isinstance(result, list):
            all_headlines.extend(result)

    # Sort by scraped_at (most recent first)
    all_headlines.sort(key=lambda x: x.scraped_at, reverse=True)

    return ScrapedNews(
        headlines=all_headlines,
        sources=[s for s in sources if s not in error_sources],
        error_sources=error_sources,
    )


async def get_cached_headlines() -> ScrapedNews:
    """
    Get headlines with caching.

    Headlines are cached for the configured TTL (default 30 minutes).
    """
    cache_key = "headlines"
    now = datetime.utcnow()

    if cache_key in _cache:
        cached_data, cached_at = _cache[cache_key]
        if now - cached_at < _cache_ttl:
            return cached_data

    # Fetch fresh data
    news = await scrape_all_sources()
    _cache[cache_key] = (news, now)

    return news


def clear_cache() -> None:
    """Clear the headlines cache."""
    global _cache
    _cache = {}
    logger.info("News scraper cache cleared")


class NewsScraperService:
    """
    Service class for news scraping operations.

    Provides a cleaner interface for dependency injection and testing.
    """

    def __init__(self) -> None:
        """Initialize the service."""
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = timedelta(minutes=CACHE_TTL_MINUTES)

    async def get_headlines(self) -> ScrapedNews:
        """Get headlines with instance-level caching."""
        cache_key = "headlines"
        now = datetime.utcnow()

        if cache_key in self._cache:
            cached_data, cached_at = self._cache[cache_key]
            if now - cached_at < self._cache_ttl:
                return cached_data

        news = await scrape_all_sources()
        self._cache[cache_key] = (news, now)
        return news

    async def refresh_headlines(self) -> ScrapedNews:
        """Force refresh headlines ignoring cache."""
        news = await scrape_all_sources()
        self._cache["headlines"] = (news, datetime.utcnow())
        return news

    def clear_cache(self) -> None:
        """Clear instance-level cache."""
        self._cache = {}
        logger.info("NewsScraperService cache cleared")
