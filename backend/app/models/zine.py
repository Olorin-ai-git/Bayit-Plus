"""
Weekly AI Zine Models.

Personalized Hebrew comics generated from viewing history.
Claude creates educational content matching the child's interests.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class ZineStatus(str, Enum):
    """Zine generation status."""

    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class ZinePage(BaseModel):
    """Single page of a zine."""

    page_number: int = Field(..., ge=1)
    title: str = Field(..., max_length=100)
    title_he: str = Field(..., max_length=100)
    content: str = Field(..., max_length=500)
    content_he: str = Field(..., max_length=500)
    image_url: Optional[str] = None
    vocabulary_words: List[str] = Field(default_factory=list)


class WeeklyZine(Document):
    """
    AI-generated personalized weekly zine.

    Created from viewing history with vocabulary targets.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)

    week_key: str = Field(
        ..., description="ISO week key, e.g. '2026-W07'"
    )
    title: str = Field(..., max_length=200)
    title_he: str = Field(..., max_length=200)
    description: str = Field(default="", max_length=500)
    description_he: str = Field(default="", max_length=500)
    cover_image_url: Optional[str] = None

    pages: List[ZinePage] = Field(default_factory=list)
    total_pages: int = Field(default=0, ge=0)

    vocabulary_targets: List[str] = Field(default_factory=list)
    content_themes: List[str] = Field(default_factory=list)

    status: ZineStatus = Field(default=ZineStatus.PENDING)
    viewed: bool = Field(default=False)
    viewed_at: Optional[datetime] = None

    generated_at: Optional[datetime] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "weekly_zines"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("week_key", 1)],
                unique=True,
            ),
            IndexModel([("status", 1)]),
            IndexModel([("created_at", -1)]),
        ]


class ZinePageResponse(BaseModel):
    """API response for a zine page."""

    page_number: int
    title: str
    title_he: str
    content: str
    content_he: str
    image_url: Optional[str] = None
    vocabulary_words: List[str]

    class Config:
        from_attributes = True


class ZineResponse(BaseModel):
    """API response for a weekly zine."""

    id: str
    week_key: str
    title: str
    title_he: str
    description: str
    description_he: str
    cover_image_url: Optional[str] = None
    pages: List[ZinePageResponse]
    total_pages: int
    status: str
    viewed: bool

    class Config:
        from_attributes = True


class ZineListResponse(BaseModel):
    """API response for zine archive list."""

    zines: List[ZineResponse]
    total: int
