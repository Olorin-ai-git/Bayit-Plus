"""
User Subtitle Preferences Model
Stores user's preferred subtitle language for each content item.
Priority: User preference > Hebrew > English
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class SubtitlePreference(Document):
    """
    Store user's preferred subtitle language for specific content.
    Enables remembering subtitle choices per content per user.
    """

    user_id: Indexed(str)
    content_id: Indexed(str)
    preferred_language: str  # ISO 639-1 code: "en", "he", "es", etc.

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "subtitle_preferences"
        indexes = [
            [("user_id", 1), ("content_id", 1)],  # Compound index for fast lookups
            "user_id",
            "content_id",
        ]
