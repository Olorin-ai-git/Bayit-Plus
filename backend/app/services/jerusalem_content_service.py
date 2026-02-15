"""
Jerusalem Content Service - Aggregates Jerusalem-focused content from Israeli news.

Focuses on:
- Western Wall (Kotel) events and ceremonies
- IDF ceremonies at the Kotel
- Israel-Diaspora connection news
- Holy sites coverage

Uses existing news_scraper infrastructure with Jerusalem keyword filtering.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


from app.core.config import settings
from app.models.jerusalem_content import (JerusalemContentAggregatedResponse,
                                          JerusalemContentCategory,
                                          JerusalemContentItemResponse,
                                          JerusalemContentSource,
                                          JerusalemContentSourceResponse,
                                          JerusalemFeaturedResponse)
from app.services.geolocation_enhancer import GeolocationEnhancer
from app.services.location_constants import (JERUSALEM_COORDS,
                                             JERUSALEM_DEFAULT_RADIUS_KM)
from app.services.news_scraper import (HeadlineItem, scrape_jerusalem_news,
                                       scrape_mako, scrape_walla,
                                       scrape_ynet)

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
        'טקס צה"ל',
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
    JerusalemContentCategory.KOTEL: {
        "he": "הכותל המערבי",
        "en": "Western Wall",
        "es": "Muro Occidental",
    },
    JerusalemContentCategory.IDF_CEREMONY: {
        "he": 'טקסי צה"ל',
        "en": "IDF Ceremonies",
        "es": "Ceremonias de las FDI",
    },
    JerusalemContentCategory.DIASPORA: {
        "he": "קשר לתפוצות",
        "en": "Diaspora Connection",
        "es": "Conexion con la Diaspora",
    },
    JerusalemContentCategory.HOLY_SITES: {
        "he": "מקומות קדושים",
        "en": "Holy Sites",
        "es": "Lugares Sagrados",
    },
    JerusalemContentCategory.JERUSALEM_EVENTS: {
        "he": "אירועים בירושלים",
        "en": "Jerusalem Events",
        "es": "Eventos en Jerusalen",
    },
    JerusalemContentCategory.GENERAL: {
        "he": "ירושלים",
        "en": "Jerusalem",
        "es": "Jerusalen",
    },
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

# Seed content - always available when no scraped content found
SEED_JERUSALEM_CONTENT = [
    {
        "source_name": "Kotel Heritage",
        "title": "הכותל המערבי - אתר המורשת של עם ישראל",
        "title_he": "הכותל המערבי - אתר המורשת של עם ישראל",
        "title_en": "The Western Wall - Heritage Site of the Jewish People",
        "url": "https://english.thekotel.org/",
        "published_at": datetime.utcnow(),
        "summary": "הכותל המערבי הוא המקום הקדוש ביותר ליהודים בעולם, מקום תפילה ועלייה לרגל מזה אלפי שנים",
        "summary_he": "הכותל המערבי הוא המקום הקדוש ביותר ליהודים בעולם",
        "summary_en": "The Western Wall is the holiest site in Judaism",
        "image_url": None,
        "category": JerusalemContentCategory.KOTEL,
        "tags": ["כותל", "ירושלים", "מורשת"],
        "relevance_score": 10.0,
    },
    {
        "source_name": "IDF Spokesman",
        "title": "טקסי השבעה בכותל המערבי",
        "title_he": "טקסי השבעה בכותל המערבי",
        "title_en": "IDF Swearing-In Ceremonies at the Western Wall",
        "url": "https://www.idf.il/",
        "published_at": datetime.utcnow(),
        "summary": 'חיילי צה"ל נשבעים אמונים למדינת ישראל בטקסים מרגשים ברחבת הכותל המערבי',
        "summary_he": 'חיילי צה"ל נשבעים אמונים למדינת ישראל בכותל',
        "summary_en": "IDF soldiers swear allegiance at the Western Wall",
        "image_url": None,
        "category": JerusalemContentCategory.IDF_CEREMONY,
        "tags": ["צהל", "השבעה", "כותל"],
        "relevance_score": 9.5,
    },
    {
        "source_name": "Jewish Agency",
        "title": "עולים חדשים מגיעים לישראל",
        "title_he": "עולים חדשים מגיעים לישראל",
        "title_en": "New Immigrants Arrive in Israel",
        "url": "https://www.jewishagency.org/",
        "published_at": datetime.utcnow(),
        "summary": "יהודים מרחבי העולם עולים לישראל ומתחברים למורשת העם היהודי",
        "summary_he": "יהודים מרחבי העולם עולים לישראל",
        "summary_en": "Jews from around the world make Aliyah to Israel",
        "image_url": None,
        "category": JerusalemContentCategory.DIASPORA,
        "tags": ["עלייה", "תפוצות", "ישראל"],
        "relevance_score": 9.0,
    },
    {
        "source_name": "Jerusalem Municipality",
        "title": "אירועים ופסטיבלים בירושלים",
        "title_he": "אירועים ופסטיבלים בירושלים",
        "title_en": "Events and Festivals in Jerusalem",
        "url": "https://www.jerusalem.muni.il/",
        "published_at": datetime.utcnow(),
        "summary": "ירושלים מציעה מגוון אירועים תרבותיים, פסטיבלים וחגיגות לאורך כל השנה",
        "summary_he": "ירושלים מציעה מגוון אירועים תרבותיים",
        "summary_en": "Jerusalem offers diverse cultural events year-round",
        "image_url": None,
        "category": JerusalemContentCategory.JERUSALEM_EVENTS,
        "tags": ["ירושלים", "אירועים", "תרבות"],
        "relevance_score": 8.5,
    },
    {
        "source_name": "Israel Antiquities",
        "title": "עיר דוד - חפירות ארכיאולוגיות",
        "title_he": "עיר דוד - חפירות ארכיאולוגיות",
        "title_en": "City of David - Archaeological Excavations",
        "url": "https://www.cityofdavid.org.il/",
        "published_at": datetime.utcnow(),
        "summary": "גילויים ארכיאולוגיים חדשים בעיר דוד חושפים את ההיסטוריה העתיקה של ירושלים",
        "summary_he": "גילויים ארכיאולוגיים בעיר דוד",
        "summary_en": "Archaeological discoveries in the City of David",
        "image_url": None,
        "category": JerusalemContentCategory.HOLY_SITES,
        "tags": ["עיר דוד", "ארכיאולוגיה", "ירושלים"],
        "relevance_score": 8.0,
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
        self._geo_enhancer = GeolocationEnhancer()

    async def initialize_sources(self) -> None:
        """Initialize default Jerusalem sources in the database if not present."""
        if self._sources_initialized:
            return

        try:
            for source_data in DEFAULT_JERUSALEM_SOURCES:
                existing = await JerusalemContentSource.find_one(
                    {"name": source_data["name"]}
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
                            category_scores[
                                JerusalemContentCategory.JERUSALEM_EVENTS
                            ] += 1
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
                            category_scores[
                                JerusalemContentCategory.JERUSALEM_EVENTS
                            ] += 1
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

    def _categorize_content(self, title: str, summary: Optional[str] = None) -> str:
        """Categorize content based on title and summary keywords."""
        text = f"{title} {summary or ''}".lower()

        # Check for Kotel/Western Wall
        kotel_keywords = ["כותל", "kotel", "western wall", "הכותל"]
        if any(kw in text for kw in kotel_keywords):
            return JerusalemContentCategory.KOTEL

        # Check for IDF ceremonies
        idf_keywords = ['צה"ל', "צהל", "idf", "השבעה", "גיוס", "חיילים", "soldiers"]
        if any(kw in text for kw in idf_keywords):
            return JerusalemContentCategory.IDF_CEREMONY

        # Check for diaspora
        diaspora_keywords = ["תפוצות", "diaspora", "עלייה", "aliyah", "עולים", "olim"]
        if any(kw in text for kw in diaspora_keywords):
            return JerusalemContentCategory.DIASPORA

        # Check for holy sites
        holy_keywords = [
            "מערת המכפלה",
            "קבר רחל",
            "הר הבית",
            "temple mount",
            "holy site",
        ]
        if any(kw in text for kw in holy_keywords):
            return JerusalemContentCategory.HOLY_SITES

        # Check for events
        event_keywords = ["אירוע", "פסטיבל", "event", "festival", "חגיגה"]
        if any(kw in text for kw in event_keywords):
            return JerusalemContentCategory.JERUSALEM_EVENTS

        return JerusalemContentCategory.GENERAL

    def _extract_tags(self, title: str, summary: Optional[str] = None) -> List[str]:
        """Extract relevant tags from content."""
        text = f"{title} {summary or ''}".lower()
        tags = []

        # Hebrew tags
        if "ירושלים" in text:
            tags.append("ירושלים")
        if "כותל" in text or "הכותל" in text:
            tags.append("כותל")
        if 'צה"ל' in text or "צהל" in text:
            tags.append("צהל")
        if "עלייה" in text or "עולים" in text:
            tags.append("עלייה")
        if "תפוצות" in text:
            tags.append("תפוצות")
        if "העיר העתיקה" in text:
            tags.append("העיר העתיקה")

        # English tags
        if "jerusalem" in text and "ירושלים" not in tags:
            tags.append("Jerusalem")
        if "kotel" in text and "כותל" not in tags:
            tags.append("Kotel")
        if "idf" in text and "צהל" not in tags:
            tags.append("IDF")

        # Default tags if none found
        if not tags:
            tags = ["ירושלים", "חדשות"]

        return tags[:5]

    def _get_source_reputation(self, source_name: str) -> float:
        """
        Assign reputation score to news sources (0-1 scale).

        1.0: Official Israeli sources (Ynet, Walla, Jerusalem Post)
        0.7: Major international (BBC, Reuters)
        0.5: General news
        0.3: Blogs/opinion sites
        """
        official_sources = [
            "ynet",
            "walla",
            "mako",
            "jerusalem post",
            "haaretz",
            "times of israel",
            "israel hayom",
            "kan",
        ]
        major_sources = ["bbc", "reuters", "ap", "cnn", "guardian", "nyt"]

        source_lower = source_name.lower()
        if any(s in source_lower for s in official_sources):
            return 1.0
        elif any(s in source_lower for s in major_sources):
            return 0.7
        else:
            return 0.5

    async def _filter_jerusalem_content(
        self,
        headlines: List[HeadlineItem],
        enable_geolocation: bool = True,
        radius_km: Optional[float] = None,
        reference_coords: Optional[tuple[float, float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Filter headlines for Jerusalem-related content.

        Args:
            headlines: List of headline items to filter
            enable_geolocation: Enable geolocation enhancement (default: True)
            radius_km: Optional maximum distance filter (km)
            reference_coords: Override default Jerusalem coordinates

        Returns:
            List of Jerusalem content items with hybrid scoring
        """
        keyword_results = []

        for headline in headlines:
            keyword_score, matched_keywords, category = self._calculate_relevance_score(
                headline.title, headline.summary
            )

            keyword_results.append(
                {
                    "headline": headline,
                    "keyword_score": keyword_score / 10.0,
                    "matched_keywords": matched_keywords,
                    "category": category,
                }
            )

        if enable_geolocation:
            coords = reference_coords or JERUSALEM_COORDS
            enhanced = await self._geo_enhancer.enhance_headlines(
                [r["headline"] for r in keyword_results],
                reference_coords=coords,
                radius_km=radius_km or JERUSALEM_DEFAULT_RADIUS_KM,
            )

            final_results = []
            for i, result in enumerate(keyword_results):
                proximity_score = enhanced[i].proximity_score / 10.0
                source_score = self._get_source_reputation(result["headline"].source)

                final_score = (
                    result["keyword_score"] * 0.6
                    + proximity_score * 0.3
                    + source_score * 0.1
                )

                result["proximity_score"] = enhanced[i].proximity_score
                result["distance_km"] = enhanced[i].distance_km
                result["detected_location"] = enhanced[i].detected_location
                result["final_score"] = final_score * 10.0
                final_results.append(result)
        else:
            final_results = keyword_results
            for result in final_results:
                result["final_score"] = result["keyword_score"] * 10.0

        min_score = settings.JERUSALEM_CONTENT_MIN_RELEVANCE_SCORE
        filtered = [
            r for r in final_results
            if r.get("final_score", r["keyword_score"] * 10) >= min_score
        ]

        jerusalem_items = []
        for result in filtered:
            item = {
                "source_name": result["headline"].source,
                "title": result["headline"].title,
                "title_he": result["headline"].title,
                "url": result["headline"].url,
                "published_at": result["headline"].published_at
                or result["headline"].scraped_at,
                "summary": result["headline"].summary,
                "image_url": result["headline"].image_url,
                "category": result["category"],
                "tags": result["matched_keywords"][:5],
                "relevance_score": result["final_score"],
                "matched_keywords": result["matched_keywords"],
            }

            if enable_geolocation:
                item["distance_km"] = result.get("distance_km")
                item["detected_location"] = result.get("detected_location")
                item["proximity_score"] = result.get("proximity_score")

            jerusalem_items.append(item)

        return jerusalem_items

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        reference_coords: Optional[tuple[float, float]] = None,
        radius_km: Optional[float] = None,
        enable_geolocation: bool = True,
    ) -> JerusalemContentAggregatedResponse:
        """
        Fetch aggregated Jerusalem content from all sources.

        Uses web search as PRIMARY source for fresh location-specific content,
        then supplements with keyword-filtered general news.

        Args:
            category: Filter by content category
            page: Pagination page number
            limit: Results per page
            reference_coords: Override default Jerusalem coordinates (lat, lon)
            radius_km: Maximum distance filter in kilometers
            enable_geolocation: Enable geolocation enhancement (default: True)
        """
        await self.initialize_sources()

        cache_key = "jerusalem_content_all"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # PRIMARY: Use web search for fresh Jerusalem-specific news
            logger.info("Fetching fresh Jerusalem content via web search")
            try:
                search_headlines = await scrape_jerusalem_news()
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
                    logger.info(f"Web search found {len(all_items)} Jerusalem items")
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

                # Filter for Jerusalem content
                filtered_items = await self._filter_jerusalem_content(
                    all_headlines,
                    enable_geolocation=enable_geolocation,
                    radius_km=radius_km,
                    reference_coords=reference_coords,
                )

                # Add unique items
                existing_urls = {item["url"] for item in all_items}
                for item in filtered_items:
                    if item["url"] not in existing_urls:
                        all_items.append(item)
                        existing_urls.add(item["url"])

            # Sort by relevance score then publication date
            _utc_min = datetime.min.replace(tzinfo=timezone.utc)
            all_items.sort(
                key=lambda x: (
                    x["relevance_score"],
                    x.get("published_at", _utc_min).replace(tzinfo=timezone.utc)
                    if x.get("published_at", _utc_min).tzinfo is None
                    else x.get("published_at", _utc_min),
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
                    logger.warning("No new Jerusalem content found, using stale cache")
                else:
                    # Use seed content as fallback - content must always be available
                    cached_items = SEED_JERUSALEM_CONTENT
                    self._cache.set(cache_key, cached_items)
                    logger.info("Using seed Jerusalem content as fallback")

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
                (
                    JerusalemContentCategory.KOTEL,
                    JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.KOTEL],
                    "🕎",
                ),
                (
                    JerusalemContentCategory.IDF_CEREMONY,
                    JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.IDF_CEREMONY],
                    "🎖️",
                ),
                (
                    JerusalemContentCategory.DIASPORA,
                    JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.DIASPORA],
                    "🌍",
                ),
                (
                    JerusalemContentCategory.HOLY_SITES,
                    JERUSALEM_CATEGORY_LABELS[JerusalemContentCategory.HOLY_SITES],
                    "✡️",
                ),
                (
                    JerusalemContentCategory.JERUSALEM_EVENTS,
                    JERUSALEM_CATEGORY_LABELS[
                        JerusalemContentCategory.JERUSALEM_EVENTS
                    ],
                    "🇮🇱",
                ),
            ]
        ]

    def clear_cache(self) -> None:
        """Clear the content cache."""
        self._cache.clear()
        logger.info("Jerusalem content cache cleared")


# Global service instance
jerusalem_content_service = JerusalemContentService()
