"""
Documentation Article Models
MongoDB models for documentation system with enhanced metadata for search and analytics.
"""

from datetime import datetime, timezone
from typing import Optional, List, Literal
from beanie import Document
from pydantic import BaseModel, Field


# Type definitions
DifficultyLevel = Literal['beginner', 'intermediate', 'advanced']
AudienceType = Literal['user', 'parent', 'admin', 'developer']
PlatformType = Literal['web', 'ios', 'android', 'apple_tv', 'android_tv', 'carplay', 'all']


class DocumentationArticle(Document):
    """
    Documentation article metadata stored in MongoDB.
    Actual content is stored in markdown files; this model tracks metadata for search and analytics.
    """
    # Identification
    slug: str  # Unique path identifier, e.g., "getting-started/welcome"
    title_key: str  # i18n key for title

    # Classification
    category_id: str  # e.g., "getting-started", "features", "troubleshooting"
    subcategory_id: Optional[str] = None  # e.g., "platform-guides/web"

    # Content paths (relative to docs root, without language prefix)
    content_path: str  # e.g., "getting-started/welcome.md"

    # Targeting
    audiences: List[AudienceType] = Field(default_factory=lambda: ['user'])
    platforms: List[PlatformType] = Field(default_factory=lambda: ['all'])
    difficulty: DifficultyLevel = 'beginner'
    estimated_read_time_minutes: int = 5

    # Search optimization
    keywords: List[str] = Field(default_factory=list)
    description_key: Optional[str] = None  # i18n key for meta description

    # Related content
    related_articles: List[str] = Field(default_factory=list)  # List of slugs
    prerequisite_articles: List[str] = Field(default_factory=list)  # Must read first

    # Ordering
    order: int = 0
    is_featured: bool = False
    is_published: bool = True

    # Analytics
    views: int = 0
    helpful_yes: int = 0
    helpful_no: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reviewed_at: Optional[datetime] = None

    class Settings:
        name = "documentation_articles"
        indexes = [
            "slug",  # Unique lookup
            "category_id",  # Category filtering
            "audiences",  # Audience filtering
            "platforms",  # Platform filtering
            "keywords",  # Keyword search
            "is_published",  # Published filter
            "order",  # Ordering
            [("category_id", 1), ("order", 1)],  # Category listing
            [("is_featured", -1), ("views", -1)],  # Featured/popular
        ]


class DocumentationCategory(Document):
    """
    Documentation category definition.
    Categories organize articles into logical groups.
    """
    category_id: str  # Unique identifier, e.g., "getting-started"
    title_key: str  # i18n key for category title
    description_key: Optional[str] = None  # i18n key for category description
    icon: str = "📄"  # Emoji icon
    order: int = 0
    is_visible: bool = True

    # Parent category for nested hierarchy
    parent_id: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "documentation_categories"
        indexes = [
            "category_id",
            "parent_id",
            "order",
        ]


class DocumentationFeedback(Document):
    """
    User feedback on documentation articles.
    Captures detailed feedback for improvement.
    """
    article_slug: str
    user_id: Optional[str] = None  # Optional user ID
    session_id: Optional[str] = None  # Anonymous session tracking

    # Feedback
    helpful: bool
    rating: Optional[int] = None  # 1-5 stars
    comment: Optional[str] = None

    # Context
    language: str = 'en'
    platform: Optional[str] = None
    search_query: Optional[str] = None  # What search led to this article

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "documentation_feedback"
        indexes = [
            "article_slug",
            "user_id",
            "helpful",
            "created_at",
        ]


class DocumentationSearchLog(Document):
    """
    Search query log for documentation improvement.
    Tracks what users search for and whether they found relevant results.
    """
    query: str
    language: str = 'en'
    user_id: Optional[str] = None
    session_id: Optional[str] = None

    # Results
    results_count: int = 0
    clicked_articles: List[str] = Field(default_factory=list)  # Slugs of articles clicked

    # Context
    platform: Optional[str] = None
    category_filter: Optional[str] = None
    audience_filter: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "documentation_search_logs"
        indexes = [
            "query",
            "language",
            "created_at",
            [("query", "text")],  # Text search index
        ]
