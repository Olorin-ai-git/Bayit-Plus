"""
Culture Scrapers Package

Registry for culture-specific content scrapers.
Each culture has its own scraper that handles:
- Source-specific scraping (RSS, web, API)
- Keyword filtering in native and English
- Relevance scoring
- Category classification
"""

import logging
from typing import Dict, Optional, Type

from app.services.culture_scrapers.base_scraper import (
    BaseCultureScraper,
    CultureHeadlineItem,
)
from app.services.culture_scrapers.israeli_scraper import IsraeliScraper
from app.services.culture_scrapers.chinese_scraper import ChineseScraper

logger = logging.getLogger(__name__)

# Export base classes and types
__all__ = [
    "BaseCultureScraper",
    "CultureHeadlineItem",
    "IsraeliScraper",
    "ChineseScraper",
    "get_scraper",
    "get_scraper_for_culture",
    "SCRAPER_REGISTRY",
]


# Registry of available scrapers by culture_id
SCRAPER_REGISTRY: Dict[str, Type[BaseCultureScraper]] = {
    "israeli": IsraeliScraper,
    "chinese": ChineseScraper,
}

# Singleton instances cache
_scraper_instances: Dict[str, BaseCultureScraper] = {}


def get_scraper(culture_id: str) -> Optional[BaseCultureScraper]:
    """
    Get a scraper instance for the given culture.

    Uses a singleton pattern to reuse scraper instances.

    Args:
        culture_id: The culture identifier (e.g., "israeli", "chinese")

    Returns:
        A scraper instance, or None if culture not supported
    """
    if culture_id not in SCRAPER_REGISTRY:
        logger.warning(f"No scraper registered for culture: {culture_id}")
        return None

    if culture_id not in _scraper_instances:
        scraper_class = SCRAPER_REGISTRY[culture_id]
        _scraper_instances[culture_id] = scraper_class()
        logger.info(f"Created scraper instance for culture: {culture_id}")

    return _scraper_instances[culture_id]


def get_scraper_for_culture(culture_id: str) -> Optional[BaseCultureScraper]:
    """Alias for get_scraper() for backward compatibility."""
    return get_scraper(culture_id)


def register_scraper(culture_id: str, scraper_class: Type[BaseCultureScraper]) -> None:
    """
    Register a new scraper class for a culture.

    Args:
        culture_id: The culture identifier
        scraper_class: The scraper class to register
    """
    SCRAPER_REGISTRY[culture_id] = scraper_class
    # Clear any existing instance to force recreation
    if culture_id in _scraper_instances:
        del _scraper_instances[culture_id]
    logger.info(f"Registered scraper for culture: {culture_id}")


def get_supported_cultures() -> list[str]:
    """Get list of culture IDs that have registered scrapers."""
    return list(SCRAPER_REGISTRY.keys())
