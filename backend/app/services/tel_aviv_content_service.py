"""
Tel Aviv Content Service - Aggregates Tel Aviv-focused content from Israeli news.

Focuses on:
- Beaches and promenade (Tayelet)
- Nightlife and entertainment (Rothschild, Florentin)
- Culture and art (Bauhaus, White City, museums)
- Music scene (concerts, festivals)
- Food and dining (Carmel Market, Sarona)
- Tech and startups
- Events and festivals (Pride Parade, etc.)

Uses existing news_scraper infrastructure with Tel Aviv keyword filtering.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.tel_aviv_content import (TelAvivContentAggregatedResponse,
                                         TelAvivContentCategory,
                                         TelAvivContentItem,
                                         TelAvivContentItemResponse,
                                         TelAvivContentSource,
                                         TelAvivContentSourceResponse,
                                         TelAvivFeaturedResponse)
from app.services.news_scraper import (HeadlineItem, scrape_mako,
                                       scrape_tel_aviv_news, scrape_walla,
                                       scrape_ynet)

logger = logging.getLogger(__name__)


# Tel Aviv keyword filters (Hebrew)
TEL_AVIV_KEYWORDS_HE = {
    "beaches": [
        "תל אביב חוף",
        "חוף גורדון",
        "חוף הילטון",
        "חוף פרישמן",
        "טיילת",
        "ים תל אביב",
        "חוף הים",
        "חוף בננה",
        "חוף מציצים",
    ],
    "nightlife": [
        "רוטשילד",
        "פלורנטין",
        "ברים תל אביב",
        "מועדונים",
        "חיי לילה",
        "לילה תל אביב",
        "פאבים",
        "דיזנגוף",
    ],
    "culture": [
        "מוזיאון תל אביב",
        "גלריות",
        "באוהאוס",
        "העיר הלבנה",
        "תיאטרון",
        "הבימה",
        "בית אריאלה",
        "בית התפוצות",
        "אמנות",
    ],
    "music": [
        "הופעות תל אביב",
        "פסטיבל",
        "ברבי",
        "רידינג 3",
        "זאפה",
        "מוסיקה חיה",
        "קונצרט",
        "הפארק",
    ],
    "food": [
        "שוק הכרמל",
        "שרונה",
        "מסעדות תל אביב",
        "בתי קפה",
        "אוכל רחוב",
        "שוק לוינסקי",
        "נמל תל אביב",
    ],
    "tech": [
        "סטארטאפ",
        "הייטק",
        "רוטשילד בוליבארד",
        "יזמות",
        "חברות טכנולוגיה",
        "תעשיית ההייטק",
    ],
    "events": [
        "אירועים תל אביב",
        "פסטיבל תל אביב",
        "מצעד הגאווה",
        "פריד",
        "תל אביב לבן",
        "לילה לבן",
    ],
}

# Tel Aviv keyword filters (English)
TEL_AVIV_KEYWORDS_EN = {
    "beaches": [
        "tel aviv beach",
        "gordon beach",
        "hilton beach",
        "frishman beach",
        "promenade",
        "tayelet",
        "banana beach",
        "metzitzim beach",
    ],
    "nightlife": [
        "rothschild",
        "florentin",
        "bars tel aviv",
        "clubs",
        "rooftop",
        "party",
        "nightlife",
        "dizengoff",
    ],
    "culture": [
        "tel aviv museum",
        "galleries",
        "bauhaus",
        "white city",
        "theater",
        "habima",
        "art scene",
        "beit ariela",
    ],
    "music": [
        "concert tel aviv",
        "festival",
        "barby club",
        "reading 3",
        "zappa",
        "live music",
        "hayarkon park",
    ],
    "food": [
        "carmel market",
        "sarona market",
        "restaurant tel aviv",
        "cafe",
        "street food",
        "levinsky market",
        "tel aviv port",
    ],
    "tech": [
        "startup",
        "high-tech",
        "startup nation",
        "innovation",
        "entrepreneur",
        "tech companies",
    ],
    "events": [
        "tel aviv events",
        "pride parade",
        "white night",
        "city festival",
        "tlv events",
    ],
}

# Category labels for UI
TEL_AVIV_CATEGORY_LABELS = {
    TelAvivContentCategory.BEACHES: {"he": "חופים", "en": "Beaches", "es": "Playas"},
    TelAvivContentCategory.NIGHTLIFE: {
        "he": "חיי לילה",
        "en": "Nightlife",
        "es": "Vida Nocturna",
    },
    TelAvivContentCategory.CULTURE: {
        "he": "תרבות ואמנות",
        "en": "Culture & Art",
        "es": "Cultura y Arte",
    },
    TelAvivContentCategory.MUSIC: {
        "he": "מוזיקה",
        "en": "Music Scene",
        "es": "Escena Musical",
    },
    TelAvivContentCategory.FOOD: {
        "he": "אוכל ומסעדות",
        "en": "Food & Dining",
        "es": "Gastronomia",
    },
    TelAvivContentCategory.TECH: {
        "he": "סטארטאפים והייטק",
        "en": "Tech & Startups",
        "es": "Tecnologia",
    },
    TelAvivContentCategory.EVENTS: {"he": "אירועים", "en": "Events", "es": "Eventos"},
    TelAvivContentCategory.GENERAL: {
        "he": "תל אביב",
        "en": "Tel Aviv",
        "es": "Tel Aviv",
    },
}


# Default Tel Aviv news sources
DEFAULT_TEL_AVIV_SOURCES = [
    {
        "name": "Ynet Tel Aviv",
        "name_he": "ynet תל אביב",
        "website_url": "https://www.ynet.co.il/home/0,7340,L-4269,00.html",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Time Out Tel Aviv",
        "name_he": "טיים אאוט תל אביב",
        "website_url": "https://www.timeout.co.il/tel-aviv",
        "content_type": "lifestyle",
        "language": "he",
    },
    {
        "name": "Mako Tel Aviv",
        "name_he": "mako תל אביב",
        "website_url": "https://www.mako.co.il/news",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Walla Tel Aviv",
        "name_he": "וואלה תל אביב",
        "website_url": "https://news.walla.co.il",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Geektime",
        "name_he": "גיקטיים",
        "website_url": "https://www.geektime.co.il",
        "content_type": "tech",
        "language": "he",
    },
]

# Seed content - always available when no scraped content found
SEED_TEL_AVIV_CONTENT = [
    {
        "source_name": "Tel Aviv Municipality",
        "title": "חופי תל אביב - נופש וים",
        "title_he": "חופי תל אביב - נופש וים",
        "title_en": "Tel Aviv Beaches - Sun and Sea",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "חופי תל אביב מציעים חוויית רחצה מושלמת עם שמש, חול וים תכלת",
        "summary_he": "חופי תל אביב מציעים חוויית רחצה מושלמת",
        "summary_en": "Tel Aviv beaches offer a perfect swimming experience",
        "image_url": None,
        "category": TelAvivContentCategory.BEACHES,
        "tags": ["חוף", "תל אביב", "ים"],
        "relevance_score": 10.0,
    },
    {
        "source_name": "Tel Aviv Nightlife",
        "title": "חיי הלילה של תל אביב - העיר שלא ישנה",
        "title_he": "חיי הלילה של תל אביב - העיר שלא ישנה",
        "title_en": "Tel Aviv Nightlife - The City That Never Sleeps",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב מציעה חיי לילה תוססים עם ברים, מועדונים והופעות חיות",
        "summary_he": "תל אביב מציעה חיי לילה תוססים",
        "summary_en": "Tel Aviv offers vibrant nightlife with bars and clubs",
        "image_url": None,
        "category": TelAvivContentCategory.NIGHTLIFE,
        "tags": ["לילה", "ברים", "מועדונים"],
        "relevance_score": 9.5,
    },
    {
        "source_name": "Tel Aviv Culture",
        "title": "העיר הלבנה - אדריכלות באוהאוס בתל אביב",
        "title_he": "העיר הלבנה - אדריכלות באוהאוס בתל אביב",
        "title_en": "The White City - Bauhaus Architecture in Tel Aviv",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב מוכרת כאתר מורשת עולמית בזכות אוסף מבני הבאוהאוס הגדול בעולם",
        "summary_he": "תל אביב מוכרת כאתר מורשת עולמית בזכות הבאוהאוס",
        "summary_en": "Tel Aviv is a UNESCO World Heritage Site for Bauhaus architecture",
        "image_url": None,
        "category": TelAvivContentCategory.CULTURE,
        "tags": ["באוהאוס", "תרבות", "אדריכלות"],
        "relevance_score": 9.0,
    },
    {
        "source_name": "Tel Aviv Music",
        "title": "הופעות ופסטיבלים בתל אביב",
        "title_he": "הופעות ופסטיבלים בתל אביב",
        "title_en": "Concerts and Festivals in Tel Aviv",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב היא מרכז המוסיקה של ישראל עם מועדונים, במות והופעות חיות",
        "summary_he": "תל אביב היא מרכז המוסיקה של ישראל",
        "summary_en": "Tel Aviv is Israel's music hub with venues and live shows",
        "image_url": None,
        "category": TelAvivContentCategory.MUSIC,
        "tags": ["מוסיקה", "הופעות", "פסטיבל"],
        "relevance_score": 8.5,
    },
    {
        "source_name": "Startup Nation",
        "title": "תל אביב - עיר הסטארטאפים",
        "title_he": "תל אביב - עיר הסטארטאפים",
        "title_en": "Tel Aviv - The Startup City",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב היא אחת מערי ההייטק המובילות בעולם עם אלפי סטארטאפים",
        "summary_he": "תל אביב היא אחת מערי ההייטק המובילות בעולם",
        "summary_en": "Tel Aviv is a leading tech hub with thousands of startups",
        "image_url": None,
        "category": TelAvivContentCategory.TECH,
        "tags": ["סטארטאפ", "הייטק", "יזמות"],
        "relevance_score": 8.0,
    },
]


class TelAvivContentCache:
    """In-memory cache for Tel Aviv content with TTL support."""

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


class TelAvivContentService:
    """Service for aggregating Tel Aviv-focused news content."""

    def __init__(self):
        self._cache = TelAvivContentCache(
            ttl_minutes=settings.TEL_AVIV_CONTENT_CACHE_TTL_MINUTES
        )
        self._sources_initialized = False

    async def initialize_sources(self) -> None:
        """Initialize default Tel Aviv sources in the database if not present."""
        if self._sources_initialized:
            return

        try:
            for source_data in DEFAULT_TEL_AVIV_SOURCES:
                existing = await TelAvivContentSource.find_one(
                    TelAvivContentSource.name == source_data["name"]
                )
                if not existing:
                    # Combine all keyword filters
                    all_keywords = []
                    for keyword_list in TEL_AVIV_KEYWORDS_HE.values():
                        all_keywords.extend(keyword_list)
                    for keyword_list in TEL_AVIV_KEYWORDS_EN.values():
                        all_keywords.extend(keyword_list)

                    source = TelAvivContentSource(
                        **source_data,
                        is_active=True,
                        keyword_filters=all_keywords,
                    )
                    await source.insert()
                    logger.info(f"Initialized Tel Aviv source: {source_data['name']}")

            self._sources_initialized = True
            logger.info("Tel Aviv content sources initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Tel Aviv sources: {e}")

    def _calculate_relevance_score(
        self, title: str, summary: Optional[str] = None
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on Tel Aviv keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {summary or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores = {
            TelAvivContentCategory.BEACHES: 0,
            TelAvivContentCategory.NIGHTLIFE: 0,
            TelAvivContentCategory.CULTURE: 0,
            TelAvivContentCategory.MUSIC: 0,
            TelAvivContentCategory.FOOD: 0,
            TelAvivContentCategory.TECH: 0,
            TelAvivContentCategory.EVENTS: 0,
        }

        # Check Hebrew keywords (higher weight for primary language)
        for category_key, keywords in TEL_AVIV_KEYWORDS_HE.items():
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
                    score += 2.0  # Hebrew keywords worth more

                    # Map keyword category to content category
                    if category_key == "beaches":
                        category_scores[TelAvivContentCategory.BEACHES] += 3
                    elif category_key == "nightlife":
                        category_scores[TelAvivContentCategory.NIGHTLIFE] += 3
                    elif category_key == "culture":
                        category_scores[TelAvivContentCategory.CULTURE] += 3
                    elif category_key == "music":
                        category_scores[TelAvivContentCategory.MUSIC] += 3
                    elif category_key == "food":
                        category_scores[TelAvivContentCategory.FOOD] += 3
                    elif category_key == "tech":
                        category_scores[TelAvivContentCategory.TECH] += 3
                    elif category_key == "events":
                        category_scores[TelAvivContentCategory.EVENTS] += 3

        # Check English keywords
        for category_key, keywords in TEL_AVIV_KEYWORDS_EN.items():
            for keyword in keywords:
                if keyword in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += 1.0

                    # Map keyword category to content category
                    if category_key == "beaches":
                        category_scores[TelAvivContentCategory.BEACHES] += 2
                    elif category_key == "nightlife":
                        category_scores[TelAvivContentCategory.NIGHTLIFE] += 2
                    elif category_key == "culture":
                        category_scores[TelAvivContentCategory.CULTURE] += 2
                    elif category_key == "music":
                        category_scores[TelAvivContentCategory.MUSIC] += 2
                    elif category_key == "food":
                        category_scores[TelAvivContentCategory.FOOD] += 2
                    elif category_key == "tech":
                        category_scores[TelAvivContentCategory.TECH] += 2
                    elif category_key == "events":
                        category_scores[TelAvivContentCategory.EVENTS] += 2

        # Determine primary category
        max_category = max(category_scores, key=category_scores.get)
        if category_scores[max_category] == 0:
            max_category = TelAvivContentCategory.GENERAL

        # Normalize score (0-10 scale)
        normalized_score = min(score / 5.0, 10.0)

        return normalized_score, matched_keywords, max_category

    def _categorize_content(self, title: str, summary: Optional[str] = None) -> str:
        """Categorize content based on title and summary keywords."""
        text = f"{title} {summary or ''}".lower()

        # Check for beaches
        beach_keywords = ["חוף", "beach", "ים", "sea", "טיילת", "promenade"]
        if any(kw in text for kw in beach_keywords):
            return TelAvivContentCategory.BEACHES

        # Check for nightlife
        nightlife_keywords = [
            "לילה",
            "nightlife",
            "בר",
            "bar",
            "מועדון",
            "club",
            "רוטשילד",
            "פלורנטין",
        ]
        if any(kw in text for kw in nightlife_keywords):
            return TelAvivContentCategory.NIGHTLIFE

        # Check for culture
        culture_keywords = [
            "מוזיאון",
            "museum",
            "גלריה",
            "gallery",
            "תיאטרון",
            "theater",
            "אמנות",
            "art",
            "באוהאוס",
        ]
        if any(kw in text for kw in culture_keywords):
            return TelAvivContentCategory.CULTURE

        # Check for music
        music_keywords = [
            "הופעה",
            "concert",
            "מוסיקה",
            "music",
            "פסטיבל",
            "festival",
            "זמר",
        ]
        if any(kw in text for kw in music_keywords):
            return TelAvivContentCategory.MUSIC

        # Check for food
        food_keywords = [
            "מסעדה",
            "restaurant",
            "אוכל",
            "food",
            "שוק",
            "market",
            "בית קפה",
            "cafe",
        ]
        if any(kw in text for kw in food_keywords):
            return TelAvivContentCategory.FOOD

        # Check for tech
        tech_keywords = ["סטארטאפ", "startup", "הייטק", "tech", "יזמות", "entrepreneur"]
        if any(kw in text for kw in tech_keywords):
            return TelAvivContentCategory.TECH

        # Check for events
        event_keywords = ["אירוע", "event", "פריד", "pride", "לילה לבן"]
        if any(kw in text for kw in event_keywords):
            return TelAvivContentCategory.EVENTS

        return TelAvivContentCategory.GENERAL

    def _extract_tags(self, title: str, summary: Optional[str] = None) -> List[str]:
        """Extract relevant tags from content."""
        text = f"{title} {summary or ''}".lower()
        tags = []

        # Hebrew tags
        if "תל אביב" in text:
            tags.append("תל אביב")
        if "חוף" in text:
            tags.append("חוף")
        if "לילה" in text or "בר" in text:
            tags.append("חיי לילה")
        if "מוסיקה" in text or "הופעה" in text:
            tags.append("מוסיקה")
        if "אוכל" in text or "מסעדה" in text:
            tags.append("אוכל")
        if "סטארטאפ" in text or "הייטק" in text:
            tags.append("הייטק")
        if "תרבות" in text or "אמנות" in text:
            tags.append("תרבות")

        # English tags
        if "tel aviv" in text and "תל אביב" not in tags:
            tags.append("Tel Aviv")

        # Default tags if none found
        if not tags:
            tags = ["תל אביב", "חדשות"]

        return tags[:5]

    def _filter_tel_aviv_content(
        self, headlines: List[HeadlineItem]
    ) -> List[Dict[str, Any]]:
        """Filter headlines for Tel Aviv-related content."""
        tel_aviv_items = []

        for headline in headlines:
            score, matched_keywords, category = self._calculate_relevance_score(
                headline.title, headline.summary
            )

            if score >= settings.TEL_AVIV_CONTENT_MIN_RELEVANCE_SCORE:
                tel_aviv_items.append(
                    {
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
                    }
                )

        return tel_aviv_items

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> TelAvivContentAggregatedResponse:
        """
        Fetch aggregated Tel Aviv content from all sources.

        Uses web search as PRIMARY source for fresh location-specific content,
        then supplements with keyword-filtered general news.
        """
        await self.initialize_sources()

        cache_key = "tel_aviv_content_all"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # PRIMARY: Use web search for fresh Tel Aviv-specific news
            logger.info("Fetching fresh Tel Aviv content via web search")
            try:
                search_headlines = await scrape_tel_aviv_news()
                if search_headlines:
                    for h in search_headlines:
                        # Categorize based on title/summary content
                        item_category = self._categorize_content(h.title, h.summary)
                        all_items.append(
                            {
                                "source_name": h.source,
                                "title": h.title,
                                "title_he": h.title,
                                "url": h.url,
                                "published_at": h.published_at or h.scraped_at,
                                "summary": h.summary,
                                "image_url": h.image_url,
                                "category": item_category,
                                "tags": self._extract_tags(h.title, h.summary),
                                "relevance_score": 8.0,
                            }
                        )
                    logger.info(f"Web search found {len(all_items)} Tel Aviv items")
            except Exception as e:
                logger.error(f"Web search failed: {e}")

            # SECONDARY: Supplement with keyword-filtered general news
            if len(all_items) < 10:
                logger.info("Supplementing with keyword-filtered news")
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

                # Filter for Tel Aviv content
                filtered_items = self._filter_tel_aviv_content(all_headlines)

                # Add unique items
                existing_urls = {item["url"] for item in all_items}
                for item in filtered_items:
                    if item["url"] not in existing_urls:
                        all_items.append(item)
                        existing_urls.add(item["url"])

            # Sort by relevance score then publication date
            all_items.sort(
                key=lambda x: (
                    x["relevance_score"],
                    x.get("published_at", datetime.min),
                ),
                reverse=True,
            )

            # Only update cache if we found content - never replace with empty
            if all_items:
                self._cache.set(cache_key, all_items)
                cached_items = all_items
            else:
                # Try to get stale cache (ignore TTL) if no new content found
                stale_items = self._cache._cache.get(cache_key)
                if stale_items:
                    cached_items = stale_items[
                        0
                    ]  # Get items from tuple (items, timestamp)
                    logger.warning("No new Tel Aviv content found, using stale cache")
                else:
                    # Use seed content as fallback - content must always be available
                    cached_items = SEED_TEL_AVIV_CONTENT
                    self._cache.set(cache_key, cached_items)
                    logger.info("Using seed Tel Aviv content as fallback")

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
            TelAvivContentItemResponse(
                id=f"tlv-{i + start_idx}",
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
                category=item.get("category", TelAvivContentCategory.GENERAL),
                category_label=TEL_AVIV_CATEGORY_LABELS.get(
                    item.get("category", TelAvivContentCategory.GENERAL),
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.GENERAL],
                ),
                tags=item.get("tags", []),
                relevance_score=item.get("relevance_score", 0.0),
            )
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources = await TelAvivContentSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.utcnow()

        return TelAvivContentAggregatedResponse(
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

    async def get_featured_content(self) -> TelAvivFeaturedResponse:
        """Get featured Tel Aviv content for hero section."""
        content = await self.fetch_all_content(limit=6)

        return TelAvivFeaturedResponse(
            featured=content.items[:6],
            beach_webcam={
                "name": "Tel Aviv Beach Live",
                "name_he": "חוף תל אביב בשידור חי",
                "url": "https://www.skylinewebcams.com/en/webcam/israel/tel-aviv-district/tel-aviv/tel-aviv-beach.html",
                "icon": "🏖️",
            },
            upcoming_events=[],
            last_updated=content.last_updated,
        )

    async def get_beaches_content(
        self, page: int = 1, limit: int = 20
    ) -> TelAvivContentAggregatedResponse:
        """Get content specifically about Tel Aviv beaches."""
        return await self.fetch_all_content(
            category=TelAvivContentCategory.BEACHES, page=page, limit=limit
        )

    async def get_nightlife_content(
        self, page: int = 1, limit: int = 20
    ) -> TelAvivContentAggregatedResponse:
        """Get nightlife and entertainment content."""
        return await self.fetch_all_content(
            category=TelAvivContentCategory.NIGHTLIFE, page=page, limit=limit
        )

    async def get_culture_content(
        self, page: int = 1, limit: int = 20
    ) -> TelAvivContentAggregatedResponse:
        """Get culture and art content."""
        return await self.fetch_all_content(
            category=TelAvivContentCategory.CULTURE, page=page, limit=limit
        )

    async def get_music_content(
        self, page: int = 1, limit: int = 20
    ) -> TelAvivContentAggregatedResponse:
        """Get music scene content."""
        return await self.fetch_all_content(
            category=TelAvivContentCategory.MUSIC, page=page, limit=limit
        )

    async def get_sources(
        self, active_only: bool = True
    ) -> List[TelAvivContentSourceResponse]:
        """Get list of available Tel Aviv content sources."""
        await self.initialize_sources()

        query = {"is_active": True} if active_only else {}
        sources = await TelAvivContentSource.find(query).to_list()

        return [
            TelAvivContentSourceResponse(
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
        """Get available Tel Aviv content categories."""
        return [
            {
                "id": category_id,
                "name": labels["en"],
                "name_he": labels["he"],
                "name_es": labels.get("es", labels["en"]),
                "icon": icon,
            }
            for category_id, labels, icon in [
                (
                    TelAvivContentCategory.BEACHES,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.BEACHES],
                    "🏖️",
                ),
                (
                    TelAvivContentCategory.NIGHTLIFE,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.NIGHTLIFE],
                    "🌃",
                ),
                (
                    TelAvivContentCategory.CULTURE,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.CULTURE],
                    "🎭",
                ),
                (
                    TelAvivContentCategory.MUSIC,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.MUSIC],
                    "🎵",
                ),
                (
                    TelAvivContentCategory.FOOD,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.FOOD],
                    "🍽️",
                ),
                (
                    TelAvivContentCategory.TECH,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.TECH],
                    "💻",
                ),
                (
                    TelAvivContentCategory.EVENTS,
                    TEL_AVIV_CATEGORY_LABELS[TelAvivContentCategory.EVENTS],
                    "🎉",
                ),
            ]
        ]

    def clear_cache(self) -> None:
        """Clear the content cache."""
        self._cache.clear()
        logger.info("Tel Aviv content cache cleared")


# Global service instance
tel_aviv_content_service = TelAvivContentService()
