"""
Pydantic models for recording schedule API routes.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.recording import RecordingSchedule


class ScheduleRecordingRequest(BaseModel):
    epg_entry_id: str
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool = False
    dubbing_target_language: Optional[str] = None


class ScheduleResponse(BaseModel):
    id: str
    user_id: str
    channel_id: str
    channel_name: str
    program_title: str
    start_time: datetime
    end_time: datetime
    subtitle_enabled: bool
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool
    dubbing_target_language: Optional[str] = None
    series_rule_id: Optional[str] = None
    epg_entry_id: Optional[str] = None
    status: str
    recording_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicting_schedules: list[ScheduleResponse]


def schedule_to_response(schedule: RecordingSchedule) -> ScheduleResponse:
    """Convert RecordingSchedule document to response model."""
    return ScheduleResponse(
        id=str(schedule.id),
        user_id=schedule.user_id,
        channel_id=schedule.channel_id,
        channel_name=schedule.channel_name,
        program_title=schedule.program_title,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        subtitle_enabled=schedule.subtitle_enabled,
        subtitle_target_language=schedule.subtitle_target_language,
        dubbing_enabled=schedule.dubbing_enabled,
        dubbing_target_language=schedule.dubbing_target_language,
        series_rule_id=schedule.series_rule_id,
        epg_entry_id=schedule.epg_entry_id,
        status=schedule.status,
        recording_id=schedule.recording_id,
        created_at=schedule.created_at,
    )
