"""
Talk Back Point Models.

Defines interactive question points within content where characters
pause to ask children Hebrew questions.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class QuestionDifficulty(str, Enum):
    """Talk Back question difficulty."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class TalkBackPointModel(BaseModel):
    """Individual question point within a ContentTalkBack."""

    point_id: str = Field(...)
    timestamp_seconds: float = Field(
        ..., ge=0, description="Video timestamp to trigger question"
    )
    character_name: str = Field(..., max_length=100)
    character_name_he: str = Field(..., max_length=100)

    question_text: str = Field(..., max_length=300)
    question_text_he: str = Field(..., max_length=300)
    question_audio_url: Optional[str] = None

    expected_responses: List[str] = Field(
        ..., min_length=1,
        description="Acceptable Hebrew responses",
    )
    hint_text: str = Field(default="", max_length=200)
    hint_text_he: str = Field(default="", max_length=200)

    difficulty: QuestionDifficulty = Field(
        default=QuestionDifficulty.EASY
    )
    vocabulary_targets: List[str] = Field(default_factory=list)
    shekel_reward: int = Field(default=5, ge=1)
    points_reward: int = Field(default=10, ge=0)


class ContentTalkBack(Document):
    """
    Talk Back questions for a specific content item.

    Admin-created or AI-generated collection of question points.
    """

    content_id: str = Field(...)
    content_type: str = Field(
        default="movie", description="movie, episode, etc."
    )

    talk_back_points: List[TalkBackPointModel] = Field(
        default_factory=list
    )
    total_points: int = Field(default=0, ge=0)

    is_active: bool = Field(default=True)
    auto_generated: bool = Field(default=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "content_talk_back"
        indexes = [
            IndexModel([("content_id", 1)], unique=True),
            IndexModel([("is_active", 1)]),
        ]


class TalkBackPointResponse(BaseModel):
    """API response for a talk back point."""

    point_id: str
    timestamp_seconds: float
    character_name: str
    character_name_he: str
    question_text: str
    question_text_he: str
    question_audio_url: Optional[str] = None
    difficulty: str
    shekel_reward: int

    class Config:
        from_attributes = True
