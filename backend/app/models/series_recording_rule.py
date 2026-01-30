"""
Series Recording Rule Model
Persistent rules that auto-match future EPG entries and schedule recordings.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


class SeriesRecordingRule(Document):
    """
    User-defined rule for automatically recording matching EPG entries.

    Rules match EPG entries by title pattern and optionally by channel,
    then auto-create RecordingSchedule documents for matching programs.
    """

    user_id: str
    rule_name: str
    match_title: str
    match_type: str = "contains"  # "exact", "contains", "starts_with"
    channel_ids: list[str] = Field(default_factory=list)
    scope: str = "all_seasons"  # "episode", "season", "all_seasons"

    # Recording options
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool = False
    dubbing_target_language: Optional[str] = None

    # State
    is_active: bool = True
    max_recordings: int = 0  # 0 = unlimited
    recordings_count: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_matched_at: Optional[datetime] = None

    class Settings:
        name = "series_recording_rules"
        indexes = [
            [("user_id", 1), ("is_active", 1)],
            [("user_id", 1), ("is_active", 1), ("created_at", -1)],
            [("is_active", 1), ("match_title", 1)],
            [("match_title", 1), ("match_type", 1)],
        ]
