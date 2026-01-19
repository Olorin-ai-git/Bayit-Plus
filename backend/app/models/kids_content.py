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
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field


class KidsContentCategory:
    """Kids content category constants."""

    CARTOONS = "cartoons"
    EDUCATIONAL = "educational"
    MUSIC = "music"
    HEBREW = "hebrew"
    STORIES = "stories"
    JEWISH = "jewish"
    ALL = "all"


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
    last_updated: datetime
