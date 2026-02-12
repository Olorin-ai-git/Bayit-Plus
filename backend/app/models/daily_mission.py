"""
Daily Mission Models.

Mission templates (admin-defined) and user mission instances (per-profile).
Missions reset daily and track progress toward completion.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class MissionType(str, Enum):
    """Types of daily missions."""

    WATCH_CONTENT = "watch_content"
    COMPLETE_QUIZ = "complete_quiz"
    MAINTAIN_STREAK = "maintain_streak"
    EXPLORE_GENRE = "explore_genre"
    USE_SUBTITLES = "use_subtitles"
    TALK_BACK = "talk_back"
    LEARN_PHRASES = "learn_phrases"


class MissionDifficulty(str, Enum):
    """Mission difficulty levels."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class MissionTemplate(Document):
    """
    Admin-defined mission blueprint.

    Templates are randomly selected each day to generate user missions.
    """

    template_id: str = Field(..., description="Unique template identifier")
    mission_type: MissionType
    difficulty: MissionDifficulty

    title: str = Field(..., min_length=1, max_length=100)
    title_he: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=300)
    description_he: str = Field(..., min_length=1, max_length=300)

    icon_name: str = Field(..., description="Icon from @olorin/icons")
    target_value: int = Field(..., ge=1, description="Target to complete")
    shekel_reward: int = Field(..., ge=1, description="Shekels earned")
    points_reward: int = Field(default=0, ge=0)

    requirements: dict = Field(
        default_factory=dict,
        description="Extra requirements (genre, content_type, etc.)",
    )

    is_active: bool = Field(default=True)
    min_age: int = Field(default=0, ge=0)
    max_age: int = Field(default=99, ge=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "mission_templates"
        indexes = [
            IndexModel([("template_id", 1)], unique=True),
            "mission_type",
            "difficulty",
            "is_active",
        ]


class MissionStatus(str, Enum):
    """User mission progress status."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CLAIMED = "claimed"
    EXPIRED = "expired"


class UserMission(Document):
    """
    User's daily mission instance.

    Generated daily from templates. Tracks progress and claim status.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)
    template_id: str = Field(...)
    mission_type: MissionType

    title: str
    title_he: str
    description: str
    description_he: str
    icon_name: str

    target_value: int = Field(..., ge=1)
    current_value: int = Field(default=0, ge=0)
    shekel_reward: int = Field(..., ge=1)
    points_reward: int = Field(default=0, ge=0)

    status: MissionStatus = Field(default=MissionStatus.ACTIVE)
    mission_date: str = Field(
        ..., description="ISO date string (YYYY-MM-DD)"
    )

    completed_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "user_missions"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("mission_date", 1)]
            ),
            IndexModel([("user_id", 1), ("status", 1)]),
            IndexModel([("mission_date", 1)]),
        ]

    @property
    def progress_percent(self) -> int:
        if self.target_value == 0:
            return 100
        return min(
            100, int((self.current_value / self.target_value) * 100)
        )

    @property
    def is_complete(self) -> bool:
        return self.current_value >= self.target_value


class MissionResponse(BaseModel):
    """API response for a user mission."""

    id: str
    mission_type: str
    title: str
    title_he: str
    description: str
    description_he: str
    icon_name: str
    target_value: int
    current_value: int
    progress_percent: int
    shekel_reward: int
    points_reward: int
    status: str
    mission_date: str

    class Config:
        from_attributes = True


class DailyMissionsResponse(BaseModel):
    """API response for daily missions list."""

    missions: List[MissionResponse]
    date: str
    total_available_shekels: int
