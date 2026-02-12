"""
Bilingual Dubbing Session Model.

Tracks per-session state for the progressive bilingual dubbing system.
Records language ratio, vocabulary introduced, and recognition metrics.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class VocabularyIntroduction(BaseModel):
    """Record of a Hebrew word introduced during dubbing."""

    word: str
    introduced_at_seconds: float = Field(
        ..., ge=0, description="Video timestamp of introduction"
    )
    recognized: bool = Field(default=False)
    context: str = Field(default="", max_length=200)


class BilingualDubbingSession(Document):
    """
    Tracks a bilingual dubbing session.

    Records ratio adjustments, vocabulary metrics, and listening data.
    """

    user_id: str = Field(...)
    profile_id: str = Field(...)
    content_id: str = Field(...)
    session_id: str = Field(...)

    target_hebrew_ratio: float = Field(
        default=0.2, ge=0.0, le=1.0,
        description="Target Hebrew content ratio for this session",
    )
    actual_hebrew_ratio: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Measured Hebrew ratio during session",
    )

    hebrew_segments_count: int = Field(default=0, ge=0)
    english_segments_count: int = Field(default=0, ge=0)
    total_segments: int = Field(default=0, ge=0)

    vocabulary_introduced: List[VocabularyIntroduction] = Field(
        default_factory=list
    )
    vocabulary_recognized: int = Field(default=0, ge=0)

    session_duration_seconds: float = Field(default=0.0, ge=0.0)
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    ended_at: Optional[datetime] = None

    class Settings:
        name = "bilingual_dubbing_sessions"
        indexes = [
            IndexModel(
                [
                    ("user_id", 1),
                    ("profile_id", 1),
                    ("content_id", 1),
                ]
            ),
            IndexModel([("session_id", 1)], unique=True),
            IndexModel([("started_at", -1)]),
        ]


class BilingualSessionResponse(BaseModel):
    """API response for a bilingual dubbing session."""

    session_id: str
    content_id: str
    target_hebrew_ratio: float
    actual_hebrew_ratio: float
    vocabulary_introduced_count: int
    vocabulary_recognized: int
    session_duration_seconds: float

    class Config:
        from_attributes = True
