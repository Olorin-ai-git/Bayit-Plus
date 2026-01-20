"""
Recording API Routes
Endpoints for managing live stream recordings
"""

from datetime import datetime
from typing import Optional

from app.core.security import get_current_active_user
from app.models.content import LiveChannel
from app.models.recording import Recording, RecordingSchedule, RecordingSession
from app.models.user import User
from app.services.live_recording_service import live_recording_service
from app.services.recording_quota_service import recording_quota_service
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

router = APIRouter()


# Request/Response Models
class StartRecordingRequest(BaseModel):
    channel_id: str
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None


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


def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user has premium access"""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for recording feature",
        )
    return current_user


@router.post("/start", response_model=RecordingSessionResponse)
async def start_recording(
    request: StartRecordingRequest,
    current_user: User = Depends(get_current_premium_user),
):
    """
    Start manual recording of live channel.

    Requires premium subscription.
    """
    try:
        # Validate channel exists and is active
        channel = await LiveChannel.get(request.channel_id)
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found"
            )

        if not channel.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Channel is not active"
            )

        # Check if user already has an active recording
        existing_session = await live_recording_service.get_active_session(
            str(current_user.id), request.channel_id
        )

        if existing_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recording already in progress on {existing_session.channel_name}",
            )

        # Check quota
        quota_check = await recording_quota_service.check_quota(str(current_user.id))

        if not quota_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=quota_check["reason"]
            )

        # Start recording
        session = await live_recording_service.start_recording(
            user_id=str(current_user.id),
            channel_id=request.channel_id,
            stream_url=channel.stream_url,
            subtitle_enabled=request.subtitle_enabled,
            subtitle_target_language=request.subtitle_target_language,
            trigger_type="manual",
        )

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start recording: {str(e)}",
        )


@router.post("/{session_id}/stop", response_model=RecordingResponse)
async def stop_recording(
    session_id: str, current_user: User = Depends(get_current_premium_user)
):
    """
    Stop active recording.

    Requires premium subscription and session ownership.
    """
    try:
        # Verify session exists and belongs to user
        session = await RecordingSession.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recording session not found",
            )

        if session.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to stop this recording",
            )

        # Stop recording
        recording = await live_recording_service.stop_recording(
            session_id, str(current_user.id)
        )

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
            auto_delete_at=recording.auto_delete_at,
            view_count=recording.view_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop recording: {str(e)}",
        )


@router.get("", response_model=PaginatedRecordingsResponse)
async def list_recordings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
):
    """
    List user's recordings with pagination.
    """
    try:
        # Calculate skip
        skip = (page - 1) * page_size

        # Get total count
        total = await Recording.find(Recording.user_id == str(current_user.id)).count()

        # Get recordings
        recordings = (
            await Recording.find(Recording.user_id == str(current_user.id))
            .sort(-Recording.recorded_at)
            .skip(skip)
            .limit(page_size)
            .to_list()
        )

        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size

        items = [
            RecordingResponse(
                id=r.id,
                channel_name=r.channel_name,
                title=r.title,
                description=r.description,
                thumbnail=r.thumbnail,
                recorded_at=r.recorded_at,
                duration_seconds=r.duration_seconds,
                file_size_bytes=r.file_size_bytes,
                video_url=r.video_url,
                subtitle_url=r.subtitle_url,
                auto_delete_at=r.auto_delete_at,
                view_count=r.view_count,
            )
            for r in recordings
        ]

        return PaginatedRecordingsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list recordings: {str(e)}",
        )


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Get recording details.

    Updates view count and last viewed timestamp.
    """
    try:
        recording = await Recording.get(recording_id)
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
            )

        # Verify ownership
        if recording.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this recording",
            )

        # Update view stats
        recording.view_count += 1
        recording.last_viewed_at = datetime.utcnow()
        await recording.save()

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
            auto_delete_at=recording.auto_delete_at,
            view_count=recording.view_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recording: {str(e)}",
        )


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str, current_user: User = Depends(get_current_active_user)
):
    """
    Delete recording and release quota.
    """
    try:
        recording = await Recording.get(recording_id)
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
            )

        # Verify ownership
        if recording.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this recording",
            )

        # Release quota
        await recording_quota_service.release_quota(
            recording.user_id, recording.file_size_bytes
        )

        # Delete files from storage (local/S3/GCS)
        from app.core.storage import get_storage_provider

        storage = get_storage_provider()

        if recording.video_url:
            await storage.delete_file(recording.video_url)
        if recording.subtitle_url:
            await storage.delete_file(recording.subtitle_url)

        # Delete recording document
        await recording.delete()

        return {"message": "Recording deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete recording: {str(e)}",
        )


@router.get("/active/sessions", response_model=list[RecordingSessionResponse])
async def get_active_recordings(current_user: User = Depends(get_current_active_user)):
    """
    Get user's active recording sessions.
    """
    try:
        sessions = await RecordingSession.find(
            RecordingSession.user_id == str(current_user.id),
            RecordingSession.status == "recording",
        ).to_list()

        return [
            RecordingSessionResponse(
                id=str(s.id),
                recording_id=s.recording_id,
                channel_id=s.channel_id,
                channel_name=s.channel_name,
                started_at=s.started_at,
                status=s.status,
                duration_seconds=s.duration_seconds,
                file_size_bytes=s.file_size_bytes,
                subtitle_enabled=s.subtitle_enabled,
                subtitle_target_language=s.subtitle_target_language,
            )
            for s in sessions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active recordings: {str(e)}",
        )


@router.get("/quota/status", response_model=QuotaResponse)
async def get_recording_quota(current_user: User = Depends(get_current_active_user)):
    """
    Get user's recording quota status.
    """
    try:
        quota_summary = await recording_quota_service.get_quota_summary(
            str(current_user.id)
        )

        return QuotaResponse(**quota_summary)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get quota status: {str(e)}",
        )
