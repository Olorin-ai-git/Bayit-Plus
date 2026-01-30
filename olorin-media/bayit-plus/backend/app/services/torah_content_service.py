"""
Torah Content Service - Aggregates Torah shiurim from public RSS sources.

Supports:
- YU Torah
- TorahAnytime
- Chabad Multimedia
"""

import asyncio
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TorahShiur:
    """A single Torah shiur/class."""

    id: str
    title: str
    title_he: Optional[str]
    description: Optional[str]
    rabbi: Optional[str]
    rabbi_he: Optional[str]
    category: str
    source: str
    duration: Optional[str]
    published_at: datetime
    audio_url: Optional[str]
    video_url: Optional[str]
    image_url: Optional[str]
    link: str


# Torah content RSS sources - using working public feeds
TORAH_RSS_SOURCES = [
    {
        "name": "TorahAnytime Lessons",
        "name_he": "שיעורי TorahAnytime",
        "rss_url": "https://feeds.transistor.fm/torah-anytime-lessons",
        "source_id": "torahanytime",
        "category": "shiurim",
    },
    {
        "name": "TorahWeb Live Events",
        "name_he": "אירועי TorahWeb",
        "rss_url": "https://media.rss.com/torahweb-live-events/feed.xml",
        "source_id": "torahweb",
        "category": "shiurim",
    },
    {
        "name": "Torah Cafe",
        "name_he": "Torah Cafe",
        "rss_url": "https://www.torahcafe.com/rss.php",
        "source_id": "torahcafe",
        "category": "shiurim",
    },
]


class TorahCache:
    """In-memory cache for Torah content with TTL support."""

    def __init__(self, ttl_minutes: int = 30):
        self._cache: Dict[str, tuple[List[TorahShiur], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[TorahShiur]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.now(timezone.utc) - cached_at > self._ttl:
            del self._cache[key]
            return None

        return items

    def set(self, key: str, items: List[TorahShiur]) -> None:
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


class TorahContentService:
    """Service for aggregating Torah content from RSS sources."""

    def __init__(self):
        self._cache = TorahCache(ttl_minutes=30)

    async def fetch_rss_feed(self, source: Dict[str, str]) -> List[TorahShiur]:
        """Fetch and parse RSS feed from a Torah content source."""
        items: List[TorahShiur] = []
        rss_url = source.get("rss_url", "")

        if not rss_url:
            logger.warning(f"No RSS URL for source: {source.get('name')}")
            return items

        try:
            async with httpx.AsyncClient(
                timeout=settings.JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS
            ) as client:
                response = await client.get(
                    rss_url,
                    headers={"User-Agent": "Bayit+ Torah Content/1.0"},
                    follow_redirects=True,
                )
                response.raise_for_status()

                # Parse RSS XML
                root = ET.fromstring(response.content)

                # Handle RSS 2.0 format
                channel = root.find("channel")
                if channel is not None:
                    items = self._parse_rss_items(channel, source)

                logger.info(f"Fetched {len(items)} shiurim from {source.get('name')}")

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {source.get('name')}: {e}")
        except ET.ParseError as e:
            logger.error(f"XML parse error for {source.get('name')}: {e}")
        except Exception as e:
            logger.error(f"Error fetching {source.get('name')}: {e}", exc_info=True)

        return items

    def _parse_rss_items(
        self, channel: ET.Element, source: Dict[str, str]
    ) -> List[TorahShiur]:
        """Parse RSS 2.0 channel items for Torah content."""
        items = []
        source_id = source.get("source_id", "")
        source_name = source.get("name", "")
        category = source.get("category", "shiurim")

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
            pub_date = datetime.now(timezone.utc)
            if pub_date_elem is not None and pub_date_elem.text:
                try:
                    pub_date = parsedate_to_datetime(pub_date_elem.text)
                except Exception:
                    pass

            # Extract media URLs
            audio_url = None
            video_url = None
            image_url = None
            duration = None

            # Check enclosure
            enclosure = item.find("enclosure")
            if enclosure is not None:
                enc_type = enclosure.get("type", "")
                enc_url = enclosure.get("url", "")
                if enc_type.startswith("audio/"):
                    audio_url = enc_url
                elif enc_type.startswith("video/"):
                    video_url = enc_url
                elif enc_type.startswith("image/"):
                    image_url = enc_url

            # Check media:content
            for ns_prefix in ["media", "{http://search.yahoo.com/mrss/}"]:
                media_content = (
                    item.find(f"{ns_prefix}content")
                    if ns_prefix.startswith("{")
                    else item.find("{http://search.yahoo.com/mrss/}content")
                )
                if media_content is not None:
                    media_type = media_content.get(
                        "medium", media_content.get("type", "")
                    )
                    media_url = media_content.get("url", "")
                    if "audio" in media_type and not audio_url:
                        audio_url = media_url
                    elif "video" in media_type and not video_url:
                        video_url = media_url
                    elif "image" in media_type and not image_url:
                        image_url = media_url

                    # Get duration
                    if not duration:
                        duration = media_content.get("duration")

            # Check iTunes duration
            itunes_duration = item.find(
                "{http://www.itunes.org/dtds/podcast-1.0.dtd}duration"
            )
            if itunes_duration is not None and itunes_duration.text:
                duration = itunes_duration.text

            # Get image from iTunes
            itunes_image = item.find(
                "{http://www.itunes.org/dtds/podcast-1.0.dtd}image"
            )
            if itunes_image is not None and not image_url:
                image_url = itunes_image.get("href")

            # Generate unique ID
            item_id = (
                guid_elem.text.strip()
                if guid_elem is not None and guid_elem.text
                else (
                    link_elem.text.strip()
                    if link_elem is not None and link_elem.text
                    else f"{source_id}_{hash(title_elem.text)}"
                )
            )

            shiur = TorahShiur(
                id=item_id,
                title=title_elem.text.strip(),
                title_he=None,  # Could add translation
                description=(
                    desc_elem.text.strip()
                    if desc_elem is not None and desc_elem.text
                    else None
                ),
                rabbi=(
                    author_elem.text.strip()
                    if author_elem is not None and author_elem.text
                    else None
                ),
                rabbi_he=None,
                category=category,
                source=source_name,
                duration=duration,
                published_at=pub_date,
                audio_url=audio_url,
                video_url=video_url,
                image_url=image_url,
                link=(
                    link_elem.text.strip()
                    if link_elem is not None and link_elem.text
                    else ""
                ),
            )
            items.append(shiur)

        return items

    async def get_shiurim(
        self,
        category: Optional[str] = None,
        rabbi: Optional[str] = None,
        source: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Get aggregated Torah shiurim from all sources.

        Uses caching to reduce RSS feed calls.
        """
        cache_key = "torah_shiurim_all"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            # Fetch from all sources in parallel
            all_items: List[TorahShiur] = []

            tasks = [self.fetch_rss_feed(src) for src in TORAH_RSS_SOURCES]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error fetching Torah source: {result}")
                    continue
                all_items.extend(result)

            # Sort by publication date (newest first)
            all_items.sort(key=lambda x: x.published_at, reverse=True)

            # Cache the combined results
            self._cache.set(cache_key, all_items)
            cached_items = all_items

        # Apply filters
        filtered_items = cached_items

        if category:
            filtered_items = [
                item
                for item in filtered_items
                if item.category.lower() == category.lower()
            ]

        if rabbi:
            rabbi_lower = rabbi.lower()
            filtered_items = [
                item
                for item in filtered_items
                if item.rabbi and rabbi_lower in item.rabbi.lower()
            ]

        if source:
            source_lower = source.lower()
            filtered_items = [
                item for item in filtered_items if source_lower in item.source.lower()
            ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # Convert to dict for JSON response
        response_items = [
            {
                "id": item.id,
                "title": item.title,
                "title_he": item.title_he,
                "description": item.description,
                "rabbi": item.rabbi,
                "rabbi_he": item.rabbi_he,
                "category": item.category,
                "source": item.source,
                "duration": item.duration,
                "published_at": item.published_at.isoformat(),
                "audio_url": item.audio_url,
                "video_url": item.video_url,
                "image_url": item.image_url,
                "link": item.link,
            }
            for item in paginated_items
        ]

        last_updated = self._cache.get_last_updated(cache_key)

        return {
            "shiurim": response_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            "sources": [src.get("name") for src in TORAH_RSS_SOURCES],
            "last_updated": last_updated.isoformat() if last_updated else None,
        }

    async def get_daily_shiur(self) -> Optional[Dict[str, Any]]:
        """
        Get a daily Torah shiur recommendation.

        Picks a recent shiur from the aggregated content.
        """
        result = await self.get_shiurim(page=1, limit=10)
        shiurim = result.get("shiurim", [])

        if not shiurim:
            return None

        # Return the most recent shiur as the daily recommendation
        daily = shiurim[0]
        return {
            "daily_shiur": daily,
            "message": "Today's recommended shiur",
        }

    async def get_live_shiurim(self) -> List[Dict[str, Any]]:
        """
        Get currently live Torah classes.

        This would require integration with live streaming platforms.
        Currently returns an empty list as a placeholder for future implementation.
        """
        # Future: Integrate with TorahAnytime live, YU Torah live, etc.
        return []

    def clear_cache(self) -> None:
        """Clear the Torah content cache."""
        self._cache.clear()
        logger.info("Torah content cache cleared")


# Global service instance
torah_content_service = TorahContentService()
