"""
Jerusalem Content Service - Aggregates Jerusalem-focused content from Israeli news.

Focuses on:
- Western Wall (Kotel) events and ceremonies
- IDF ceremonies at the Kotel
- Israel-Diaspora connection news
- Holy sites coverage

Uses existing news_scraper infrastructure with Jerusalem keyword filtering.
"""

import logging
import asyncio
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.models.jerusalem_content import (
    JerusalemContentSource,
    JerusalemContentItem,
    JerusalemContentCategory,
    JerusalemContentItemResponse,
    JerusalemContentSourceResponse,
    JerusalemContentAggregatedResponse,
    JerusalemFeaturedResponse,
)
from app.services.news_scraper import (
    scrape_ynet,
    scrape_walla,
    scrape_mako,
    HeadlineItem,
    HEADERS,
)

logger = logging.getLogger(__name__)


# Jerusalem keyword filters (English)
JERUSALEM_KEYWORDS_EN = {
    "locations": [
        "jerusalem",
        "kotel",
        "western wall",
        "old city",
        "temple mount",
        "city of david",
        "mount of olives",
        "har habayit",
    ],
    "ceremonies": [
        "idf ceremony",
        "swearing in",
        "graduation",
        "bar mitzvah",
        "bat mitzvah",
        "military ceremony",
        "soldiers kotel",
    ],
    "diaspora": [
        "diaspora",
        "aliyah",
        "birthright",
        "world jewry",
        "jewish world",
        "jews abroad",
        "olim",
        "nefesh b'nefesh",
    ],
    "holy_sites": [
        "cave of the patriarchs",
        "rachel's tomb",
        "machpela",
        "holy sites",
        "sacred places",
    ],
}

# Jerusalem keyword filters (Hebrew)
JERUSALEM_KEYWORDS_HE = {
    "locations": [
        "ירושלים",
        "כותל",
        "הכותל המערבי",
        "העיר העתיקה",
        "הר הבית",
        "עיר דוד",
        "הר הזיתים",
    ],
    "ceremonies": [
        "טקס צה\"ל",
        "טקס צהל",
        "השבעה",
        "גיוס",
        "בר מצווה",
        "בת מצווה",
        "טקס סיום",
        "חיילים בכותל",
    ],
    "diaspora": [
        "תפוצות",
        "עלייה",
        "תגלית",
        "יהדות העולם",
        "עולים",
        "נפש בנפש",
    ],
    "holy_sites": [
        "מערת המכפלה",
        "קבר רחל",
        "מקומות קדושים",
    ],
}

# Category labels for UI
JERUSALEM_CATEGORY_LABELS = {
    JerusalemContentCategory.KOTEL: {"he": "הכותל המערבי", "en": "Western Wall", "es": "Muro Occidental"},
    JerusalemContentCategory.IDF_CEREMONY: {"he": "טקסי צה\"ל", "en": "IDF Ceremonies", "es": "Ceremonias de las FDI"},
    JerusalemContentCategory.DIASPORA: {"he": "קשר לתפוצות", "en": "Diaspora Connection", "es": "Conexion con la Diaspora"},
    JerusalemContentCategory.HOLY_SITES: {"he": "מקומות קדושים", "en": "Holy Sites", "es": "Lugares Sagrados"},
    JerusalemContentCategory.JERUSALEM_EVENTS: {"he": "אירועים בירושלים", "en": "Jerusalem Events", "es": "Eventos en Jerusalen"},
    JerusalemContentCategory.GENERAL: {"he": "ירושלים", "en": "Jerusalem", "es": "Jerusalen"},
}


# Default Jerusalem news sources
DEFAULT_JERUSALEM_SOURCES = [
    {
        "name": "Ynet Jerusalem",
        "name_he": "ynet ירושלים",
        "website_url": "https://www.ynet.co.il/home/0,7340,L-4269,00.html",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Israel Hayom Jerusalem",
        "name_he": "ישראל היום ירושלים",
        "website_url": "https://www.israelhayom.co.il/tags/jerusalem",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Mako Jerusalem",
        "name_he": "mako ירושלים",
        "website_url": "https://www.mako.co.il/news",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Walla Jerusalem",
        "name_he": "וואלה ירושלים",
        "website_url": "https://news.walla.co.il",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Kan Jerusalem",
        "name_he": "כאן ירושלים",
        "website_url": "https://www.kan.org.il/news",
        "content_type": "news",
        "language": "he",
    },
]


class JerusalemContentCache:
    """In-memory cache for Jerusalem content with TTL support."""

    def __init__(self, ttl_minutes: int):
        self._cache: Dict[str, tuple[List[Dict[str, Any]], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.utcnow() - cached_at > self._ttl:
            del self._cache[key]
            return None

        return items

    def set(self, key: str, items: List[Dict[str, Any]]) -> None:
        """Cache items with current timestamp."""
        self._cache[key] = (items, datetime.utcnow())

    def clear(self) -> None:
        """Clear all cached items."""
        self._cache.clear()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """Get the timestamp when the cache was last updated."""
        if key in self._cache:
            return self._cache[key][1]
        return None


class JerusalemContentService:
    """Service for aggregating Jerusalem-focused news content."""

    def __init__(self):
        self._cache = JerusalemContentCache(
            ttl_minutes=settings.JERUSALEM_CONTENT_CACHE_TTL_MINUTES
        )
        self._sources_initialized = False

    async def initialize_sources(self) -> None:
        """Initialize default Jerusalem sources in the database if not present."""
        if self._sources_initialized:
            return

        try:
            for source_data in DEFAULT_JERUSALEM_SOURCES:
                existing = await JerusalemContentSource.find_one(
                    JerusalemContentSource.name == source_data["name"]
                )
                if not existing:
                    # Combine all keyword filters
                    all_keywords = []
                    for keyword_list in JERUSALEM_KEYWORDS_HE.values():
                        all_keywords.extend(keyword_list)
                    for keyword_list in JERUSALEM_KEYWORDS_EN.values():
                        all_keywords.extend(keyword_list)

                    source = JerusalemContentSource(
                        **source_data,
                        is_active=True,
                        keyword_filters=all_keywords,
                    )
                    await source.insert()
                    logger.info(f"Initialized Jerusalem source: {source_data['name']}")

            self._sources_initialized = True
            logger.info("Jerusalem content sources initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Jerusalem sources: {e}")

    def _calculate_relevance_score(
        self, title: str, summary: Optional[str] = None
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on Jerusalem keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {summary or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores = {
            JerusalemContentCategory.KOTEL: 0,
            JerusalemContentCategory.IDF_CEREMONY: 0,
            JerusalemContentCategory.DIASPORA: 0,
            JerusalemContentCategory.HOLY_SITES: 0,
            JerusalemContentCategory.JERUSALEM_EVENTS: 0,
        }

        # Check Hebrew keywords (higher weight for primary language)
        for category_key, keywords in JERUSALEM_KEYWORDS_HE.items():
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
                    score += 2.0  # Hebrew keywords worth more

                    # Map keyword category to content category
                    if category_key == "locations":
                        if "כותל" in keyword:
                            category_scores[JerusalemContentCategory.KOTEL] += 3
                        else:
                            category_scores[JerusalemContentCategory.JERUSALEM_EVENTS] += 1
                    elif category_key == "ceremonies":
                        category_scores[JerusalemContentCategory.IDF_CEREMONY] += 3
                    elif category_key == "diaspora":
                        category_scores[JerusalemContentCategory.DIASPORA] += 3
                    elif category_key == "holy_sites":
                        category_scores[JerusalemContentCategory.HOLY_SITES] += 3

        # Check English keywords
        for category_key, keywords in JERUSALEM_KEYWORDS_EN.items():
            for keyword in keywords:
                if keyword in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += 1.0

                    # Map keyword category to content category
                    if category_key == "locations":
                        if "kotel" in keyword or "western wall" in keyword:
                            category_scores[JerusalemContentCategory.KOTEL] += 2
                        else:
                            category_scores[JerusalemContentCategory.JERUSALEM_EVENTS] += 1
                    elif category_key == "ceremonies":
                        category_scores[JerusalemContentCategory.IDF_CEREMONY] += 2
                    elif category_key == "diaspora":
                        category_scores[JerusalemContentCategory.DIASPORA] += 2
                    elif category_key == "holy_sites":
                        category_scores[JerusalemContentCategory.HOLY_SITES] += 2

        # Determine primary category
        max_category = max(category_scores, key=category_scores.get)
        if category_scores[max_category] == 0:
            max_category = JerusalemContentCategory.GENERAL

        # Normalize score (0-10 scale)
        normalized_score = min(score / 5.0, 10.0)

        return normalized_score, matched_keywords, max_category

    def _filter_jerusalem_content(
        self, headlines: List[HeadlineItem]
    ) -> List[Dict[str, Any]]:
        """Filter headlines for Jerusalem-related content."""
        jerusalem_items = []

        for headline in headlines:
            score, matched_keywords, category = self._calculate_relevance_score(
                headline.title, headline.summary
            )

            if score >= settings.JERUSALEM_CONTENT_MIN_RELEVANCE_SCORE:
                jerusalem_items.append({
                    "source_name": headline.source,
                    "title": headline.title,
                    "title_he": headline.title,  # Hebrew source
                    "url": headline.url,
                    "published_at": headline.published_at or headline.scraped_at,
                    "summary": headline.summary,
                    "image_url": headline.image_url,
                    "category": category,
                    "tags": matched_keywords[:5],  # Top 5 keywords as tags
                    "relevance_score": score,
                    "matched_keywords": matched_keywords,
                })

        return jerusalem_items

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> JerusalemContentAggregatedResponse:
        """
        Fetch aggregated Jerusalem content from all sources.

        Uses caching to reduce scraping frequency.
        """
        await self.initialize_sources()

        cache_key = "jerusalem_content_all"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            # Fetch from all scrapers in parallel
            results = await asyncio.gather(
                scrape_ynet(),
                scrape_walla(),
                scrape_mako(),
                return_exceptions=True,
            )

            all_headlines: List[HeadlineItem] = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error scraping source: {result}")
                    continue
                all_headlines.extend(result)

            # Filter for Jerusalem content
            all_items = self._filter_jerusalem_content(all_headlines)

            # Sort by relevance score then publication date
            all_items.sort(
                key=lambda x: (x["relevance_score"], x.get("published_at", datetime.min)),
                reverse=True,
            )

            # Cache the results
            self._cache.set(cache_key, all_items)
            cached_items = all_items

        # Apply category filter
        filtered_items = cached_items
        if category:
            filtered_items = [
                item for item in filtered_items if item.get("category") == category
            ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # Convert to response models
        response_items = [
            JerusalemContentItemResponse(
                id=f"jrslm-{i + start_idx}",
                source_name=item.get("source_name", ""),
                title=item.get("title", ""),
                title_he=item.get("title_he"),
                title_en=item.get("title_en"),
                url=item.get("url", ""),
                published_at=item.get("published_at", datetime.utcnow()),
                summary=item.get("summary"),
                summary_he=item.get("summary_he"),
                summary_en=item.get("summary_en"),
                image_url=item.get("image_url"),
                category=item.get("category", JerusalemContentCategory.GENERAL),
                category_label=JERUSALEM_CATEGORY_LABELS.get(
                    item.get("category", JerusalemContentCategory.GENERAL),
                    JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.GENERAL],
                ),
                tags=item.get("tags", []),
                relevance_score=item.get("relevance_score", 0.0),
            )
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources = await JerusalemContentSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.utcnow()

        return JerusalemContentAggregatedResponse(
            items=response_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=sources,
            last_updated=last_updated,
            category=category,
        )

    async def get_featured_content(self) -> JerusalemFeaturedResponse:
        """Get featured Jerusalem content for hero section."""
        content = await self.fetch_all_content(limit=6)

        return JerusalemFeaturedResponse(
            featured=content.items[:6],
            kotel_live={
                "name": "Western Wall Live",
                "name_he": "שידור חי מהכותל",
                "url": "https://www.kotel.org/en/kotel-live",
                "icon": "🕎",
            },
            upcoming_ceremonies=[],
            last_updated=content.last_updated,
        )

    async def get_kotel_content(
        self, page: int = 1, limit: int = 20
    ) -> JerusalemContentAggregatedResponse:
        """Get content specifically about the Western Wall."""
        return await self.fetch_all_content(
            category=JerusalemContentCategory.KOTEL, page=page, limit=limit
        )

    async def get_idf_ceremonies(
        self, page: int = 1, limit: int = 20
    ) -> JerusalemContentAggregatedResponse:
        """Get IDF ceremony news."""
        return await self.fetch_all_content(
            category=JerusalemContentCategory.IDF_CEREMONY, page=page, limit=limit
        )

    async def get_diaspora_connection(
        self, page: int = 1, limit: int = 20
    ) -> JerusalemContentAggregatedResponse:
        """Get diaspora connection news."""
        return await self.fetch_all_content(
            category=JerusalemContentCategory.DIASPORA, page=page, limit=limit
        )

    async def get_sources(
        self, active_only: bool = True
    ) -> List[JerusalemContentSourceResponse]:
        """Get list of available Jerusalem content sources."""
        await self.initialize_sources()

        query = {"is_active": True} if active_only else {}
        sources = await JerusalemContentSource.find(query).to_list()

        return [
            JerusalemContentSourceResponse(
                id=str(source.id),
                name=source.name,
                name_he=source.name_he,
                website_url=source.website_url,
                content_type=source.content_type,
                language=source.language,
                is_active=source.is_active,
            )
            for source in sources
        ]

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get available Jerusalem content categories."""
        return [
            {
                "id": category_id,
                "name": labels["en"],
                "name_he": labels["he"],
                "name_es": labels.get("es", labels["en"]),
                "icon": icon,
            }
            for category_id, labels, icon in [
                (JerusalemContentCategory.KOTEL, JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.KOTEL], "🕎"),
                (JerusalemContentCategory.IDF_CEREMONY, JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.IDF_CEREMONY], "🎖️"),
                (JerusalemContentCategory.DIASPORA, JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.DIASPORA], "🌍"),
                (JerusalemContentCategory.HOLY_SITES, JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.HOLY_SITES], "✡️"),
                (JerusalemContentCategory.JERUSALEM_EVENTS, JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.JERUSALEM_EVENTS], "🇮🇱"),
            ]
        ]

    def clear_cache(self) -> None:
        """Clear the content cache."""
        self._cache.clear()
        logger.info("Jerusalem content cache cleared")


# Global service instance
jerusalem_content_service = JerusalemContentService()
