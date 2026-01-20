"""
Trending Topics Models.
Stores trending topics and analysis results.
"""
from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class TrendingTopicItem(BaseModel):
    """A single trending topic"""

    title: str
    title_en: Optional[str] = None
    category: str = "general"
    sentiment: str = "neutral"
    importance: int = 5
    summary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


class TrendingSnapshot(Document):
    """
    A snapshot of trending topics at a point in time.
    New snapshots are created every 30 minutes.
    """

    topics: List[TrendingTopicItem] = Field(default_factory=list)
    overall_mood: str = ""
    top_story: Optional[str] = None

    # Metadata
    headline_count: int = 0
    sources: List[str] = Field(default_factory=list)

    # Timestamps
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    class Settings:
        name = "trending_snapshots"
        indexes = [
            "analyzed_at",
        ]

    @classmethod
    async def get_latest(cls) -> Optional["TrendingSnapshot"]:
        """Get the most recent trending snapshot"""
        return await cls.find_one(sort=[("analyzed_at", -1)])

    @classmethod
    async def cleanup_old(cls, keep_hours: int = 24):
        """Remove snapshots older than specified hours"""
        cutoff = datetime.utcnow() - timedelta(hours=keep_hours)
        await cls.find(cls.analyzed_at < cutoff).delete()


class ContentTrendMatch(Document):
    """
    Links platform content to trending topics.
    Used to show "Trending in Israel" content recommendations.
    """

    content_id: str
    content_type: str  # vod, live, radio, podcast
    content_title: str

    # Matching info
    matched_topic: str
    matched_keywords: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0

    # Timestamps
    matched_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    class Settings:
        name = "content_trend_matches"
        indexes = [
            "content_id",
            "matched_at",
            "relevance_score",
        ]


# Response models for API
class TrendingTopicResponse(BaseModel):
    """API response for a single trending topic"""

    title: str
    title_en: Optional[str] = None
    category: str
    category_label: dict  # {he: "...", en: "..."}
    sentiment: str
    importance: int
    summary: Optional[str] = None
    keywords: List[str] = []

    class Config:
        from_attributes = True


class TrendingAnalysisResponse(BaseModel):
    """API response for trending analysis"""

    topics: List[TrendingTopicResponse]
    overall_mood: str
    top_story: Optional[str] = None
    analyzed_at: datetime
    headline_count: int
    sources: List[str]

    class Config:
        from_attributes = True


class TrendingContentResponse(BaseModel):
    """API response for content matched to trends"""

    id: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    type: str  # vod, live, radio, podcast
    trending_topic: str
    relevance_score: float

    class Config:
        from_attributes = True


# Import timedelta for cleanup function
from datetime import timedelta
