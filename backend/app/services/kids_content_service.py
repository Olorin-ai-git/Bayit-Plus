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
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.kids_content import (AGE_GROUP_RANGES, SUBCATEGORY_PARENT_MAP,
                                     KidsAgeGroup, KidsAgeGroupResponse,
                                     KidsAgeGroupsResponse,
                                     KidsContentAggregatedResponse,
                                     KidsContentCategory,
                                     KidsContentItemResponse,
                                     KidsContentSource, KidsFeaturedResponse,
                                     KidsSubcategoriesResponse,
                                     KidsSubcategory, KidsSubcategoryResponse)

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


# Subcategory-specific keyword filters
SUBCATEGORY_KEYWORDS_HE = {
    KidsSubcategory.LEARNING_HEBREW: [
        "לימוד עברית",
        "אלף בית",
        "אותיות",
        "ניקוד",
        "קריאה בעברית",
        "כתיבה בעברית",
        "מילים חדשות",
        "אוצר מילים",
    ],
    KidsSubcategory.YOUNG_SCIENCE: [
        "מדע צעיר",
        "ניסויים",
        "מעבדה",
        "חקירה",
        "גילוי",
        "פיזיקה לילדים",
        "כימיה לילדים",
        "מדענים צעירים",
    ],
    KidsSubcategory.MATH_FUN: [
        "מתמטיקה",
        "חשבון",
        "מספרים",
        "חיבור",
        "חיסור",
        "כפל",
        "חילוק",
        "גיאומטריה לילדים",
    ],
    KidsSubcategory.NATURE_ANIMALS: [
        "טבע",
        "חיות",
        "בעלי חיים",
        "צמחים",
        "יער",
        "אוקיינוס",
        "חי וצומח",
        "דינוזאורים",
        "ג'ונגל",
    ],
    KidsSubcategory.INTERACTIVE: [
        "אינטראקטיבי",
        "משחק",
        "השתתפות",
        "יחד",
        "פעילות",
        "חידות",
        "בוא נשחק",
    ],
    KidsSubcategory.HEBREW_SONGS: [
        "שירים בעברית",
        "שירי ילדים",
        "שירים ישראליים",
        "שיר ישראלי",
        "מוסיקה ישראלית לילדים",
    ],
    KidsSubcategory.NURSERY_RHYMES: [
        "שירי פעוטות",
        "שירי עריסה",
        "ניני יה",
        "לילה טוב",
        "שירים לתינוקות",
        "פעוטון",
    ],
    KidsSubcategory.KIDS_MOVIES: [
        "סרט לילדים",
        "סרט מצויר ארוך",
        "סרט משפחתי",
        "סרט קולנוע לילדים",
    ],
    KidsSubcategory.KIDS_SERIES: [
        "סדרה לילדים",
        "סדרת ילדים",
        "פרקים",
        "עונה",
        "תוכנית טלוויזיה לילדים",
    ],
    KidsSubcategory.JEWISH_HOLIDAYS: [
        "חגי ישראל",
        "חגים יהודיים",
        "חנוכה לילדים",
        "פסח לילדים",
        "פורים לילדים",
        "סוכות לילדים",
        "ראש השנה לילדים",
        "יום כיפור לילדים",
    ],
    KidsSubcategory.TORAH_STORIES: [
        "סיפורי תורה",
        "סיפורים מהתנ״ך",
        "פרשת השבוע",
        "אבות",
        "משה רבנו",
        "אברהם אבינו",
        "דוד המלך",
    ],
    KidsSubcategory.BEDTIME_STORIES: [
        "סיפורי ערב טוב",
        "סיפור לפני השינה",
        "לילה טוב",
        "חלומות פז",
        "סיפורים מרגיעים",
    ],
}

SUBCATEGORY_KEYWORDS_EN = {
    KidsSubcategory.LEARNING_HEBREW: [
        "learn hebrew",
        "hebrew alphabet",
        "alef bet",
        "hebrew letters",
        "read hebrew",
        "write hebrew",
        "hebrew vocabulary",
    ],
    KidsSubcategory.YOUNG_SCIENCE: [
        "young science",
        "science experiments",
        "science for kids",
        "stem kids",
        "discover science",
        "lab experiments",
    ],
    KidsSubcategory.MATH_FUN: [
        "fun math",
        "math for kids",
        "numbers game",
        "counting",
        "addition",
        "subtraction",
        "numberblocks",
    ],
    KidsSubcategory.NATURE_ANIMALS: [
        "nature",
        "animals",
        "wildlife",
        "zoo",
        "ocean",
        "dinosaurs",
        "jungle",
        "pets",
        "farm animals",
    ],
    KidsSubcategory.INTERACTIVE: [
        "interactive",
        "play along",
        "join in",
        "participate",
        "games",
        "puzzles",
        "riddles",
    ],
    KidsSubcategory.HEBREW_SONGS: [
        "hebrew songs",
        "israeli songs",
        "songs in hebrew",
        "israeli children songs",
    ],
    KidsSubcategory.NURSERY_RHYMES: [
        "nursery rhymes",
        "lullaby",
        "baby songs",
        "toddler songs",
        "cocomelon",
        "little baby bum",
    ],
    KidsSubcategory.KIDS_MOVIES: [
        "kids movie",
        "children movie",
        "family movie",
        "animated movie",
        "feature film kids",
    ],
    KidsSubcategory.KIDS_SERIES: [
        "kids series",
        "children series",
        "tv show kids",
        "episodes",
        "cartoon series",
    ],
    KidsSubcategory.JEWISH_HOLIDAYS: [
        "jewish holidays kids",
        "hanukkah for kids",
        "passover for kids",
        "purim for kids",
        "sukkot kids",
        "rosh hashanah kids",
    ],
    KidsSubcategory.TORAH_STORIES: [
        "torah stories",
        "bible stories kids",
        "parsha",
        "moses story",
        "abraham story",
        "david king",
    ],
    KidsSubcategory.BEDTIME_STORIES: [
        "bedtime stories",
        "goodnight stories",
        "sleep stories",
        "calming stories",
        "story before sleep",
    ],
}


# Subcategory labels for UI (trilingual)
SUBCATEGORY_LABELS = {
    KidsSubcategory.LEARNING_HEBREW: {
        "he": "לימוד עברית",
        "en": "Learning Hebrew",
        "es": "Aprender Hebreo",
    },
    KidsSubcategory.YOUNG_SCIENCE: {
        "he": "מדע צעיר",
        "en": "Young Science",
        "es": "Ciencia Joven",
    },
    KidsSubcategory.MATH_FUN: {
        "he": "מתמטיקה מהנה",
        "en": "Fun Math",
        "es": "Matemáticas Divertidas",
    },
    KidsSubcategory.NATURE_ANIMALS: {
        "he": "טבע וחיות",
        "en": "Nature & Animals",
        "es": "Naturaleza y Animales",
    },
    KidsSubcategory.INTERACTIVE: {
        "he": "אינטראקטיבי",
        "en": "Interactive",
        "es": "Interactivo",
    },
    KidsSubcategory.HEBREW_SONGS: {
        "he": "שירים בעברית",
        "en": "Hebrew Songs",
        "es": "Canciones en Hebreo",
    },
    KidsSubcategory.NURSERY_RHYMES: {
        "he": "שירי פעוטות",
        "en": "Nursery Rhymes",
        "es": "Canciones de Cuna",
    },
    KidsSubcategory.KIDS_MOVIES: {
        "he": "סרטי ילדים",
        "en": "Kids Movies",
        "es": "Películas para Niños",
    },
    KidsSubcategory.KIDS_SERIES: {
        "he": "סדרות לילדים",
        "en": "Kids Series",
        "es": "Series para Niños",
    },
    KidsSubcategory.JEWISH_HOLIDAYS: {
        "he": "חגי ישראל",
        "en": "Jewish Holidays",
        "es": "Fiestas Judías",
    },
    KidsSubcategory.TORAH_STORIES: {
        "he": "סיפורי תורה",
        "en": "Torah Stories",
        "es": "Historias de la Torá",
    },
    KidsSubcategory.BEDTIME_STORIES: {
        "he": "סיפורי ערב טוב",
        "en": "Bedtime Stories",
        "es": "Cuentos para Dormir",
    },
}


# Age group labels for UI (trilingual)
AGE_GROUP_LABELS = {
    KidsAgeGroup.TODDLERS: {
        "he": "פעוטות (0-3)",
        "en": "Toddlers (0-3)",
        "es": "Bebés (0-3)",
    },
    KidsAgeGroup.PRESCHOOL: {
        "he": "גן ילדים (3-5)",
        "en": "Preschool (3-5)",
        "es": "Preescolar (3-5)",
    },
    KidsAgeGroup.ELEMENTARY: {
        "he": "יסודי (5-10)",
        "en": "Elementary (5-10)",
        "es": "Primaria (5-10)",
    },
    KidsAgeGroup.PRETEEN: {
        "he": "לפני בר/בת מצווה (10-12)",
        "en": "Pre-teen (10-12)",
        "es": "Preadolescentes (10-12)",
    },
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
        self,
        title: str,
        description: Optional[str] = None,
        educational_tags: Optional[List[str]] = None,
        genre: Optional[str] = None,
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

    def _detect_subcategory(
        self,
        title: str,
        description: Optional[str] = None,
        educational_tags: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Detect subcategory based on content metadata."""
        text = f"{title} {description or ''}".lower()
        tags = [t.lower() for t in (educational_tags or [])]

        # Check each subcategory's keywords
        subcategory_scores: Dict[str, int] = {}

        # Check Hebrew keywords (higher weight)
        for subcat, keywords in SUBCATEGORY_KEYWORDS_HE.items():
            score = sum(2 for kw in keywords if kw in text)
            subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + score

        # Check English keywords
        for subcat, keywords in SUBCATEGORY_KEYWORDS_EN.items():
            score = sum(1 for kw in keywords if kw in text)
            subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + score

        # Check educational tags for subcategory hints
        tag_to_subcategory = {
            "hebrew": KidsSubcategory.LEARNING_HEBREW,
            "science": KidsSubcategory.YOUNG_SCIENCE,
            "math": KidsSubcategory.MATH_FUN,
            "nature": KidsSubcategory.NATURE_ANIMALS,
            "animals": KidsSubcategory.NATURE_ANIMALS,
            "music": KidsSubcategory.HEBREW_SONGS,
            "songs": KidsSubcategory.HEBREW_SONGS,
            "nursery": KidsSubcategory.NURSERY_RHYMES,
            "jewish": KidsSubcategory.JEWISH_HOLIDAYS,
            "torah": KidsSubcategory.TORAH_STORIES,
            "bedtime": KidsSubcategory.BEDTIME_STORIES,
            "movie": KidsSubcategory.KIDS_MOVIES,
            "series": KidsSubcategory.KIDS_SERIES,
        }

        for tag in tags:
            if tag in tag_to_subcategory:
                subcat = tag_to_subcategory[tag]
                subcategory_scores[subcat] = subcategory_scores.get(subcat, 0) + 3

        # Find best match
        if subcategory_scores:
            best_match = max(subcategory_scores, key=subcategory_scores.get)
            if subcategory_scores[best_match] >= 2:
                return best_match

        return None

    def _determine_age_group(self, age_rating: Optional[int]) -> Optional[str]:
        """Determine age group from age rating."""
        if age_rating is None:
            return None

        for group, (min_age, max_age) in AGE_GROUP_RANGES.items():
            if min_age <= age_rating <= max_age:
                return group

        return KidsAgeGroup.ELEMENTARY  # Default for out-of-range

    def _content_to_dict(self, content: Content) -> Dict[str, Any]:
        """Convert Content document to response dict format."""
        category = self._categorize_content(
            content.title, content.description, content.educational_tags, content.genre
        )

        # Detect subcategory
        subcategory = self._detect_subcategory(
            content.title, content.description, content.educational_tags
        )

        # Determine age group
        age_group = self._determine_age_group(content.age_rating)

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
            "subcategory": subcategory,
            "subcategory_label": (
                SUBCATEGORY_LABELS.get(subcategory) if subcategory else None
            ),
            "age_group": age_group,
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

            # PRIMARY: Query database for kids content using taxonomy
            logger.info("Fetching kids content from database")
            try:
                from app.models.content_taxonomy import ContentSection

                # Get kids section ID
                kids_section = await ContentSection.find_one(
                    ContentSection.slug == "kids"
                )
                kids_section_id = str(kids_section.id) if kids_section else None

                # Build query with proper $and to avoid overwriting $or
                series_filter = {
                    "$or": [
                        {"series_id": None},
                        {"series_id": {"$exists": False}},
                        {"series_id": ""},
                    ]
                }

                # Use taxonomy-based filtering (new) or legacy flag
                if kids_section_id:
                    content_filter = {
                        "$or": [
                            {"section_ids": kids_section_id},
                            {"is_kids_content": True},
                        ]
                    }
                else:
                    content_filter = {"is_kids_content": True}

                and_conditions = [
                    {"is_published": True},
                    series_filter,
                    content_filter,
                ]

                # Apply age filter
                if age_max is not None:
                    and_conditions.append({"age_rating": {"$lte": age_max}})

                query: Dict[str, Any] = {"$and": and_conditions}

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
                            item
                            for item in cached_items
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
                (
                    KidsContentCategory.ALL,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.ALL],
                    "",
                ),
                (
                    KidsContentCategory.CARTOONS,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.CARTOONS],
                    "",
                ),
                (
                    KidsContentCategory.EDUCATIONAL,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.EDUCATIONAL],
                    "",
                ),
                (
                    KidsContentCategory.MUSIC,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.MUSIC],
                    "",
                ),
                (
                    KidsContentCategory.HEBREW,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.HEBREW],
                    "",
                ),
                (
                    KidsContentCategory.STORIES,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.STORIES],
                    "",
                ),
                (
                    KidsContentCategory.JEWISH,
                    KIDS_CATEGORY_LABELS[KidsContentCategory.JEWISH],
                    "",
                ),
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

    async def get_subcategories(self) -> KidsSubcategoriesResponse:
        """Get all kids subcategories with content counts."""
        try:
            # Get kids section ID
            kids_section = await ContentSection.find_one(ContentSection.slug == "kids")
            if not kids_section:
                return KidsSubcategoriesResponse(
                    subcategories=[], total=0, grouped_by_parent={}
                )

            # Get subcategories from database
            subcategories = (
                await SectionSubcategory.find(
                    SectionSubcategory.section_id == str(kids_section.id),
                    SectionSubcategory.is_active == True,
                )
                .sort("order")
                .to_list()
            )

            subcategory_responses = []
            grouped_by_parent: Dict[str, List[Dict]] = {}

            for subcat in subcategories:
                # Get content count for this subcategory
                # (We'll count items that match this subcategory's keywords)
                parent_category = SUBCATEGORY_PARENT_MAP.get(subcat.slug, "educational")

                response = KidsSubcategoryResponse(
                    id=str(subcat.id),
                    slug=subcat.slug,
                    name=subcat.name,
                    name_en=subcat.name_en,
                    name_es=subcat.name_es,
                    description=subcat.description,
                    icon=subcat.icon,
                    parent_category=parent_category,
                    min_age=0,
                    max_age=12,
                    content_count=0,  # Will be populated dynamically
                    order=subcat.order,
                )
                subcategory_responses.append(response)

                # Group by parent category
                if parent_category not in grouped_by_parent:
                    grouped_by_parent[parent_category] = []
                grouped_by_parent[parent_category].append(
                    {
                        "slug": subcat.slug,
                        "name": subcat.name,
                        "name_en": subcat.name_en,
                    }
                )

            return KidsSubcategoriesResponse(
                subcategories=subcategory_responses,
                total=len(subcategory_responses),
                grouped_by_parent=grouped_by_parent,
            )

        except Exception as e:
            logger.error(f"Error getting subcategories: {e}")
            # Return fallback from constants
            fallback_subcategories = []
            for slug in SUBCATEGORY_LABELS:
                labels = SUBCATEGORY_LABELS[slug]
                parent = SUBCATEGORY_PARENT_MAP.get(slug, "educational")
                fallback_subcategories.append(
                    KidsSubcategoryResponse(
                        id=slug,
                        slug=slug,
                        name=labels["he"],
                        name_en=labels["en"],
                        name_es=labels.get("es", labels["en"]),
                        parent_category=parent,
                        min_age=0,
                        max_age=12,
                        content_count=0,
                        order=0,
                    )
                )

            return KidsSubcategoriesResponse(
                subcategories=fallback_subcategories,
                total=len(fallback_subcategories),
                grouped_by_parent={},
            )

    async def get_content_by_subcategory(
        self,
        subcategory_slug: str,
        age_max: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content filtered by subcategory."""
        # First get all content
        content_response = await self.fetch_all_content(
            age_max=age_max,
            page=1,
            limit=1000,  # Get more items for filtering
        )

        # Filter by subcategory
        filtered_items = [
            item
            for item in content_response.items
            if item.subcategory == subcategory_slug
        ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        return KidsContentAggregatedResponse(
            items=paginated_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=content_response.sources_count,
            last_updated=content_response.last_updated,
            category=SUBCATEGORY_PARENT_MAP.get(subcategory_slug),
            age_filter=age_max,
        )

    async def get_age_groups(self) -> KidsAgeGroupsResponse:
        """Get all age groups with content counts."""
        age_groups = []

        for group_slug, (min_age, max_age) in AGE_GROUP_RANGES.items():
            labels = AGE_GROUP_LABELS.get(group_slug, {})
            age_groups.append(
                KidsAgeGroupResponse(
                    id=group_slug,
                    slug=group_slug,
                    name=labels.get("he", group_slug),
                    name_en=labels.get("en", group_slug),
                    name_es=labels.get("es", group_slug),
                    min_age=min_age,
                    max_age=max_age,
                    content_count=0,  # Will be populated dynamically
                )
            )

        return KidsAgeGroupsResponse(age_groups=age_groups, total=len(age_groups))

    async def get_content_by_age_group(
        self,
        age_group_slug: str,
        page: int = 1,
        limit: int = 20,
    ) -> KidsContentAggregatedResponse:
        """Get kids content filtered by age group."""
        # Get age range for this group
        age_range = AGE_GROUP_RANGES.get(age_group_slug)
        if not age_range:
            return KidsContentAggregatedResponse(
                items=[],
                pagination={"page": page, "limit": limit, "total": 0, "pages": 0},
                sources_count=0,
                last_updated=datetime.utcnow(),
            )

        min_age, max_age = age_range

        # Get content within age range
        content_response = await self.fetch_all_content(
            age_max=max_age,
            page=1,
            limit=1000,  # Get more items for filtering
        )

        # Filter by age group (age_rating should be >= min_age and <= max_age)
        filtered_items = [
            item
            for item in content_response.items
            if item.age_rating is not None and min_age <= item.age_rating <= max_age
        ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        return KidsContentAggregatedResponse(
            items=paginated_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=content_response.sources_count,
            last_updated=content_response.last_updated,
            age_filter=max_age,
        )


# Global service instance
kids_content_service = KidsContentService()
