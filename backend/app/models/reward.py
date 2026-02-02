"""
Reward Models - Points, badges, and achievements for kids quiz feature.

Follows BetaCredit pattern for user rewards with per-profile support.
"""

from datetime import datetime
from typing import Dict, List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field, field_validator


class Badge(Document):
    """Badge definition for achievements."""

    badge_id: Indexed(str, unique=True)  # type: ignore
    name: str = Field(..., min_length=1, max_length=50)
    name_he: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=200)
    description_he: str = Field(..., min_length=1, max_length=200)
    icon_url: str = Field(..., description="URL to badge icon asset")
    requirement_type: str = Field(
        ...,
        pattern="^(quizzes_completed|perfect_scores|streak_days|total_points)$",
        description="Type of requirement to earn badge",
    )
    requirement_value: int = Field(..., ge=1, description="Value needed to earn badge")
    points_bonus: int = Field(default=0, ge=0, description="Bonus points when earned")
    rarity: str = Field(
        "common", pattern="^(common|uncommon|rare|epic|legendary)$"
    )
    is_active: bool = Field(default=True, description="Whether badge can be earned")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "badges"
        indexes = [
            "badge_id",
            "rarity",
            "requirement_type",
            "is_active",
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "badge_id": "first_quiz",
                "name": "First Quiz",
                "name_he": "החידון הראשון",
                "description": "Complete your first quiz",
                "description_he": "השלם את החידון הראשון שלך",
                "icon_url": "/assets/badges/first_quiz.svg",
                "requirement_type": "quizzes_completed",
                "requirement_value": 1,
                "points_bonus": 25,
                "rarity": "common",
                "is_active": True,
            }
        }


class UserReward(Document):
    """User rewards state including points, streaks, and earned badges."""

    user_id: str = Field(..., description="Reference to User document")
    profile_id: Optional[str] = Field(
        None, description="Reference to Profile document (for kids profiles)"
    )

    # Points
    total_points: int = Field(default=0, ge=0)

    # Quiz stats
    quizzes_completed: int = Field(default=0, ge=0)
    perfect_scores: int = Field(default=0, ge=0)

    # Streak tracking
    current_streak: int = Field(default=0, ge=0)
    longest_streak: int = Field(default=0, ge=0)
    last_quiz_date: Optional[str] = Field(
        None, description="ISO date string (YYYY-MM-DD)"
    )
    streak_timezone: str = Field(
        "Asia/Jerusalem", description="Timezone for streak calculation"
    )

    # Badges
    earned_badges: List[str] = Field(
        default_factory=list, description="List of earned badge IDs"
    )
    badge_earned_dates: Dict[str, str] = Field(
        default_factory=dict, description="Map of badge_id to ISO date earned"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("last_quiz_date")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate ISO date format if provided."""
        if v is not None:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError("last_quiz_date must be in YYYY-MM-DD format")
        return v

    class Settings:
        name = "user_rewards"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
            [("total_points", -1)],
            [("quizzes_completed", -1)],
            [("current_streak", -1)],
            # Profile leaderboard index
            [("user_id", 1), ("total_points", -1)],
        ]
        unique_indexes = [
            {"keys": [("user_id", 1), ("profile_id", 1)], "unique": True}
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "profile_id": "507f1f77bcf86cd799439012",
                "total_points": 250,
                "quizzes_completed": 10,
                "perfect_scores": 3,
                "current_streak": 5,
                "longest_streak": 7,
                "last_quiz_date": "2026-02-01",
                "streak_timezone": "Asia/Jerusalem",
                "earned_badges": ["first_quiz", "quiz_rookie", "perfect_start"],
            }
        }

    def has_badge(self, badge_id: str) -> bool:
        """Check if user has earned a specific badge."""
        return badge_id in self.earned_badges


class BadgeResponse(BaseModel):
    """API response for badge."""

    badge_id: str
    name: str
    name_he: str
    description: str
    description_he: str
    icon_url: str
    rarity: str
    points_bonus: int
    earned: bool = False
    earned_date: Optional[str] = None

    class Config:
        from_attributes = True


class UserRewardResponse(BaseModel):
    """API response for user rewards."""

    total_points: int
    quizzes_completed: int
    perfect_scores: int
    current_streak: int
    longest_streak: int
    earned_badges: List[BadgeResponse]

    class Config:
        from_attributes = True


class RewardStatsResponse(BaseModel):
    """API response for quick reward stats (for UI display)."""

    total_points: int
    current_streak: int
    badges_count: int
    quizzes_completed: int
