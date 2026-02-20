"""
Recording Mutation Routes
Endpoints for starting, stopping, and deleting recordings.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models.content import LiveChannel
from app.models.recording import RecordingSession, Recording
from app.models.user import User
from app.services.live_recording_service import live_recording_service
from app.services.recording_quota_service import recording_quota_service

from .recording_models import (
    RecordingResponse,
    RecordingSessionResponse,
    StartRecordingRequest,
    recording_to_response,
    session_to_response,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user has premium access."""
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
    """Start manual recording of live channel. Requires premium subscription."""
    try:
        channel = await LiveChannel.get(request.channel_id)
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found"
            )

        if not channel.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Channel is not active"
            )

        existing_session = await live_recording_service.get_active_session(
            str(current_user.id), request.channel_id
        )
        if existing_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recording already in progress on this channel",
            )

        quota_check = await recording_quota_service.check_quota(str(current_user.id))
        if not quota_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=quota_check["reason"]
            )

        session = await live_recording_service.start_recording(
            user_id=str(current_user.id),
            channel_id=request.channel_id,
            stream_url=channel.stream_url,
            subtitle_enabled=request.subtitle_enabled,
            subtitle_target_language=request.subtitle_target_language,
            dubbing_enabled=request.dubbing_enabled,
            dubbing_target_language=request.dubbing_target_language,
            trigger_type="manual",
        )

        return session_to_response(session)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to start recording", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start recording",
        )


@router.post("/{session_id}/stop", response_model=RecordingResponse)
async def stop_recording(
    session_id: str, current_user: User = Depends(get_current_premium_user)
):
    """Stop active recording. Requires premium subscription and session ownership."""
    try:
        session = await RecordingSession.find_one({"recording_id": session_id})
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

        recording = await live_recording_service.stop_recording(
            session.recording_id, str(current_user.id)
        )

        return recording_to_response(recording)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to stop recording", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop recording",
        )


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str, current_user: User = Depends(get_current_active_user)
):
    """Delete recording and release quota."""
    try:
        recording = await Recording.get(recording_id)
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
            )

        if recording.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this recording",
            )

        await recording_quota_service.release_quota(
            recording.user_id, recording.file_size_bytes
        )

        from app.core.storage import get_storage_provider

        storage = get_storage_provider()
        if recording.video_url:
            await storage.delete_file(recording.video_url)
        if recording.subtitle_url:
            await storage.delete_file(recording.subtitle_url)

        await recording.delete()
        return {"message": "Recording deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete recording", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recording",
        )
