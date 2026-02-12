"""Gamification profile model for level progression and perks."""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel

from app.core.config import settings

LEVEL_DEFINITIONS = [
    {"level": 1, "title": "Tourist", "title_he": "\u05EA\u05D9\u05D9\u05E8", "perk_outfit": "tel_aviv_tourist"},
    {"level": 2, "title": "Oleh Chadash", "title_he": "\u05E2\u05D5\u05DC\u05D4 \u05D7\u05D3\u05E9", "perk_outfit": "sherut_backpack"},
    {"level": 3, "title": "Talmid", "title_he": "\u05EA\u05DC\u05DE\u05D9\u05D3", "perk_outfit": "hebrew_school_satchel"},
    {"level": 5, "title": "Tzabar", "title_he": "\u05E6\u05D1\u05E8", "perk_outfit": "bamba_snack"},
    {"level": 7, "title": "Sabra", "title_he": "\u05E1\u05D1\u05E8\u05E1", "perk_outfit": "falafel_vendor"},
    {"level": 10, "title": "Madrich", "title_he": "\u05DE\u05D3\u05E8\u05D9\u05DA", "perk_outfit": "madrich_badge"},
]


class LevelUpRecord(BaseModel):
    """Record of a level-up event."""

    level: int
    reached_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    perks_unlocked: List[str] = Field(default_factory=list)


class UnlockedPerk(BaseModel):
    """A perk unlocked at a specific level."""

    perk_id: str
    perk_type: str = "outfit"
    level_unlocked: int
    unlocked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GamificationProfile(Document):
    """Tracks a child profile's level, XP, and unlocked perks."""

    user_id: Indexed(str)
    profile_id: Indexed(str)
    current_level: int = 1
    current_xp: int = 0
    total_xp: int = 0
    level_title: str = "Tourist"
    level_title_he: str = "\u05EA\u05D9\u05D9\u05E8"
    unlocked_perks: List[UnlockedPerk] = Field(default_factory=list)
    level_history: List[LevelUpRecord] = Field(default_factory=list)
    missions_completed: int = 0
    mirror_sessions: int = 0
    talk_back_attempts: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "gamification_profiles"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)], unique=True),
            IndexModel([("total_xp", -1)]),
        ]


class XPAwardResult(BaseModel):
    """Result of awarding XP."""

    xp_awarded: int
    total_xp: int
    current_xp: int
    current_level: int
    leveled_up: bool = False
    new_level: Optional[int] = None
    new_title: Optional[str] = None
    new_title_he: Optional[str] = None
    perks_unlocked: List[str] = Field(default_factory=list)


class GamificationProfileResponse(BaseModel):
    """API response for gamification profile."""

    current_level: int
    current_xp: int
    total_xp: int
    xp_to_next_level: int
    level_title: str
    level_title_he: str
    unlocked_perks: List[UnlockedPerk]
    missions_completed: int
    mirror_sessions: int
    talk_back_attempts: int

    class Config:
        from_attributes = True


class LeaderboardEntryResponse(BaseModel):
    """API response for leaderboard entry."""

    profile_id: str
    level: int
    total_xp: int
    level_title: str
    rank: int
