"""
Recording Query Routes
Read-only endpoints for recordings: list, get, active sessions, quota.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_active_user
from app.models.recording import Recording, RecordingSession
from app.models.user import User

from .recording_models import (
    PaginatedRecordingsResponse,
    QuotaResponse,
    RecordingResponse,
    RecordingSessionResponse,
    recording_to_response,
    session_to_response,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedRecordingsResponse)
async def list_recordings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
):
    """List user's recordings with pagination."""
    try:
        skip = (page - 1) * page_size
        total = await Recording.find({"user_id": str(current_user.id)}).count()

        recordings = (
            await Recording.find({"user_id": str(current_user.id)})
            .sort(-Recording.recorded_at)
            .skip(skip)
            .limit(page_size)
            .to_list()
        )

        total_pages = (total + page_size - 1) // page_size
        items = [recording_to_response(r) for r in recordings]

        return PaginatedRecordingsResponse(
            items=items, total=total, page=page,
            page_size=page_size, total_pages=total_pages,
        )

    except Exception as e:
        logger.error("Failed to list recordings", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list recordings",
        )


@router.get("/active/sessions", response_model=list[RecordingSessionResponse])
async def get_active_recordings(current_user: User = Depends(get_current_active_user)):
    """Get user's active recording sessions."""
    try:
        sessions = await RecordingSession.find(
            {"user_id": str(current_user.id), "status": "recording"}
).to_list()

        return [session_to_response(s) for s in sessions]

    except Exception as e:
        logger.error("Failed to get active recordings", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get active recordings",
        )


@router.get("/quota/status", response_model=QuotaResponse)
async def get_recording_quota(current_user: User = Depends(get_current_active_user)):
    """Get user's recording quota status."""
    try:
        from app.services.recording_quota_service import recording_quota_service

        quota_summary = await recording_quota_service.get_quota_summary(
            str(current_user.id)
        )
        return QuotaResponse(**quota_summary)

    except Exception as e:
        logger.error("Failed to get quota status", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quota status",
        )


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str, current_user: User = Depends(get_current_active_user)
):
    """Get recording details. Updates view count and last viewed timestamp."""
    try:
        recording = await Recording.get(recording_id)
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
            )

        if recording.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this recording",
            )

        recording.view_count += 1
        recording.last_viewed_at = datetime.utcnow()
        await recording.save()

        return recording_to_response(recording)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get recording", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recording",
        )
