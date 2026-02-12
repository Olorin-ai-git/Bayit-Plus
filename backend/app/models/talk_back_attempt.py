"""
Talk Back Attempt Models.

Records of children's voice responses to Talk Back questions,
including transcription, language detection, accuracy, and rewards.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class ResponseQuality(str, Enum):
    """Quality rating of a Talk Back response."""

    EXACT_MATCH = "exact_match"
    CORRECT_ROOT = "correct_root"
    CLOSE_PHONETIC = "close_phonetic"
    RIGHT_LANGUAGE = "right_language"
    WRONG_LANGUAGE = "wrong_language"
    NO_RESPONSE = "no_response"


QUALITY_SCORE_MAP = {
    ResponseQuality.EXACT_MATCH: 1.0,
    ResponseQuality.CORRECT_ROOT: 0.7,
    ResponseQuality.CLOSE_PHONETIC: 0.5,
    ResponseQuality.RIGHT_LANGUAGE: 0.2,
    ResponseQuality.WRONG_LANGUAGE: 0.0,
    ResponseQuality.NO_RESPONSE: 0.0,
}


class TalkBackAttempt(Document):
    """
    Record of a child's response to a Talk Back question.

    Stores transcription, evaluation, and reward data.
    """

    user_id: str = Field(...)
    profile_id: str = Field(...)
    content_id: str = Field(...)
    point_id: str = Field(...)

    response_transcript: str = Field(
        default="", max_length=500
    )
    detected_language: str = Field(
        default="unknown", max_length=10
    )
    hebrew_ratio: float = Field(
        default=0.0, ge=0.0, le=1.0
    )

    quality: ResponseQuality = Field(
        default=ResponseQuality.NO_RESPONSE
    )
    accuracy_score: float = Field(
        default=0.0, ge=0.0, le=1.0
    )
    shekels_earned: int = Field(default=0, ge=0)
    points_earned: int = Field(default=0, ge=0)

    response_time_ms: int = Field(
        default=0, ge=0,
        description="Time from question to response start",
    )
    audio_duration_ms: int = Field(
        default=0, ge=0,
        description="Duration of the voice response",
    )

    hint_used: bool = Field(default=False)
    feedback_text: str = Field(default="", max_length=300)
    feedback_text_he: str = Field(default="", max_length=300)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "talk_back_attempts"
        indexes = [
            IndexModel(
                [
                    ("user_id", 1),
                    ("profile_id", 1),
                    ("content_id", 1),
                ]
            ),
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("point_id", 1)]
            ),
            IndexModel([("created_at", -1)]),
            IndexModel([("quality", 1)]),
        ]


class TalkBackAttemptResponse(BaseModel):
    """API response for a Talk Back attempt result."""

    quality: str
    accuracy_score: float
    shekels_earned: int
    points_earned: int
    feedback_text: str
    feedback_text_he: str
    detected_language: str
    hint_used: bool

    class Config:
        from_attributes = True


class TalkBackStatsResponse(BaseModel):
    """API response for Talk Back statistics."""

    total_attempts: int
    total_shekels_earned: int
    average_accuracy: float
    hebrew_response_rate: float
    words_learned: int
