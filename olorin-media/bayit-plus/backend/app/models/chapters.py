"""
Video Chapters Models.
Stores AI-generated chapters for content navigation.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class ChapterItemModel(BaseModel):
    """A single chapter within a video"""

    start_time: float  # seconds
    end_time: float  # seconds
    title: str
    title_en: Optional[str] = None
    category: str = "general"
    summary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


class VideoChapters(Document):
    """
    Stores chapters for a piece of content.
    Chapters can be AI-generated or manually created.
    """

    content_id: str
    content_type: str = "vod"  # vod, live (for recorded live content)
    content_title: str

    # Chapter data
    chapters: List[ChapterItemModel] = Field(default_factory=list)
    total_duration: float = 0.0

    # Generation info
    source: str = "ai"  # ai, manual, default
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    # Status
    is_approved: bool = False  # Manual approval for AI-generated
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "video_chapters"
        indexes = [
            "content_id",
            "content_type",
        ]

    @classmethod
    async def get_for_content(cls, content_id: str) -> Optional["VideoChapters"]:
        """Get chapters for a specific content"""
        return await cls.find_one(cls.content_id == content_id)

    @classmethod
    async def create_or_update(
        cls,
        content_id: str,
        content_type: str,
        content_title: str,
        chapters: List[ChapterItemModel],
        total_duration: float,
        source: str = "ai",
    ) -> "VideoChapters":
        """Create new chapters or update existing"""
        existing = await cls.get_for_content(content_id)

        if existing:
            existing.chapters = chapters
            existing.total_duration = total_duration
            existing.source = source
            existing.updated_at = datetime.now(timezone.utc)
            existing.is_approved = False  # Reset approval on update
            await existing.save()
            return existing

        new_chapters = cls(
            content_id=content_id,
            content_type=content_type,
            content_title=content_title,
            chapters=chapters,
            total_duration=total_duration,
            source=source,
        )
        await new_chapters.insert()
        return new_chapters


# API Response Models
class ChapterResponse(BaseModel):
    """API response for a single chapter"""

    start_time: float
    end_time: float
    title: str
    title_en: Optional[str] = None
    category: str
    category_info: dict  # {he, en, icon}
    summary: Optional[str] = None
    keywords: List[str] = []
    formatted_start: str  # MM:SS or HH:MM:SS
    formatted_end: str

    class Config:
        from_attributes = True


class VideoChaptersResponse(BaseModel):
    """API response for video chapters"""

    content_id: str
    content_title: str
    total_duration: float
    chapters: List[ChapterResponse]
    source: str
    generated_at: datetime
    is_approved: bool

    class Config:
        from_attributes = True
