"""
Location-Specific Scrapers.

Scrapers for location-specific news (Jerusalem, Tel Aviv, Judaism topics).
"""

import logging
from typing import List, Optional

from app.services.news_scraper.constants import MAX_SEARCH_RESULTS
from app.services.news_scraper.models import HeadlineItem
from app.services.news_scraper.rss_parser import (
    enrich_headlines_with_videos,
    search_duckduckgo,
    search_google_news_rss,
)

logger = logging.getLogger(__name__)

# Location search queries
JERUSALEM_QUERIES = [
    "ירושלים חדשות",
    "הכותל המערבי",
    "העיר העתיקה ירושלים",
    "אירועים בירושלים",
    "Jerusalem Israel news",
    "Western Wall Kotel",
    "Old City Jerusalem",
]

TEL_AVIV_QUERIES = [
    "תל אביב חדשות",
    "אירועים תל אביב",
    "תרבות תל אביב",
    "הופעות תל אביב",
    "מסעדות תל אביב",
    "Tel Aviv Israel news",
    "Tel Aviv events",
    "Tel Aviv nightlife",
]

JUDAISM_QUERIES = [
    "Jewish news today",
    "Jewish community news",
    "Torah shiur lecture",
    "Israel Jewish news",
    "חדשות יהודיות",
    "קהילה יהודית",
    "שיעור תורה",
]


def _get_location_queries(location: str) -> List[str]:
    """Get search queries for a location in Hebrew and English."""
    location_lower = location.lower()
    if location_lower in ["jerusalem", "ירושלים"]:
        return JERUSALEM_QUERIES
    if location_lower in ["tel aviv", "תל אביב"]:
        return TEL_AVIV_QUERIES
    return [f"{location} חדשות", f"{location} news"]


async def _search_with_fallback(
    queries: List[str],
    max_results: int,
    category_fn: Optional[callable] = None,
) -> List[HeadlineItem]:
    """Search using Google News first, then DuckDuckGo as fallback."""
    all_headlines: List[HeadlineItem] = []
    seen_urls: set[str] = set()

    for query in queries:
        if len(all_headlines) >= max_results:
            break
        try:
            results = await search_google_news_rss(query, max_results=5)
            for item in results:
                if item.url not in seen_urls:
                    seen_urls.add(item.url)
                    if category_fn:
                        item.category = category_fn(item.title, item.summary)
                    all_headlines.append(item)
        except Exception as e:
            logger.warning(f"Google News search failed for '{query}': {e}")

    if len(all_headlines) < max_results // 2:
        for query in queries[:3]:
            if len(all_headlines) >= max_results:
                break
            try:
                results = await search_duckduckgo(query, max_results=5)
                for item in results:
                    if item.url not in seen_urls:
                        seen_urls.add(item.url)
                        if category_fn:
                            item.category = category_fn(item.title, item.summary)
                        all_headlines.append(item)
            except Exception as e:
                logger.warning(f"DuckDuckGo search failed for '{query}': {e}")

    return all_headlines[:max_results]


async def search_news_for_location(
    location: str,
    language: str = "he",
    max_results: int = MAX_SEARCH_RESULTS,
) -> List[HeadlineItem]:
    """Search for location-specific news using multiple sources."""
    queries = _get_location_queries(location)
    return await _search_with_fallback(queries, max_results)


async def scrape_jerusalem_news() -> List[HeadlineItem]:
    """Scrape Jerusalem-specific news using web search."""
    return await search_news_for_location("Jerusalem", "he", MAX_SEARCH_RESULTS)


async def scrape_tel_aviv_news() -> List[HeadlineItem]:
    """Scrape Tel Aviv-specific news using web search."""
    return await search_news_for_location("Tel Aviv", "he", MAX_SEARCH_RESULTS)


def _categorize_jewish_content(title: str, summary: Optional[str] = None) -> str:
    """Categorize Jewish content based on keywords."""
    text = f"{title} {summary or ''}".lower()

    torah_kw = [
        "torah",
        "shiur",
        "parsha",
        "talmud",
        "halacha",
        "rabbi",
        "שיעור",
        "תורה",
        "הלכה",
        "רב",
    ]
    if any(kw in text for kw in torah_kw):
        return "torah"

    community_kw = [
        "community",
        "synagogue",
        "shul",
        "congregation",
        "קהילה",
        "בית כנסת",
    ]
    if any(kw in text for kw in community_kw):
        return "community"

    israel_kw = [
        "israel",
        "jerusalem",
        "tel aviv",
        "idf",
        "knesset",
        "ישראל",
        "ירושלים",
    ]
    if any(kw in text for kw in israel_kw):
        return "israel"

    culture_kw = ["culture", "art", "music", "festival", "תרבות", "אמנות"]
    if any(kw in text for kw in culture_kw):
        return "culture"

    return "news"


async def scrape_judaism_news() -> List[HeadlineItem]:
    """Scrape Judaism and Jewish community news using web search."""
    return await _search_with_fallback(
        JUDAISM_QUERIES,
        MAX_SEARCH_RESULTS,
        _categorize_jewish_content,
    )


async def scrape_israeli_content_in_us_city(
    city: str,
    state: str,
    max_results: int = MAX_SEARCH_RESULTS,
    enrich_with_videos: bool = False,  # Disabled by default - articles only
) -> List[HeadlineItem]:
    """
    Scrape Israeli-related news and events for a specific US city.

    Searches for:
    - Israeli community news in the city
    - Israeli cultural events
    - Israeli business and tech news
    - Jewish community events with Israeli connection

    Args:
        city: City name
        state: State code
        max_results: Maximum number of results
        enrich_with_videos: If True, extract videos in background (disabled by default)

    Returns empty list on error - never raises exceptions.
    """
    try:
        # Validate inputs
        if not city or not state:
            logger.warning(f"Invalid city/state parameters: city={city}, state={state}")
            return []

        # Build location-specific queries with Israeli context
        location_queries = [
            f"Israeli community {city} {state}",
            f"Israelis in {city}",
            f"Israeli events {city}",
            f"Israeli culture {city}",
            f"Israeli restaurant {city}",
            f"Israeli tech startup {city}",
            f"Israeli business {city}",
            f"Jewish Israeli {city}",
        ]

        logger.info(f"Scraping Israeli content for {city}, {state}")
        results = await _search_with_fallback(location_queries, max_results)
        logger.info(f"Found {len(results)} results for {city}, {state}")

        # Video enrichment disabled - articles only
        # Enrich headlines with videos in parallel (non-blocking, 10s max)
        # if enrich_with_videos and results:
        #     logger.info(f"Starting background video enrichment for {len(results)} headlines")
        #     results = await enrich_headlines_with_videos(
        #         results,
        #         max_concurrent=5,
        #         timeout_per_item=3.0,
        #         overall_timeout=10.0,
        #     )

        return results

    except Exception as e:
        logger.error(f"Failed to scrape Israeli content for {city}, {state}: {e}")
        return []  # Return empty list instead of raising
