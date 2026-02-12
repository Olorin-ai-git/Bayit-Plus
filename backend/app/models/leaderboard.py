"""
Leaderboard Models.

Pre-computed leaderboard entries for global, friends, and family rankings.
Recalculated periodically via background task.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class LeaderboardScope(str, Enum):
    """Leaderboard ranking scope."""

    GLOBAL = "global"
    FRIENDS = "friends"
    FAMILY = "family"


class LeaderboardPeriod(str, Enum):
    """Leaderboard time period."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


class LeaderboardEntry(Document):
    """
    Pre-computed leaderboard rank entry.

    Recalculated on a schedule to avoid expensive real-time queries.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)
    display_name: str = Field(..., max_length=50)
    avatar_url: Optional[str] = None

    scope: LeaderboardScope
    period: LeaderboardPeriod
    period_key: str = Field(
        ..., description="Date key, e.g. '2026-02-12' or '2026-W07'"
    )

    rank: int = Field(..., ge=1)
    total_points: int = Field(default=0, ge=0)
    total_shekels: int = Field(default=0, ge=0)
    missions_completed: int = Field(default=0, ge=0)
    quizzes_completed: int = Field(default=0, ge=0)
    current_streak: int = Field(default=0, ge=0)

    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "leaderboard_entries"
        indexes = [
            IndexModel(
                [
                    ("scope", 1),
                    ("period", 1),
                    ("period_key", 1),
                    ("rank", 1),
                ]
            ),
            IndexModel(
                [
                    ("user_id", 1),
                    ("profile_id", 1),
                    ("scope", 1),
                    ("period", 1),
                    ("period_key", 1),
                ],
                unique=True,
            ),
            IndexModel([("computed_at", -1)]),
        ]


class LeaderboardEntryResponse(BaseModel):
    """API response for a single leaderboard entry."""

    rank: int
    display_name: str
    avatar_url: Optional[str] = None
    total_points: int
    total_shekels: int
    missions_completed: int
    current_streak: int
    is_current_user: bool = False

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    """API response for a leaderboard page."""

    scope: str
    period: str
    entries: List[LeaderboardEntryResponse]
    total_participants: int
    my_rank: Optional[int] = None
    page: int
    page_size: int
