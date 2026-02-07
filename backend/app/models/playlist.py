"""
Playlist Model
Unified playlist document - individual documents per item.
Merges former Watchlist (save-for-later) and Playlist (ordered queue) into one concept.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field, field_validator

from app.core.logging_config import get_logger

logger = get_logger(__name__)

CONTENT_ID_PATTERN = r"^[a-zA-Z0-9_-]{1,64}$"


class ContentType(str, Enum):
    """Allowed content types for playlist items."""

    VOD = "vod"
    LIVE = "live"
    RADIO = "radio"
    PODCAST = "podcast"


class PlaylistItem(Document):
    """Individual playlist item - one document per item per user."""

    user_id: str
    profile_id: Optional[str] = None
    content_id: str = Field(..., pattern=CONTENT_ID_PATTERN)
    content_type: ContentType
    title: str = Field(..., min_length=1, max_length=500)
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    position: int = 0
    added_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("duration", mode="before")
    @classmethod
    def coerce_duration_to_str(cls, v: object) -> Optional[str]:
        """Coerce numeric duration values from MongoDB to string."""
        if v is None:
            return None
        return str(v)

    class Settings:
        name = "playlist_items"
        indexes = [
            "user_id",
            "profile_id",
            ("user_id", "content_id"),
            ("user_id", "profile_id", "content_id"),
            ("user_id", "position"),
        ]

    @field_validator("content_id")
    @classmethod
    def validate_content_id(cls, v: str) -> str:
        """Ensure content_id is safe against injection."""
        import re

        if not re.match(CONTENT_ID_PATTERN, v):
            raise ValueError("Invalid content_id format")
        return v


async def get_next_position(
    user_id: str, profile_id: Optional[str] = None
) -> int:
    """Get the next available position for a user's playlist."""
    query = {"user_id": user_id}
    if profile_id:
        query["profile_id"] = profile_id

    last_item = (
        await PlaylistItem.find(query)
        .sort("-position")
        .limit(1)
        .to_list()
    )
    if last_item:
        return last_item[0].position + 1
    return 0


async def recalculate_positions(
    user_id: str, profile_id: Optional[str] = None
) -> None:
    """Recalculate positions for all items in a user's playlist."""
    query = {"user_id": user_id}
    if profile_id:
        query["profile_id"] = profile_id

    items = (
        await PlaylistItem.find(query)
        .sort("position")
        .to_list()
    )
    for idx, item in enumerate(items):
        if item.position != idx:
            item.position = idx
            await item.save()
