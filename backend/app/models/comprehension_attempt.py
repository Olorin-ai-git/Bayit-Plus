"""
Comprehension Attempt Models.

Tracks user answers to scene comprehension questions.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


class ComprehensionAttempt(Document):
    """User's answer to scene comprehension question."""

    user_id: str
    profile_id: Optional[str] = None
    content_id: str
    question_id: str

    # Answer details
    selected_option: int = Field(..., ge=0, le=3)
    is_correct: bool
    time_taken_ms: int

    # Scene context
    scene_start_time: float
    scene_end_time: float

    # Beta credits
    credits_deducted: int = Field(default=0)

    # Timestamp
    answered_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "comprehension_attempts"
        indexes = [
            "user_id",
            "content_id",
            [("user_id", 1), ("content_id", 1), ("answered_at", -1)],
        ]
