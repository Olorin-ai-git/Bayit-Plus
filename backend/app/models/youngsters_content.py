"""
Youngsters Content models for runtime aggregation and caching.

Focuses on:
- Teen trending content and viral media
- Age-appropriate news (12-17)
- Culture integration (music, film, art, food)
- Educational content (study help, career prep, life skills)
- Teen entertainment (movies, series)
- Sports content
- Technology (gaming, coding, gadgets)
- Jewish content for teens (Bar/Bat Mitzvah, teen shiurim)

Collections:
- youngsters_content_sources: Source configurations for external content
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class YoungstersContentCategory:
    """Youngsters content category constants (parent categories)."""

    TRENDING = "trending"
    NEWS = "news"
    CULTURE = "culture"
    EDUCATIONAL = "educational"
    MUSIC = "music"
    ENTERTAINMENT = "entertainment"
    SPORTS = "sports"
    TECH = "tech"
    JUDAISM = "judaism"
    ALL = "all"


class YoungstersSubcategory:
    """
    Youngsters content subcategory constants.

    Subcategories provide finer-grained classification within parent categories.
    Each subcategory maps to a parent category for hierarchical navigation.
    """

    # Trending subcategories
    TIKTOK_TRENDS = "tiktok-trends"
    VIRAL_VIDEOS = "viral-videos"
    MEMES = "memes"

    # News subcategories
    ISRAEL_NEWS = "israel-news"
    WORLD_NEWS = "world-news"
    SCIENCE_NEWS = "science-news"
    SPORTS_NEWS = "sports-news"

    # Culture subcategories
    MUSIC_CULTURE = "music-culture"
    FILM_CULTURE = "film-culture"
    ART_CULTURE = "art-culture"
    FOOD_CULTURE = "food-culture"

    # Educational subcategories
    STUDY_HELP = "study-help"
    CAREER_PREP = "career-prep"
    LIFE_SKILLS = "life-skills"

    # Entertainment subcategories
    TEEN_MOVIES = "teen-movies"
    TEEN_SERIES = "teen-series"

    # Tech subcategories
    GAMING = "gaming"
    CODING = "coding"
    GADGETS = "gadgets"

    # Judaism subcategories
    BAR_BAT_MITZVAH = "bar-bat-mitzvah"
    TEEN_TORAH = "teen-torah"
    JEWISH_HISTORY = "jewish-history"


# Subcategory to parent category mapping
SUBCATEGORY_PARENT_MAP = {
    YoungstersSubcategory.TIKTOK_TRENDS: YoungstersContentCategory.TRENDING,
    YoungstersSubcategory.VIRAL_VIDEOS: YoungstersContentCategory.TRENDING,
    YoungstersSubcategory.MEMES: YoungstersContentCategory.TRENDING,
    YoungstersSubcategory.ISRAEL_NEWS: YoungstersContentCategory.NEWS,
    YoungstersSubcategory.WORLD_NEWS: YoungstersContentCategory.NEWS,
    YoungstersSubcategory.SCIENCE_NEWS: YoungstersContentCategory.NEWS,
    YoungstersSubcategory.SPORTS_NEWS: YoungstersContentCategory.NEWS,
    YoungstersSubcategory.MUSIC_CULTURE: YoungstersContentCategory.CULTURE,
    YoungstersSubcategory.FILM_CULTURE: YoungstersContentCategory.CULTURE,
    YoungstersSubcategory.ART_CULTURE: YoungstersContentCategory.CULTURE,
    YoungstersSubcategory.FOOD_CULTURE: YoungstersContentCategory.CULTURE,
    YoungstersSubcategory.STUDY_HELP: YoungstersContentCategory.EDUCATIONAL,
    YoungstersSubcategory.CAREER_PREP: YoungstersContentCategory.EDUCATIONAL,
    YoungstersSubcategory.LIFE_SKILLS: YoungstersContentCategory.EDUCATIONAL,
    YoungstersSubcategory.TEEN_MOVIES: YoungstersContentCategory.ENTERTAINMENT,
    YoungstersSubcategory.TEEN_SERIES: YoungstersContentCategory.ENTERTAINMENT,
    YoungstersSubcategory.GAMING: YoungstersContentCategory.TECH,
    YoungstersSubcategory.CODING: YoungstersContentCategory.TECH,
    YoungstersSubcategory.GADGETS: YoungstersContentCategory.TECH,
    YoungstersSubcategory.BAR_BAT_MITZVAH: YoungstersContentCategory.JUDAISM,
    YoungstersSubcategory.TEEN_TORAH: YoungstersContentCategory.JUDAISM,
    YoungstersSubcategory.JEWISH_HISTORY: YoungstersContentCategory.JUDAISM,
}


class YoungstersAgeGroup:
    """Age group classifications for youngsters content."""

    MIDDLE_SCHOOL = "middle-school"  # 12-14 years
    HIGH_SCHOOL = "high-school"  # 15-17 years


# Age group range definitions (min_age, max_age)
AGE_GROUP_RANGES = {
    YoungstersAgeGroup.MIDDLE_SCHOOL: (12, 14),
    YoungstersAgeGroup.HIGH_SCHOOL: (15, 17),
}


class YoungstersContentSource(Document):
    """
    Configuration for an external youngsters content source.

    Sources include YouTube channels, podcasts, and Archive.org collections.
    """

    name: str
    name_he: Optional[str] = None
    source_type: str  # youtube, podcast, archive, seed
    source_url: Optional[str] = None
    is_active: bool = True
    last_synced_at: Optional[datetime] = None
    sync_error_count: int = 0
    last_error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "youngsters_content_sources"
        indexes = [
            "name",
            "source_type",
            "is_active",
        ]


class YoungstersSubcategoryResponse(BaseModel):
    """Response model for a youngsters subcategory."""

    id: str
    slug: str
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_category: str  # Parent category slug
    min_age: int = 12
    max_age: int = 17
    content_count: int = 0
    order: int = 0

    class Config:
        from_attributes = True


class YoungstersAgeGroupResponse(BaseModel):
    """Response model for an age group."""

    id: str
    slug: str
    name: str  # Hebrew name
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    min_age: int
    max_age: int
    content_count: int = 0

    class Config:
        from_attributes = True


class YoungstersContentItemResponse(BaseModel):
    """Response model for a youngsters content item."""

    id: str
    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    age_rating: Optional[int] = None
    category: str
    category_label: dict = Field(default_factory=dict)
    subcategory: Optional[str] = None  # Subcategory slug
    subcategory_label: Optional[dict] = None  # Localized subcategory labels
    age_group: Optional[str] = None  # Age group classification
    educational_tags: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0
    source_type: str = "database"  # database, youtube, podcast, archive, seed

    class Config:
        from_attributes = True


class YoungstersContentAggregatedResponse(BaseModel):
    """Aggregated youngsters content response with pagination."""

    items: List[YoungstersContentItemResponse]
    pagination: dict
    sources_count: int
    last_updated: datetime
    category: Optional[str] = None
    age_filter: Optional[int] = None


class YoungstersFeaturedResponse(BaseModel):
    """Featured youngsters content for homepage hero section."""

    featured: List[YoungstersContentItemResponse]
    categories: List[dict] = Field(default_factory=list)
    subcategories: List[YoungstersSubcategoryResponse] = Field(default_factory=list)
    last_updated: datetime


class YoungstersSubcategoriesResponse(BaseModel):
    """Response model for listing all youngsters subcategories."""

    subcategories: List[YoungstersSubcategoryResponse]
    total: int
    grouped_by_parent: dict = Field(default_factory=dict)


class YoungstersAgeGroupsResponse(BaseModel):
    """Response model for listing all age groups."""

    age_groups: List[YoungstersAgeGroupResponse]
    total: int
