"""
News Service - Fetches and caches breaking news from various sources.

Supports:
- Ynet Mivzakim (Breaking News) RSS feed
"""

import asyncio
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx

logger = logging.getLogger(__name__)

# Ynet RSS feeds
YNET_MIVZAKIM_URL = "https://www.ynet.co.il/Integration/StoryRss1854.xml"

# Cache TTL (2 minutes)
CACHE_TTL_SECONDS = 120


@dataclass
class NewsItem:
    """A single news item."""

    title: str
    link: str
    published: str
    summary: str
    source: str = "ynet"


class NewsCache:
    """Simple in-memory cache for news items."""

    def __init__(self):
        self._cache: dict[str, tuple[List[NewsItem], datetime]] = {}

    def get(self, key: str) -> Optional[List[NewsItem]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.now(timezone.utc) - cached_at > timedelta(seconds=CACHE_TTL_SECONDS):
            # Cache expired
            del self._cache[key]
            return None

        return items

    def set(self, key: str, items: List[NewsItem]):
        """Cache items."""
        self._cache[key] = (items, datetime.now(timezone.utc))


# Global cache instance
_cache = NewsCache()


async def fetch_ynet_mivzakim(limit: int = 10) -> List[NewsItem]:
    """
    Fetch Ynet breaking news (mivzakim) from RSS feed.

    Results are cached for 2 minutes.

    Args:
        limit: Maximum number of items to return

    Returns:
        List of NewsItem objects
    """
    cache_key = "ynet_mivzakim"

    # Check cache first
    cached = _cache.get(cache_key)
    if cached is not None:
        logger.debug(f"Returning {len(cached)} cached Ynet mivzakim")
        return cached[:limit]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(YNET_MIVZAKIM_URL)
            response.raise_for_status()

            # Parse RSS XML
            root = ET.fromstring(response.content)

            items: List[NewsItem] = []

            # RSS structure: rss > channel > item
            channel = root.find("channel")
            if channel is None:
                logger.warning("No channel found in Ynet RSS")
                return []

            for item in channel.findall("item"):
                title_elem = item.find("title")
                link_elem = item.find("link")
                pub_date_elem = item.find("pubDate")
                desc_elem = item.find("description")

                if title_elem is None or title_elem.text is None:
                    continue

                news_item = NewsItem(
                    title=title_elem.text.strip(),
                    link=(
                        link_elem.text.strip()
                        if link_elem is not None and link_elem.text
                        else ""
                    ),
                    published=(
                        pub_date_elem.text.strip()
                        if pub_date_elem is not None and pub_date_elem.text
                        else ""
                    ),
                    summary=(
                        desc_elem.text.strip()
                        if desc_elem is not None and desc_elem.text
                        else ""
                    ),
                    source="ynet",
                )
                items.append(news_item)

            logger.info(f"Fetched {len(items)} items from Ynet mivzakim RSS")

            # Cache the results
            _cache.set(cache_key, items)

            return items[:limit]

    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching Ynet mivzakim: {e}")
        return []
    except ET.ParseError as e:
        logger.error(f"XML parse error for Ynet mivzakim: {e}")
        return []
    except Exception as e:
        logger.error(f"Error fetching Ynet mivzakim: {e}", exc_info=True)
        return []


def get_cache_info() -> dict:
    """Get cache status for debugging."""
    info = {}
    for key, (items, cached_at) in _cache._cache.items():
        age = (datetime.now(timezone.utc) - cached_at).total_seconds()
        info[key] = {
            "items": len(items),
            "age_seconds": round(age, 1),
            "expires_in": round(CACHE_TTL_SECONDS - age, 1),
        }
    return info
