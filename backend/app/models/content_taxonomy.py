"""
Content Taxonomy Models

This module defines the 5-axis content classification system:
1. Section - Primary navigation (where content lives on the platform)
2. Format - Structural type (movie, series, documentary, etc.)
3. Genre - Mood/style (drama, comedy, action, etc.)
4. Audience - Age appropriateness (general, kids, family, mature)
5. Topic Tags - Themes (jewish, israeli, educational, etc.)

Collections:
- content_sections: Platform navigation sections
- genres: Standardized genre list with TMDB mapping
- audiences: Audience classifications with age settings
- section_subcategories: Section-specific sub-categories
"""

from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field


class ContentSection(Document):
    """
    Platform navigation section (e.g., Movies, Series, Kids, Judaism).

    Content can belong to multiple sections (cross-listing) via section_ids field
    on Content model. The primary_section_id determines display priority.
    """
    # Identifiers
    slug: str  # Unique identifier (e.g., "movies", "kids", "judaism")

    # Multilingual names
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None  # English name
    name_es: Optional[str] = None  # Spanish name

    # Multilingual descriptions
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None

    # Display
    icon: Optional[str] = None  # Icon name or URL
    thumbnail: Optional[str] = None
    color: Optional[str] = None  # Theme color (e.g., "#FF5733")
    order: int = 0  # Display order in navigation

    # Visibility
    is_active: bool = True
    show_on_homepage: bool = True  # If False, section only appears in navigation
    show_on_nav: bool = True  # If False, hidden from main navigation

    # Section behavior
    supports_subcategories: bool = False  # Whether this section uses sub-categories
    default_content_format: Optional[str] = None  # Default format for this section

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "content_sections"
        indexes = [
            "slug",
            "order",
            "is_active",
            ("is_active", "show_on_homepage"),
            ("is_active", "show_on_nav"),
        ]


class SectionSubcategory(Document):
    """
    Section-specific sub-category (e.g., Kids->Cartoons, Judaism->Shiurim).

    These are used within a specific section for further organization.
    Content can belong to multiple subcategories within a section.
    """
    # Parent section
    section_id: str  # References ContentSection

    # Identifiers
    slug: str  # Unique within section (e.g., "cartoons", "shiurim")

    # Multilingual names
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None  # English name
    name_es: Optional[str] = None  # Spanish name

    # Multilingual descriptions
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None

    # Display
    icon: Optional[str] = None
    thumbnail: Optional[str] = None
    order: int = 0

    # Visibility
    is_active: bool = True

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "section_subcategories"
        indexes = [
            "section_id",
            "slug",
            ("section_id", "slug"),
            ("section_id", "is_active"),
            ("section_id", "order"),
        ]


class Genre(Document):
    """
    Content genre (mood/style classification).

    Genres are platform-wide and can be mapped to external sources like TMDB.
    Content can have multiple genres.
    """
    # Identifiers
    slug: str  # Unique identifier (e.g., "drama", "comedy", "action")

    # Multilingual names
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None  # English name
    name_es: Optional[str] = None  # Spanish name

    # External mappings
    tmdb_id: Optional[int] = None  # TMDB genre ID for automatic matching
    tmdb_name: Optional[str] = None  # TMDB genre name

    # Display
    icon: Optional[str] = None
    color: Optional[str] = None  # Theme color for genre
    order: int = 0

    # Visibility
    is_active: bool = True
    show_in_filter: bool = True  # Show in browse filter UI

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "genres"
        indexes = [
            "slug",
            "tmdb_id",
            "is_active",
            "order",
        ]


class Audience(Document):
    """
    Audience classification (age appropriateness).

    Each content item has exactly one audience classification.
    """
    # Identifiers
    slug: str  # Unique identifier (e.g., "general", "kids", "family", "mature")

    # Multilingual names
    name: str  # Hebrew name (primary)
    name_en: Optional[str] = None  # English name
    name_es: Optional[str] = None  # Spanish name

    # Multilingual descriptions
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None

    # Age settings
    min_age: Optional[int] = None  # Minimum recommended age
    max_age: Optional[int] = None  # Maximum recommended age (for kids content)
    content_ratings: List[str] = Field(default_factory=list)  # Mapped ratings (G, PG, PG-13, etc.)

    # Display
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0

    # Visibility
    is_active: bool = True

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audiences"
        indexes = [
            "slug",
            "is_active",
            "order",
        ]


# Pydantic schemas for API requests/responses

class ContentSectionCreate(BaseModel):
    """Schema for creating a content section."""
    slug: str
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    icon: Optional[str] = None
    thumbnail: Optional[str] = None
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True
    show_on_homepage: bool = True
    show_on_nav: bool = True
    supports_subcategories: bool = False
    default_content_format: Optional[str] = None


class ContentSectionUpdate(BaseModel):
    """Schema for updating a content section."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    icon: Optional[str] = None
    thumbnail: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    show_on_homepage: Optional[bool] = None
    show_on_nav: Optional[bool] = None
    supports_subcategories: Optional[bool] = None
    default_content_format: Optional[str] = None


class SectionSubcategoryCreate(BaseModel):
    """Schema for creating a section sub-category."""
    section_id: str
    slug: str
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    icon: Optional[str] = None
    thumbnail: Optional[str] = None
    order: int = 0
    is_active: bool = True


class SectionSubcategoryUpdate(BaseModel):
    """Schema for updating a section sub-category."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    icon: Optional[str] = None
    thumbnail: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class GenreCreate(BaseModel):
    """Schema for creating a genre."""
    slug: str
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    tmdb_id: Optional[int] = None
    tmdb_name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True
    show_in_filter: bool = True


class GenreUpdate(BaseModel):
    """Schema for updating a genre."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    tmdb_id: Optional[int] = None
    tmdb_name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    show_in_filter: Optional[bool] = None


class AudienceCreate(BaseModel):
    """Schema for creating an audience classification."""
    slug: str
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    content_ratings: List[str] = Field(default_factory=list)
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True


class AudienceUpdate(BaseModel):
    """Schema for updating an audience classification."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    content_ratings: Optional[List[str]] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


# Content format enum values (not stored in DB, just for reference)
CONTENT_FORMATS = ["movie", "series", "documentary", "short", "clip"]

# Default topic tags (can be extended by users)
DEFAULT_TOPIC_TAGS = [
    "jewish",
    "israeli",
    "educational",
    "historical",
    "sports",
    "music",
    "nature",
    "science",
    "technology",
    "cooking",
    "travel",
    "biography",
    "true-story",
]
