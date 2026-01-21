"""
Jewish News models for aggregating news from US Jewish publications.

Collections:
- jewish_news_sources: RSS feed configurations
- jewish_news_items: Cached news articles with TTL index
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class JewishNewsSourceCreate(BaseModel):
    """Request model for creating a Jewish news source."""

    name: str
    rss_url: str
    category: str
    language: str = "en"
    is_active: bool = True


class JewishNewsSource(Document):
    """
    Configuration for a Jewish news RSS feed source.

    Sources include major US Jewish publications like JTA, Forward, Tablet, etc.
    """

    name: str
    name_he: Optional[str] = None
    rss_url: str
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    category: str  # news, culture, opinion, torah, community
    language: str = "en"  # Primary language: en, he
    is_active: bool = True
    last_fetched_at: Optional[datetime] = None
    fetch_error_count: int = 0
    last_error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jewish_news_sources"
        indexes = [
            "name",
            "category",
            "is_active",
        ]


class JewishNewsItem(Document):
    """
    A cached news article from a Jewish publication RSS feed.

    Items are stored with a TTL index for automatic cleanup after cache expiration.
    """

    source_id: str  # Reference to JewishNewsSource
    source_name: str  # Denormalized for quick display
    title: str
    title_he: Optional[str] = None  # Hebrew translation if available
    link: str
    published_at: datetime
    summary: Optional[str] = None
    summary_he: Optional[str] = None
    author: Optional[str] = None
    image_url: Optional[str] = None
    category: str  # Inherited from source: news, culture, opinion, torah, community
    tags: List[str] = Field(default_factory=list)
    guid: str  # Unique identifier from RSS to prevent duplicates
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jewish_news_items"
        indexes = [
            "source_id",
            "source_name",
            "category",
            "published_at",
            "guid",
            ("category", "published_at"),
            ("source_name", "published_at"),
        ]


class JewishNewsItemResponse(BaseModel):
    """Response model for a Jewish news item."""

    id: str
    source_name: str
    title: str
    title_he: Optional[str] = None
    link: str
    published_at: datetime
    summary: Optional[str] = None
    summary_he: Optional[str] = None
    author: Optional[str] = None
    image_url: Optional[str] = None
    category: str
    tags: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class JewishNewsSourceResponse(BaseModel):
    """Response model for a Jewish news source."""

    id: str
    name: str
    name_he: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    category: str
    language: str
    is_active: bool

    class Config:
        from_attributes = True


class JewishNewsAggregatedResponse(BaseModel):
    """Aggregated news response with pagination."""

    items: List[JewishNewsItemResponse]
    pagination: dict
    sources_count: int
    last_updated: datetime
