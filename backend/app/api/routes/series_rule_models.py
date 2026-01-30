"""
Pydantic models for series recording rules API routes.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.series_recording_rule import SeriesRecordingRule


class CreateSeriesRuleRequest(BaseModel):
    rule_name: str
    match_title: str
    match_type: str = "contains"
    channel_ids: Optional[list[str]] = None
    scope: str = "all_seasons"
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool = False
    dubbing_target_language: Optional[str] = None
    max_recordings: int = 0


class UpdateSeriesRuleRequest(BaseModel):
    rule_name: Optional[str] = None
    match_title: Optional[str] = None
    match_type: Optional[str] = None
    channel_ids: Optional[list[str]] = None
    scope: Optional[str] = None
    subtitle_enabled: Optional[bool] = None
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: Optional[bool] = None
    dubbing_target_language: Optional[str] = None
    is_active: Optional[bool] = None
    max_recordings: Optional[int] = None


class SeriesRuleResponse(BaseModel):
    id: str
    user_id: str
    rule_name: str
    match_title: str
    match_type: str
    channel_ids: list[str]
    scope: str
    subtitle_enabled: bool
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool
    dubbing_target_language: Optional[str] = None
    is_active: bool
    max_recordings: int
    recordings_count: int
    created_at: datetime
    updated_at: datetime
    last_matched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def rule_to_response(rule: SeriesRecordingRule) -> SeriesRuleResponse:
    """Convert SeriesRecordingRule to response model."""
    return SeriesRuleResponse(
        id=str(rule.id),
        user_id=rule.user_id,
        rule_name=rule.rule_name,
        match_title=rule.match_title,
        match_type=rule.match_type,
        channel_ids=rule.channel_ids,
        scope=rule.scope,
        subtitle_enabled=rule.subtitle_enabled,
        subtitle_target_language=rule.subtitle_target_language,
        dubbing_enabled=rule.dubbing_enabled,
        dubbing_target_language=rule.dubbing_target_language,
        is_active=rule.is_active,
        max_recordings=rule.max_recordings,
        recordings_count=rule.recordings_count,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        last_matched_at=rule.last_matched_at,
    )
