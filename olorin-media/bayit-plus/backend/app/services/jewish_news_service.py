"""
Jewish News Service - Aggregates news from major US Jewish publications via RSS feeds.

Supports multiple sources including JTA, Times of Israel, Forward, Tablet, Aish, Chabad, etc.
Uses in-memory caching with configurable TTL to reduce API calls.
"""

import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.jewish_news import (JewishNewsAggregatedResponse,
                                    JewishNewsItem, JewishNewsItemResponse,
                                    JewishNewsSource, JewishNewsSourceResponse)
from app.services.news_scraper import HeadlineItem, scrape_judaism_news

logger = logging.getLogger(__name__)


# Default Jewish news sources for US communities
DEFAULT_JEWISH_NEWS_SOURCES = [
    {
        "name": "JTA",
        "name_he": "סוכנות הידיעות היהודית",
        "rss_url": "https://www.jta.org/feed",
        "website_url": "https://www.jta.org",
        "logo_url": "https://www.jta.org/wp-content/themes/flavor-developer/assets/images/jta-logo.png",
        "category": "news",
        "language": "en",
    },
    {
        "name": "Times of Israel",
        "name_he": "הטיימס אוף ישראל",
        "rss_url": "https://www.timesofisrael.com/feed/",
        "website_url": "https://www.timesofisrael.com",
        "logo_url": "https://static.timesofisrael.com/www/images/toi-logo.png",
        "category": "news",
        "language": "en",
    },
    {
        "name": "The Forward",
        "name_he": "הפורוורד",
        "rss_url": "https://forward.com/feed/",
        "website_url": "https://forward.com",
        "logo_url": "https://forward.com/wp-content/themes/flavor-developer/assets/images/forward-logo.svg",
        "category": "culture",
        "language": "en",
    },
    {
        "name": "Tablet Magazine",
        "name_he": "מגזין טאבלט",
        "rss_url": "https://www.tabletmag.com/feed",
        "website_url": "https://www.tabletmag.com",
        "logo_url": "https://www.tabletmag.com/favicon.ico",
        "category": "opinion",
        "language": "en",
    },
    {
        "name": "Aish.com",
        "name_he": "אש.קום",
        "rss_url": "https://aish.com/feed/",
        "website_url": "https://aish.com",
        "logo_url": "https://aish.com/favicon.ico",
        "category": "torah",
        "language": "en",
    },
    {
        "name": "Chabad.org",
        "name_he": 'חב"ד',
        "rss_url": "https://www.chabad.org/tools/rss/rss.xml",
        "website_url": "https://www.chabad.org",
        "logo_url": "https://www.chabad.org/favicon.ico",
        "category": "torah",
        "language": "en",
    },
    {
        "name": "Jewish Week",
        "name_he": "הג'ואיש וויק",
        "rss_url": "https://jewishweek.timesofisrael.com/feed/",
        "website_url": "https://jewishweek.timesofisrael.com",
        "logo_url": "https://jewishweek.timesofisrael.com/favicon.ico",
        "category": "community",
        "language": "en",
    },
    {
        "name": "Yeshiva World News",
        "name_he": "עולם הישיבות",
        "rss_url": "https://www.theyeshivaworld.com/feed",
        "website_url": "https://www.theyeshivaworld.com",
        "logo_url": "https://www.theyeshivaworld.com/favicon.ico",
        "category": "news",
        "language": "en",
    },
]


class NewsCache:
    """In-memory cache for news items with TTL support."""

    def __init__(self, ttl_minutes: int):
        self._cache: Dict[str, tuple[List[Dict[str, Any]], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.now(timezone.utc) - cached_at > self._ttl:
            del self._cache[key]
            return None

        return items

    def set(self, key: str, items: List[Dict[str, Any]]) -> None:
        """Cache items with current timestamp."""
        self._cache[key] = (items, datetime.now(timezone.utc))

    def clear(self) -> None:
        """Clear all cached items."""
        self._cache.clear()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """Get the timestamp when the cache was last updated."""
        if key in self._cache:
            return self._cache[key][1]
        return None


class JewishNewsService:
    """Service for aggregating Jewish news from multiple RSS sources."""

    def __init__(self):
        self._cache = NewsCache(ttl_minutes=settings.JEWISH_NEWS_CACHE_TTL_MINUTES)
        self._sources_initialized = False

    async def initialize_sources(self) -> None:
        """Initialize default news sources in the database if not present."""
        if self._sources_initialized:
            return

        try:
            for source_data in DEFAULT_JEWISH_NEWS_SOURCES:
                existing = await JewishNewsSource.find_one(
                    JewishNewsSource.name == source_data["name"]
                )
                if not existing:
                    source = JewishNewsSource(**source_data, is_active=True)
                    await source.insert()
                    logger.info(f"Initialized news source: {source_data['name']}")

            self._sources_initialized = True
            logger.info("Jewish news sources initialized")
        except Exception as e:
            logger.error(f"Failed to initialize news sources: {e}")

    async def get_sources(
        self, active_only: bool = True
    ) -> List[JewishNewsSourceResponse]:
        """Get list of available news sources."""
        await self.initialize_sources()

        query = {"is_active": True} if active_only else {}
        sources = await JewishNewsSource.find(query).to_list()

        return [
            JewishNewsSourceResponse(
                id=str(source.id),
                name=source.name,
                name_he=source.name_he,
                website_url=source.website_url,
                logo_url=source.logo_url,
                category=source.category,
                language=source.language,
                is_active=source.is_active,
            )
            for source in sources
        ]

    async def fetch_rss_feed(self, source: JewishNewsSource) -> List[Dict[str, Any]]:
        """Fetch and parse RSS feed from a source."""
        items: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(
                timeout=settings.JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS
            ) as client:
                response = await client.get(
                    source.rss_url,
                    headers={"User-Agent": "Bayit+ Jewish News Aggregator/1.0"},
                    follow_redirects=True,
                )
                response.raise_for_status()

                # Parse RSS XML
                root = ET.fromstring(response.content)

                # Handle both RSS 2.0 and Atom feeds
                channel = root.find("channel")
                if channel is not None:
                    # RSS 2.0 format
                    items = self._parse_rss_items(channel, source)
                else:
                    # Try Atom format
                    items = self._parse_atom_items(root, source)

                # Update source fetch status
                source.last_fetched_at = datetime.now(timezone.utc)
                source.fetch_error_count = 0
                source.last_error_message = None
                await source.save()

                logger.info(f"Fetched {len(items)} items from {source.name}")

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {source.name}: {e}")
            source.fetch_error_count += 1
            source.last_error_message = str(e)
            await source.save()
        except ET.ParseError as e:
            logger.error(f"XML parse error for {source.name}: {e}")
            source.fetch_error_count += 1
            source.last_error_message = f"XML parse error: {e}"
            await source.save()
        except Exception as e:
            logger.error(f"Error fetching {source.name}: {e}", exc_info=True)
            source.fetch_error_count += 1
            source.last_error_message = str(e)
            await source.save()

        return items

    def _parse_rss_items(
        self, channel: ET.Element, source: JewishNewsSource
    ) -> List[Dict[str, Any]]:
        """Parse RSS 2.0 channel items."""
        items = []

        for item in channel.findall("item"):
            title_elem = item.find("title")
            link_elem = item.find("link")
            pub_date_elem = item.find("pubDate")
            desc_elem = item.find("description")
            guid_elem = item.find("guid")
            author_elem = item.find("author") or item.find(
                "{http://purl.org/dc/elements/1.1/}creator"
            )

            if title_elem is None or title_elem.text is None:
                continue

            # Parse publication date
            pub_date = None
            if pub_date_elem is not None and pub_date_elem.text:
                try:
                    pub_date = parsedate_to_datetime(pub_date_elem.text)
                except Exception:
                    pub_date = datetime.now(timezone.utc)
            else:
                pub_date = datetime.now(timezone.utc)

            # Extract image URL from description or enclosure
            image_url = None
            enclosure = item.find("enclosure")
            if enclosure is not None:
                enc_type = enclosure.get("type", "")
                if enc_type.startswith("image/"):
                    image_url = enclosure.get("url")

            # Also check media:content
            media_content = item.find("{http://search.yahoo.com/mrss/}content")
            if media_content is not None and not image_url:
                media_type = media_content.get("medium", media_content.get("type", ""))
                if media_type == "image" or media_type.startswith("image/"):
                    image_url = media_content.get("url")

            items.append(
                {
                    "source_id": str(source.id),
                    "source_name": source.name,
                    "title": title_elem.text.strip(),
                    "link": (
                        link_elem.text.strip()
                        if link_elem is not None and link_elem.text
                        else ""
                    ),
                    "published_at": pub_date,
                    "summary": (
                        desc_elem.text.strip()
                        if desc_elem is not None and desc_elem.text
                        else None
                    ),
                    "author": (
                        author_elem.text.strip()
                        if author_elem is not None and author_elem.text
                        else None
                    ),
                    "image_url": image_url,
                    "category": source.category,
                    "guid": (
                        guid_elem.text.strip()
                        if guid_elem is not None and guid_elem.text
                        else (
                            link_elem.text.strip()
                            if link_elem is not None and link_elem.text
                            else ""
                        )
                    ),
                }
            )

        return items

    def _parse_atom_items(
        self, root: ET.Element, source: JewishNewsSource
    ) -> List[Dict[str, Any]]:
        """Parse Atom feed items."""
        items = []
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        for entry in root.findall("atom:entry", ns) or root.findall("entry"):
            title_elem = entry.find("atom:title", ns) or entry.find("title")
            link_elem = (
                entry.find("atom:link[@rel='alternate']", ns)
                or entry.find("atom:link", ns)
                or entry.find("link")
            )
            pub_date_elem = (
                entry.find("atom:published", ns)
                or entry.find("atom:updated", ns)
                or entry.find("published")
                or entry.find("updated")
            )
            summary_elem = (
                entry.find("atom:summary", ns)
                or entry.find("atom:content", ns)
                or entry.find("summary")
                or entry.find("content")
            )
            id_elem = entry.find("atom:id", ns) or entry.find("id")
            author_elem = entry.find("atom:author/atom:name", ns) or entry.find(
                "author/name"
            )

            if title_elem is None or title_elem.text is None:
                continue

            # Get link URL
            link_url = ""
            if link_elem is not None:
                link_url = link_elem.get("href", "") or (
                    link_elem.text.strip() if link_elem.text else ""
                )

            # Parse publication date
            pub_date = datetime.now(timezone.utc)
            if pub_date_elem is not None and pub_date_elem.text:
                try:
                    pub_date = datetime.fromisoformat(
                        pub_date_elem.text.replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            items.append(
                {
                    "source_id": str(source.id),
                    "source_name": source.name,
                    "title": title_elem.text.strip(),
                    "link": link_url,
                    "published_at": pub_date,
                    "summary": (
                        summary_elem.text.strip()
                        if summary_elem is not None and summary_elem.text
                        else None
                    ),
                    "author": (
                        author_elem.text.strip()
                        if author_elem is not None and author_elem.text
                        else None
                    ),
                    "image_url": None,
                    "category": source.category,
                    "guid": (
                        id_elem.text.strip()
                        if id_elem is not None and id_elem.text
                        else link_url
                    ),
                }
            )

        return items

    async def fetch_all_news(
        self,
        category: Optional[str] = None,
        source_name: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> JewishNewsAggregatedResponse:
        """
        Fetch aggregated news from all active sources.

        Uses RSS feeds as primary source and supplements with web search
        for fresh content.
        """
        await self.initialize_sources()

        cache_key = f"jewish_news_all"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            # Fetch from all active sources in parallel
            sources = await JewishNewsSource.find({"is_active": True}).to_list()
            all_items: List[Dict[str, Any]] = []

            # Fetch all RSS sources concurrently
            tasks = [self.fetch_rss_feed(source) for source in sources]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error fetching source: {result}")
                    continue
                all_items.extend(result)

            # Supplement with web search for fresh content
            logger.info("Supplementing Jewish news with web search")
            try:
                web_headlines = await scrape_judaism_news()
                seen_urls = {item.get("link", "") for item in all_items}

                for headline in web_headlines:
                    if headline.url not in seen_urls:
                        all_items.append(
                            {
                                "source_id": "web_search",
                                "source_name": headline.source or "Web Search",
                                "title": headline.title,
                                "link": headline.url,
                                "published_at": headline.published_at
                                or headline.scraped_at,
                                "summary": headline.summary,
                                "author": None,
                                "image_url": headline.image_url,
                                "category": headline.category or "news",
                                "guid": headline.url,
                            }
                        )
                        seen_urls.add(headline.url)

                logger.info(f"Added {len(web_headlines)} items from web search")
            except Exception as e:
                logger.error(f"Web search supplement failed: {e}")

            # Sort by publication date (newest first)
            all_items.sort(
                key=lambda x: x.get("published_at", datetime.min), reverse=True
            )

            # Cache the combined results
            self._cache.set(cache_key, all_items)
            cached_items = all_items

        # Apply filters
        filtered_items = cached_items
        if category:
            filtered_items = [
                item for item in filtered_items if item.get("category") == category
            ]
        if source_name:
            filtered_items = [
                item
                for item in filtered_items
                if item.get("source_name") == source_name
            ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # Convert to response models
        response_items = [
            JewishNewsItemResponse(
                id=item.get("guid", ""),
                source_name=item.get("source_name", ""),
                title=item.get("title", ""),
                title_he=item.get("title_he"),
                link=item.get("link", ""),
                published_at=item.get("published_at", datetime.now(timezone.utc)),
                summary=item.get("summary"),
                summary_he=item.get("summary_he"),
                author=item.get("author"),
                image_url=item.get("image_url"),
                category=item.get("category", "news"),
                tags=item.get("tags", []),
            )
            for item in paginated_items
        ]

        # Get sources count
        sources = await JewishNewsSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.now(timezone.utc)

        return JewishNewsAggregatedResponse(
            items=response_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=sources,
            last_updated=last_updated,
        )

    async def get_news_by_category(
        self, category: str, page: int = 1, limit: int = 20
    ) -> JewishNewsAggregatedResponse:
        """Get news filtered by category."""
        return await self.fetch_all_news(category=category, page=page, limit=limit)

    async def get_news_by_source(
        self, source_name: str, page: int = 1, limit: int = 20
    ) -> JewishNewsAggregatedResponse:
        """Get news from a specific source."""
        return await self.fetch_all_news(
            source_name=source_name, page=page, limit=limit
        )

    def clear_cache(self) -> None:
        """Clear the news cache."""
        self._cache.clear()
        logger.info("Jewish news cache cleared")


# Global service instance
jewish_news_service = JewishNewsService()
