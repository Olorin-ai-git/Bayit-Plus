"""
Character model for VOD interaction character data.

Stores character metadata (voice IDs, face URLs, franchise grouping)
as content data in MongoDB rather than infrastructure config/secrets.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class Character(Document):
    """A named character with an ElevenLabs voice clone and optional face asset."""

    name: str = Field(..., description="Display name (e.g. 'Doc Brown')")
    voice_id: str = Field(..., description="ElevenLabs voice clone ID")
    face_url: Optional[str] = Field(
        default=None, description="GCS URL of character face/still frame"
    )
    description: Optional[str] = Field(
        default=None, description="Personality description for AI prompts"
    )
    franchise: Optional[str] = Field(
        default=None, description="Grouping key: 'bttf', 'torah', etc."
    )
    actor_name: Optional[str] = Field(
        default=None, description="Real-world actor name"
    )
    gender: Optional[str] = Field(
        default=None, description="'male' or 'female'"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "characters"
        indexes = [
            IndexModel([("name", 1)], unique=True),
            IndexModel([("franchise", 1)]),
        ]
