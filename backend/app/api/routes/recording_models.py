"""
Recording API Request/Response Models
Pydantic models for recording endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StartRecordingRequest(BaseModel):
    channel_id: str
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None
    dubbing_enabled: bool = False
    dubbing_target_language: Optional[str] = None


class StopRecordingResponse(BaseModel):
    recording_id: str
    duration_seconds: int
    file_size_bytes: int
    status: str


class RecordingSessionResponse(BaseModel):
    id: str
    recording_id: str
    channel_id: str
    channel_name: str
    started_at: datetime
    status: str
    duration_seconds: int
    file_size_bytes: int
    subtitle_enabled: bool
    subtitle_target_language: Optional[str] = None

    class Config:
        from_attributes = True


class RecordingResponse(BaseModel):
    id: str
    channel_name: str
    title: str
    description: Optional[str]
    thumbnail: Optional[str]
    recorded_at: datetime
    duration_seconds: int
    file_size_bytes: int
    video_url: str
    subtitle_url: Optional[str]
    dubbed_audio_url: Optional[str] = None
    dubbed_audio_language: Optional[str] = None
    program_title: Optional[str] = None
    epg_entry_id: Optional[str] = None
    series_rule_id: Optional[str] = None
    auto_delete_at: datetime
    view_count: int

    class Config:
        from_attributes = True


class PaginatedRecordingsResponse(BaseModel):
    items: list[RecordingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class QuotaResponse(BaseModel):
    total_storage_bytes: int
    used_storage_bytes: int
    available_storage_bytes: int
    storage_usage_percentage: float
    total_storage_formatted: str
    used_storage_formatted: str
    available_storage_formatted: str
    max_recording_duration_seconds: int
    max_recording_duration_formatted: str
    max_concurrent_recordings: int
    active_recordings: int
    total_recordings: int


def recording_to_response(recording) -> RecordingResponse:
    """Convert a Recording document to RecordingResponse."""
    return RecordingResponse(
        id=recording.id,
        channel_name=recording.channel_name,
        title=recording.title,
        description=recording.description,
        thumbnail=recording.thumbnail,
        recorded_at=recording.recorded_at,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes,
        video_url=recording.video_url,
        subtitle_url=recording.subtitle_url,
        dubbed_audio_url=getattr(recording, "dubbed_audio_url", None),
        dubbed_audio_language=getattr(recording, "dubbed_audio_language", None),
        program_title=getattr(recording, "program_title", None),
        epg_entry_id=getattr(recording, "epg_entry_id", None),
        series_rule_id=getattr(recording, "series_rule_id", None),
        auto_delete_at=recording.auto_delete_at,
        view_count=recording.view_count,
    )


def session_to_response(session) -> RecordingSessionResponse:
    """Convert a RecordingSession document to RecordingSessionResponse."""
    return RecordingSessionResponse(
        id=str(session.id),
        recording_id=session.recording_id,
        channel_id=session.channel_id,
        channel_name=session.channel_name,
        started_at=session.started_at,
        status=session.status,
        duration_seconds=session.duration_seconds,
        file_size_bytes=session.file_size_bytes,
        subtitle_enabled=session.subtitle_enabled,
        subtitle_target_language=session.subtitle_target_language,
    )
