"""
Tel Aviv Content models for scraping and caching Tel Aviv-focused news.

Focuses on:
- Beaches and promenade (Tayelet)
- Nightlife and entertainment (Rothschild, Florentin)
- Culture and art (Bauhaus, White City, museums)
- Music scene (concerts, festivals)
- Food and dining (Carmel Market, Sarona)
- Tech and startups
- Events and festivals (Pride Parade, etc.)

Collections:
- tel_aviv_content_sources: Source configurations
- tel_aviv_content_items: Cached content with TTL index
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class TelAvivContentCategory:
    """Tel Aviv content category constants."""

    BEACHES = "beaches"
    NIGHTLIFE = "nightlife"
    CULTURE = "culture"
    MUSIC = "music"
    FOOD = "food"
    TECH = "tech"
    EVENTS = "events"
    GENERAL = "general"


class TelAvivContentSource(Document):
    """
    Configuration for a Tel Aviv content source.

    Sources include Israeli news sites with Tel Aviv sections.
    """

    name: str
    name_he: Optional[str] = None
    rss_url: Optional[str] = None
    website_url: str
    content_type: str  # news, events, lifestyle
    language: str = "he"  # Primary language: he, en
    is_active: bool = True
    keyword_filters: List[str] = Field(default_factory=list)
    last_fetched_at: Optional[datetime] = None
    fetch_error_count: int = 0
    last_error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tel_aviv_content_sources"
        indexes = [
            "name",
            "content_type",
            "is_active",
        ]


class TelAvivContentItem(Document):
    """
    A cached Tel Aviv content item.

    Items are stored with TTL index for automatic cleanup.
    """

    source_name: str
    title: str
    title_he: Optional[str] = None
    title_en: Optional[str] = None
    url: str
    published_at: datetime
    summary: Optional[str] = None
    summary_he: Optional[str] = None
    summary_en: Optional[str] = None
    image_url: Optional[str] = None
    category: str  # beaches, nightlife, culture, music, food, tech, events
    tags: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0
    matched_keywords: List[str] = Field(default_factory=list)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tel_aviv_content_items"
        indexes = [
            "source_name",
            "category",
            "published_at",
            "url",
            ("category", "published_at"),
            ("relevance_score", "published_at"),
        ]


class TelAvivContentItemResponse(BaseModel):
    """Response model for a Tel Aviv content item."""

    id: str
    source_name: str
    title: str
    title_he: Optional[str] = None
    title_en: Optional[str] = None
    url: str
    published_at: datetime
    summary: Optional[str] = None
    summary_he: Optional[str] = None
    summary_en: Optional[str] = None
    image_url: Optional[str] = None
    category: str
    category_label: dict = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0

    class Config:
        from_attributes = True


class TelAvivContentSourceResponse(BaseModel):
    """Response model for a Tel Aviv content source."""

    id: str
    name: str
    name_he: Optional[str] = None
    website_url: str
    content_type: str
    language: str
    is_active: bool

    class Config:
        from_attributes = True


class TelAvivContentAggregatedResponse(BaseModel):
    """Aggregated Tel Aviv content response with pagination."""

    items: List[TelAvivContentItemResponse]
    pagination: dict
    sources_count: int
    last_updated: datetime
    category: Optional[str] = None


class TelAvivFeaturedResponse(BaseModel):
    """Featured Tel Aviv content for hero section."""

    featured: List[TelAvivContentItemResponse]
    beach_webcam: Optional[dict] = None  # Live beach webcam info
    upcoming_events: List[dict] = Field(default_factory=list)
    last_updated: datetime
