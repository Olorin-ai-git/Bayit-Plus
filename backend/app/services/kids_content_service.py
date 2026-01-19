"""
Kids Content Service - Aggregates kids-friendly content from database.

Focuses on:
- Cartoons and animated content
- Educational programs
- Kids music and songs
- Hebrew language learning
- Stories and tales
- Jewish content for children

Uses database as primary source with in-memory TTL caching.
Implements multi-tier fallback strategy to ensure content is never empty.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.models.content import Content
from app.models.kids_content import (
    KidsContentSource,
    KidsContentCategory,
    KidsContentItemResponse,
    KidsContentAggregatedResponse,
    KidsFeaturedResponse,
)

logger = logging.getLogger(__name__)


# Dual-language keyword filters for relevance scoring and categorization
KIDS_KEYWORDS_HE = {
    "hebrew": [
        "עברית",
        "אלף בית",
        "אותיות",
        "מילים",
        "קריאה",
        "כתיבה",
        "שפה",
        "דקדוק",
        "ניקוד",
    ],
    "jewish": [
        "שבת",
        "חנוכה",
        "פורים",
        "פסח",
        "תורה",
        "ברכות",
        "תפילה",
        "חגים",
        "יהדות",
        "מצוות",
        "סוכות",
        "ראש השנה",
    ],
    "educational": [
        "לימוד",
        "חינוכי",
        "מדע",
        "חשבון",
        "מתמטיקה",
        "טבע",
        "בעלי חיים",
        "גוף האדם",
        "היסטוריה",
    ],
    "music": [
        "שירים",
        "מוסיקה",
        "שיר",
        "זמר",
        "ריקוד",
        "שירי ילדים",
        "ניגון",
        "מנגינה",
    ],
    "stories": [
        "סיפור",
        "אגדה",
        "מעשה",
        "סיפורים",
        "מעשיות",
        "ספר",
        "קריאה בקול",
    ],
    "cartoons": [
        "אנימציה",
        "מצויר",
        "סרטון",
        "קריקטורה",
        "דמויות",
        "צפיה לילדים",
    ],
}

KIDS_KEYWORDS_EN = {
    "hebrew": [
        "hebrew",
        "alphabet",
        "alef bet",
        "letters",
        "reading hebrew",
        "learn hebrew",
    ],
    "jewish": [
        "shabbat",
        "chanukah",
        "hanukkah",
        "purim",
        "passover",
        "pesach",
        "torah",
        "jewish holidays",
        "mitzvot",
    ],
    "educational": [
        "educational",
        "learning",
        "science",
        "math",
        "nature",
        "animals",
        "abc",
        "numbers",
    ],
    "music": [
        "kids songs",
        "children music",
        "nursery rhymes",
        "sing along",
        "music for kids",
    ],
    "stories": [
        "story",
        "stories",
        "tale",
        "fairy tale",
        "bedtime story",
        "read aloud",
    ],
    "cartoons": [
        "cartoon",
        "animation",
        "animated",
        "kids show",
        "children show",
    ],
}

# Category labels for UI (trilingual)
KIDS_CATEGORY_LABELS = {
    KidsContentCategory.CARTOONS: {
        "he": "סרטונים מצוירים",
        "en": "Cartoons",
        "es": "Dibujos Animados",
    },
    KidsContentCategory.EDUCATIONAL: {
        "he": "תוכניות לימודיות",
        "en": "Educational",
        "es": "Educativo",
    },
    KidsContentCategory.MUSIC: {
        "he": "מוזיקה לילדים",
        "en": "Kids Music",
        "es": "Musica Infantil",
    },
    KidsContentCategory.HEBREW: {
        "he": "לימוד עברית",
        "en": "Learn Hebrew",
        "es": "Aprender Hebreo",
    },
    KidsContentCategory.STORIES: {
        "he": "סיפורים",
        "en": "Stories",
        "es": "Cuentos",
    },
    KidsContentCategory.JEWISH: {
        "he": "יהדות לילדים",
        "en": "Kids Judaism",
        "es": "Judaismo para Ninos",
    },
    KidsContentCategory.ALL: {
        "he": "הכל",
        "en": "All",
        "es": "Todo",
    },
}

# Seed content - always available when no database content found
KIDS_CONTENT_SEED = [
    {
        "id": "seed-hebrew-1",
        "title": "לומדים עברית - אלף בית",
        "title_en": "Learning Hebrew - Alphabet",
        "description": "לומדים את אותיות האלף בית בצורה מהנה",
        "thumbnail": None,
        "duration": "10:00",
        "age_rating": 3,
        "category": KidsContentCategory.HEBREW,
        "educational_tags": ["hebrew", "alphabet"],
        "relevance_score": 10.0,
        "source_type": "seed",
    },
    {
        "id": "seed-jewish-1",
        "title": "סיפורי שבת לילדים",
        "title_en": "Shabbat Stories for Kids",
        "description": "סיפורים יפים על שבת ומסורת יהודית",
        "thumbnail": None,
        "duration": "15:00",
        "age_rating": 5,
        "category": KidsContentCategory.JEWISH,
        "educational_tags": ["jewish", "shabbat"],
        "relevance_score": 9.5,
        "source_type": "seed",
    },
    {
        "id": "seed-music-1",
        "title": "שירי ילדים ישראליים",
        "title_en": "Israeli Kids Songs",
        "description": "אוסף שירי ילדים אהובים בעברית",
        "thumbnail": None,
        "duration": "20:00",
        "age_rating": 3,
        "category": KidsContentCategory.MUSIC,
        "educational_tags": ["music", "hebrew"],
        "relevance_score": 9.0,
        "source_type": "seed",
    },
    {
        "id": "seed-educational-1",
        "title": "מדע לילדים - עולם החיות",
        "title_en": "Science for Kids - Animal World",
        "description": "לומדים על בעלי חיים מרתקים",
        "thumbnail": None,
        "duration": "12:00",
        "age_rating": 5,
        "category": KidsContentCategory.EDUCATIONAL,
        "educational_tags": ["science", "animals"],
        "relevance_score": 8.5,
        "source_type": "seed",
    },
    {
        "id": "seed-stories-1",
        "title": "סיפורים לפני השינה",
        "title_en": "Bedtime Stories",
        "description": "סיפורים מרגיעים לילדים לפני השינה",
        "thumbnail": None,
        "duration": "8:00",
        "age_rating": 3,
        "category": KidsContentCategory.STORIES,
        "educational_tags": ["stories"],
        "relevance_score": 8.0,
        "source_type": "seed",
    },
    {
        "id": "seed-cartoons-1",
        "title": "סרטון מצויר - הרפתקאות",
        "title_en": "Cartoon Adventures",
        "description": "הרפתקאות מצוירות לילדים",
        "thumbnail": None,
        "duration": "25:00",
        "age_rating": 5,
        "category": KidsContentCategory.CARTOONS,
        "educational_tags": ["cartoons"],
        "relevance_score": 7.5,
        "source_type": "seed",
    },
]


class KidsContentCache:
    """In-memory cache for kids content with TTL support and stale fallback."""

    def __init__(self, ttl_minutes: int):
        self._cache: Dict[str, tuple[List[Dict[str, Any]], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.utcnow() - cached_at > self._ttl:
            # Don't delete - keep for stale fallback
            return None

        return items

    def set(self, key: str, items: List[Dict[str, Any]]) -> None:
        """Cache items with current timestamp."""
        self._cache[key] = (items, datetime.utcnow())

    def get_stale(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items ignoring TTL (stale fallback)."""
        if key in self._cache:
            return self._cache[key][0]  # Return items, ignore timestamp
        return None

    def clear(self) -> None:
        """Clear all cached items."""
        self._cache.clear()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """Get the timestamp when the cache was last updated."""
        if key in self._cache:
            return self._cache[key][1]
        return None


class KidsContentService:
    """Service for aggregating kids-focused content from database."""

    def __init__(self):
        self._cache = KidsContentCache(
            ttl_minutes=settings.KIDS_CONTENT_CACHE_TTL_MINUTES
        )

    def _calculate_relevance_score(
        self, title: str, description: Optional[str] = None
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on kids keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {description or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores = {
            KidsContentCategory.CARTOONS: 0,
            KidsContentCategory.EDUCATIONAL: 0,
            KidsContentCategory.MUSIC: 0,
            KidsContentCategory.HEBREW: 0,
            KidsContentCategory.STORIES: 0,
            KidsContentCategory.JEWISH: 0,
        }

        # Check Hebrew keywords (higher weight for primary language)
        for category_key, keywords in KIDS_KEYWORDS_HE.items():
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
                    score += 2.0  # Hebrew keywords worth more

                    # Map keyword category to content category
                    if category_key == "cartoons":
                        category_scores[KidsContentCategory.CARTOONS] += 3
                    elif category_key == "educational":
                        category_scores[KidsContentCategory.EDUCATIONAL] += 3
                    elif category_key == "music":
                        category_scores[KidsContentCategory.MUSIC] += 3
                    elif category_key == "hebrew":
                        category_scores[KidsContentCategory.HEBREW] += 3
                    elif category_key == "stories":
                        category_scores[KidsContentCategory.STORIES] += 3
                    elif category_key == "jewish":
                        category_scores[KidsContentCategory.JEWISH] += 3

        # Check English keywords
        for category_key, keywords in KIDS_KEYWORDS_EN.items():
            for keyword in keywords:
                if keyword in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += 1.0

                    # Map keyword category to content category
                    if category_key == "cartoons":
                        category_scores[KidsContentCategory.CARTOONS] += 2
                    elif category_key == "educational":
                        category_scores[KidsContentCategory.EDUCATIONAL] += 2
                    elif category_key == "music":
                        category_scores[KidsContentCategory.MUSIC] += 2
                    elif category_key == "hebrew":
                        category_scores[KidsContentCategory.HEBREW] += 2
                    elif category_key == "stories":
                        category_scores[KidsContentCategory.STORIES] += 2
                    elif category_key == "jewish":
                        category_scores[KidsContentCategory.JEWISH] += 2

        # Determine primary category
        max_category = max(category_scores, key=category_scores.get)
        if category_scores[max_category] == 0:
            max_category = KidsContentCategory.ALL

        # Normalize score (0-10 scale)
        normalized_score = min(score / 5.0, 10.0)

        return normalized_score, matched_keywords, max_category

    def _categorize_content(
        self, title: str, description: Optional[str] = None,
        educational_tags: Optional[List[str]] = None,
        genre: Optional[str] = None
    ) -> str:
        """Categorize content based on title, description, tags, and genre."""
        text = f"{title} {description or ''} {genre or ''}".lower()
        tags = [t.lower() for t in (educational_tags or [])]

        # Check educational tags first (most reliable)
        if "hebrew" in tags:
            return KidsContentCategory.HEBREW
        if "jewish" in tags:
            return KidsContentCategory.JEWISH

        # Check for Hebrew learning content
        hebrew_keywords = ["עברית", "אלף בית", "hebrew", "alphabet"]
        if any(kw in text for kw in hebrew_keywords):
            return KidsContentCategory.HEBREW

        # Check for Jewish content
        jewish_keywords = ["שבת", "חנוכה", "פורים", "תורה", "shabbat", "torah"]
        if any(kw in text for kw in jewish_keywords):
            return KidsContentCategory.JEWISH

        # Check for music
        music_keywords = ["שירים", "מוסיקה", "songs", "music", "שיר"]
        if any(kw in text for kw in music_keywords):
            return KidsContentCategory.MUSIC

        # Check for stories
        story_keywords = ["סיפור", "אגדה", "story", "tale"]
        if any(kw in text for kw in story_keywords):
            return KidsContentCategory.STORIES

        # Check for educational
        edu_keywords = ["לימוד", "חינוכי", "educational", "learning", "מדע"]
        if any(kw in text for kw in edu_keywords):
            return KidsContentCategory.EDUCATIONAL

        # Check for cartoons
        cartoon_keywords = ["אנימציה", "מצויר", "cartoon", "animation"]
        if any(kw in text for kw in cartoon_keywords):
            return KidsContentCategory.CARTOONS

        return KidsContentCategory.ALL

    def _content_to_dict(self, content: Content) -> Dict[str, Any]:
        """Convert Content document to response dict format."""
        category = self._categorize_content(
            content.title,
            content.description,
            content.educational_tags,
            content.genre
        )

        # Calculate relevance score
        score, keywords, _ = self._calculate_relevance_score(
            content.title, content.description
        )

        return {
            "id": str(content.id),
            "title": content.title,
            "title_en": content.title_en,
            "description": content.description,
            "thumbnail": content.thumbnail,
            "duration": content.duration,
            "age_rating": content.age_rating,
            "category": category,
            "educational_tags": content.educational_tags or [],
            "relevance_score": max(score, 5.0),  # Base score for DB content
            "source_type": "database",
        }

    async def fetch_all_content(
        self,
        category: Optional[str] = None,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """
        Fetch aggregated kids content from all sources.

        Fallback strategy (never empty):
        1. PRIMARY: Database query (Content with is_kids_content=True)
        2. SECONDARY: Stale cache (if fresh fails)
        3. FALLBACK: Seed data from KIDS_CONTENT_SEED
        """
        cache_key = f"kids_content_{category or 'all'}_{age_max or 'all'}"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # PRIMARY: Query database for kids content
            logger.info("Fetching kids content from database")
            try:
                query: Dict[str, Any] = {
                    "is_kids_content": True,
                    "is_published": True,
                }

                # Apply age filter
                if age_max is not None:
                    query["age_rating"] = {"$lte": age_max}

                content_list = await Content.find(query).to_list()

                for content in content_list:
                    item_dict = self._content_to_dict(content)
                    all_items.append(item_dict)

                logger.info(f"Database returned {len(all_items)} kids content items")

            except Exception as e:
                logger.error(f"Database query failed: {e}")

            # Sort by relevance score then by title
            all_items.sort(
                key=lambda x: (x["relevance_score"], x.get("title", "")),
                reverse=True,
            )

            # Only update cache if we found content
            if all_items:
                self._cache.set(cache_key, all_items)
                cached_items = all_items
            else:
                # SECONDARY: Try stale cache
                stale_items = self._cache.get_stale(cache_key)
                if stale_items:
                    cached_items = stale_items
                    logger.warning("No fresh kids content, using stale cache")
                else:
                    # FALLBACK: Use seed content - never return empty
                    cached_items = KIDS_CONTENT_SEED.copy()

                    # Filter seed by age if specified
                    if age_max is not None:
                        cached_items = [
                            item for item in cached_items
                            if (item.get("age_rating") or 0) <= age_max
                        ]

                    self._cache.set(cache_key, cached_items)
                    logger.info("Using seed kids content as fallback")

        # Apply category filter on cached results
        filtered_items = cached_items
        if category and category != KidsContentCategory.ALL:
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
            KidsContentItemResponse(
                id=item.get("id", f"kids-{i + start_idx}"),
                title=item.get("title", ""),
                title_en=item.get("title_en"),
                description=item.get("description"),
                thumbnail=item.get("thumbnail"),
                duration=item.get("duration"),
                age_rating=item.get("age_rating"),
                category=item.get("category", KidsContentCategory.ALL),
                category_label=KIDS_CATEGORY_LABELS.get(
                    item.get("category", KidsContentCategory.ALL),
                    KIDS_CATEGORY_LABELS[KidsContentCategory.ALL],
                ),
                educational_tags=item.get("educational_tags", []),
                relevance_score=item.get("relevance_score", 0.0),
                source_type=item.get("source_type", "database"),
            )
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources_count = await KidsContentSource.find({"is_active": True}).count()
        last_updated = self._cache.get_last_updated(cache_key) or datetime.utcnow()

        return KidsContentAggregatedResponse(
            items=response_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=sources_count,
            last_updated=last_updated,
            category=category,
            age_filter=age_max,
        )

    async def get_featured_content(
        self, age_max: Optional[int] = None
    ) -> KidsFeaturedResponse:
        """Get featured kids content for homepage hero section."""
        content = await self.fetch_all_content(age_max=age_max, limit=10)
        categories = await self.get_categories()

        return KidsFeaturedResponse(
            featured=content.items[:10],
            categories=categories,
            last_updated=content.last_updated,
        )

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get available kids content categories."""
        return [
            {
                "id": category_id,
                "name": labels["en"],
                "name_he": labels["he"],
                "name_es": labels.get("es", labels["en"]),
                "icon": icon,
            }
            for category_id, labels, icon in [
                (KidsContentCategory.ALL, KIDS_CATEGORY_LABELS[KidsContentCategory.ALL], ""),
                (KidsContentCategory.CARTOONS, KIDS_CATEGORY_LABELS[KidsContentCategory.CARTOONS], ""),
                (KidsContentCategory.EDUCATIONAL, KIDS_CATEGORY_LABELS[KidsContentCategory.EDUCATIONAL], ""),
                (KidsContentCategory.MUSIC, KIDS_CATEGORY_LABELS[KidsContentCategory.MUSIC], ""),
                (KidsContentCategory.HEBREW, KIDS_CATEGORY_LABELS[KidsContentCategory.HEBREW], ""),
                (KidsContentCategory.STORIES, KIDS_CATEGORY_LABELS[KidsContentCategory.STORIES], ""),
                (KidsContentCategory.JEWISH, KIDS_CATEGORY_LABELS[KidsContentCategory.JEWISH], ""),
            ]
        ]

    async def get_content_by_category(
        self,
        category: str,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content by specific category."""
        return await self.fetch_all_content(
            category=category,
            age_max=age_max,
            page=page,
            limit=limit,
        )

    def clear_cache(self) -> None:
        """Clear the content cache."""
        self._cache.clear()
        logger.info("Kids content cache cleared")


# Global service instance
kids_content_service = KidsContentService()
