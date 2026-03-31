"""Training progress tracking model."""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel


class QuizAttempt(BaseModel):
    """Record of a single quiz attempt."""

    quiz_id: str
    score: int = Field(ge=0)
    max_score: int = Field(ge=1)
    completed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class TalkBackAttempt(BaseModel):
    """Record of a single talk-back voice response."""

    prompt_id: str
    score: float = Field(ge=0.0, le=1.0)
    feedback: str = Field(default="")
    completed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class TrainingProgress(Document):
    """Per-user, per-content progress tracking."""

    user_id: str = Field(..., description="TrainingUser ID")
    partner_id: str = Field(..., description="Organization partner_id")
    content_id: str = Field(..., description="Content document ID")

    watch_percentage: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Fraction of video watched (0.0 to 1.0)",
    )
    last_position_seconds: int = Field(
        default=0, ge=0,
        description="Last playback position in seconds",
    )
    total_watch_time_seconds: int = Field(
        default=0, ge=0,
        description="Cumulative watch time in seconds",
    )

    quiz_scores: List[QuizAttempt] = Field(default_factory=list)
    talk_back_scores: List[TalkBackAttempt] = Field(default_factory=list)
    pause_ask_count: int = Field(default=0, ge=0)
    companion_queries: int = Field(default=0, ge=0)

    first_watched: Optional[datetime] = Field(default=None)
    last_watched: Optional[datetime] = Field(default=None)
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "training_progress"
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("content_id", ASCENDING)],
                unique=True,
                name="user_content_unique",
            ),
            "partner_id",
            [("partner_id", 1), ("content_id", 1)],
            [("partner_id", 1), ("user_id", 1)],
        ]
