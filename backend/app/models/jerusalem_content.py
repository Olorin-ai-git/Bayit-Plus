"""
Jerusalem Content models for scraping and caching Jerusalem-focused news.

Focuses on:
- Western Wall (Kotel) events and ceremonies
- IDF ceremonies at the Kotel
- Israel-Diaspora connection news
- Holy sites coverage

Collections:
- jerusalem_content_sources: Source configurations
- jerusalem_content_items: Cached content with TTL index
"""

from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field


class JerusalemContentCategory:
    """Jerusalem content category constants."""

    KOTEL = "kotel"
    IDF_CEREMONY = "idf-ceremony"
    DIASPORA = "diaspora-connection"
    HOLY_SITES = "holy-sites"
    JERUSALEM_EVENTS = "jerusalem-events"
    GENERAL = "general"


class JerusalemContentSource(Document):
    """
    Configuration for a Jerusalem content source.

    Sources include Israeli news sites with Jerusalem sections.
    """

    name: str
    name_he: Optional[str] = None
    rss_url: Optional[str] = None
    website_url: str
    content_type: str  # news, events, ceremonies
    language: str = "he"  # Primary language: he, en
    is_active: bool = True
    keyword_filters: List[str] = Field(default_factory=list)
    last_fetched_at: Optional[datetime] = None
    fetch_error_count: int = 0
    last_error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jerusalem_content_sources"
        indexes = [
            "name",
            "content_type",
            "is_active",
        ]


class JerusalemContentItem(Document):
    """
    A cached Jerusalem content item.

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
    category: str  # kotel, idf-ceremony, diaspora-connection, holy-sites, jerusalem-events
    tags: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0
    matched_keywords: List[str] = Field(default_factory=list)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jerusalem_content_items"
        indexes = [
            "source_name",
            "category",
            "published_at",
            "url",
            ("category", "published_at"),
            ("relevance_score", "published_at"),
        ]


class JerusalemContentItemResponse(BaseModel):
    """Response model for a Jerusalem content item."""

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


class JerusalemContentSourceResponse(BaseModel):
    """Response model for a Jerusalem content source."""

    id: str
    name: str
    name_he: Optional[str] = None
    website_url: str
    content_type: str
    language: str
    is_active: bool

    class Config:
        from_attributes = True


class JerusalemContentAggregatedResponse(BaseModel):
    """Aggregated Jerusalem content response with pagination."""

    items: List[JerusalemContentItemResponse]
    pagination: dict
    sources_count: int
    last_updated: datetime
    category: Optional[str] = None


class JerusalemFeaturedResponse(BaseModel):
    """Featured Jerusalem content for hero section."""

    featured: List[JerusalemContentItemResponse]
    kotel_live: Optional[dict] = None  # Live Kotel webcam info
    upcoming_ceremonies: List[dict] = Field(default_factory=list)
    last_updated: datetime
