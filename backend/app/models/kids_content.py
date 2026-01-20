"""
Kids Content models for runtime aggregation and caching.

Focuses on:
- Cartoons and animated content
- Educational programs
- Kids music and songs
- Hebrew language learning
- Stories and tales
- Jewish content for children

Collections:
- kids_content_sources: Source configurations for external content
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class KidsContentCategory:
    """Kids content category constants (parent categories)."""

    CARTOONS = "cartoons"
    EDUCATIONAL = "educational"
    MUSIC = "music"
    HEBREW = "hebrew"
    STORIES = "stories"
    JEWISH = "jewish"
    ALL = "all"


class KidsSubcategory:
    """
    Kids content subcategory constants.

    Subcategories provide finer-grained classification within parent categories.
    Each subcategory maps to a parent category for hierarchical navigation.
    """

    # Educational subcategories
    LEARNING_HEBREW = "learning-hebrew"
    YOUNG_SCIENCE = "young-science"
    MATH_FUN = "math-fun"
    NATURE_ANIMALS = "nature-animals"
    INTERACTIVE = "interactive"

    # Music subcategories
    HEBREW_SONGS = "hebrew-songs"
    NURSERY_RHYMES = "nursery-rhymes"

    # Cartoons/Video subcategories
    KIDS_MOVIES = "kids-movies"
    KIDS_SERIES = "kids-series"

    # Jewish subcategories
    JEWISH_HOLIDAYS = "jewish-holidays"
    TORAH_STORIES = "torah-stories"

    # Stories subcategories
    BEDTIME_STORIES = "bedtime-stories"


# Subcategory to parent category mapping
SUBCATEGORY_PARENT_MAP = {
    KidsSubcategory.LEARNING_HEBREW: KidsContentCategory.EDUCATIONAL,
    KidsSubcategory.YOUNG_SCIENCE: KidsContentCategory.EDUCATIONAL,
    KidsSubcategory.MATH_FUN: KidsContentCategory.EDUCATIONAL,
    KidsSubcategory.NATURE_ANIMALS: KidsContentCategory.EDUCATIONAL,
    KidsSubcategory.INTERACTIVE: KidsContentCategory.EDUCATIONAL,
    KidsSubcategory.HEBREW_SONGS: KidsContentCategory.MUSIC,
    KidsSubcategory.NURSERY_RHYMES: KidsContentCategory.MUSIC,
    KidsSubcategory.KIDS_MOVIES: KidsContentCategory.CARTOONS,
    KidsSubcategory.KIDS_SERIES: KidsContentCategory.CARTOONS,
    KidsSubcategory.JEWISH_HOLIDAYS: KidsContentCategory.JEWISH,
    KidsSubcategory.TORAH_STORIES: KidsContentCategory.JEWISH,
    KidsSubcategory.BEDTIME_STORIES: KidsContentCategory.STORIES,
}


class KidsAgeGroup:
    """Age group classifications for kids content."""

    TODDLERS = "toddlers"  # 0-3 years
    PRESCHOOL = "preschool"  # 3-5 years
    ELEMENTARY = "elementary"  # 5-10 years
    PRETEEN = "preteen"  # 10-12 years


# Age group range definitions (min_age, max_age)
AGE_GROUP_RANGES = {
    KidsAgeGroup.TODDLERS: (0, 3),
    KidsAgeGroup.PRESCHOOL: (3, 5),
    KidsAgeGroup.ELEMENTARY: (5, 10),
    KidsAgeGroup.PRETEEN: (10, 12),
}


class KidsContentSource(Document):
    """
    Configuration for an external kids content source.

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
        name = "kids_content_sources"
        indexes = [
            "name",
            "source_type",
            "is_active",
        ]


class KidsSubcategoryResponse(BaseModel):
    """Response model for a kids subcategory."""

    id: str
    slug: str
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_category: str  # Parent category slug
    min_age: int = 0
    max_age: int = 12
    content_count: int = 0
    order: int = 0

    class Config:
        from_attributes = True


class KidsAgeGroupResponse(BaseModel):
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


class KidsContentItemResponse(BaseModel):
    """Response model for a kids content item."""

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


class KidsContentAggregatedResponse(BaseModel):
    """Aggregated kids content response with pagination."""

    items: List[KidsContentItemResponse]
    pagination: dict
    sources_count: int
    last_updated: datetime
    category: Optional[str] = None
    age_filter: Optional[int] = None


class KidsFeaturedResponse(BaseModel):
    """Featured kids content for homepage hero section."""

    featured: List[KidsContentItemResponse]
    categories: List[dict] = Field(default_factory=list)
    subcategories: List[KidsSubcategoryResponse] = Field(default_factory=list)
    last_updated: datetime


class KidsSubcategoriesResponse(BaseModel):
    """Response model for listing all kids subcategories."""

    subcategories: List[KidsSubcategoryResponse]
    total: int
    grouped_by_parent: dict = Field(default_factory=dict)


class KidsAgeGroupsResponse(BaseModel):
    """Response model for listing all age groups."""

    age_groups: List[KidsAgeGroupResponse]
    total: int
