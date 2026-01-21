"""
Admin Recordings API Routes
Manage all recordings across the platform
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.recording import Recording, RecordingSession
from app.models.user import User
from app.services.recording_cleanup_service import RecordingCleanupService

router = APIRouter()


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user has admin access"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


class RecordingStatsResponse(BaseModel):
    """Recording statistics"""

    total_recordings: int
    total_storage_bytes: int
    total_users: int
    active_sessions: int


class AdminRecordingResponse(BaseModel):
    """Admin recording response with user info"""

    id: str
    user_id: str
    user_email: str
    channel_id: str
    channel_name: str
    title: str
    recorded_at: str
    duration_seconds: int
    file_size_bytes: int
    video_url: str
    subtitle_url: Optional[str]
    auto_delete_at: str


class PaginatedAdminRecordingsResponse(BaseModel):
    """Paginated admin recordings response"""

    items: list[AdminRecordingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/recordings", response_model=PaginatedAdminRecordingsResponse)
async def list_all_recordings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
):
    """
    List all recordings across the platform (admin only)

    - **page**: Page number (starting from 1)
    - **page_size**: Number of items per page (1-100)
    - **search**: Search by title, user email, or channel name
    """
    skip = (page - 1) * page_size

    # Build query
    query = {}
    if search:
        # Search across multiple fields
        query = {
            "$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"channel_name": {"$regex": search, "$options": "i"}},
            ]
        }

    # Get recordings
    recordings = (
        await Recording.find(query)
        .sort("-recorded_at")
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    # Get total count
    total = await Recording.find(query).count()

    # Fetch user emails for each recording
    items = []
    for recording in recordings:
        user = await User.get(recording.user_id)
        user_email = user.email if user else "Unknown"

        items.append(
            AdminRecordingResponse(
                id=recording.id,
                user_id=recording.user_id,
                user_email=user_email,
                channel_id=recording.channel_id,
                channel_name=recording.channel_name,
                title=recording.title,
                recorded_at=recording.recorded_at.isoformat(),
                duration_seconds=recording.duration_seconds,
                file_size_bytes=recording.file_size_bytes,
                video_url=recording.video_url,
                subtitle_url=recording.subtitle_url,
                auto_delete_at=recording.auto_delete_at.isoformat(),
            )
        )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedAdminRecordingsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/recordings/stats", response_model=RecordingStatsResponse)
async def get_recording_stats(current_user: User = Depends(get_current_admin_user)):
    """
    Get platform-wide recording statistics (admin only)
    """
    # Total recordings
    total_recordings = await Recording.find().count()

    # Total storage used
    recordings = await Recording.find().to_list()
    total_storage_bytes = sum(r.file_size_bytes for r in recordings)

    # Unique users with recordings
    user_ids = set(r.user_id for r in recordings)
    total_users = len(user_ids)

    # Active recording sessions
    active_sessions = await RecordingSession.find({"status": "recording"}).count()

    return RecordingStatsResponse(
        total_recordings=total_recordings,
        total_storage_bytes=total_storage_bytes,
        total_users=total_users,
        active_sessions=active_sessions,
    )


@router.delete("/recordings/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording_admin(
    recording_id: str, current_user: User = Depends(get_current_admin_user)
):
    """
    Delete any recording (admin only)
    """
    recording = await Recording.get(recording_id)
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
        )

    # Use cleanup service to properly delete recording and free quota
    cleanup_service = RecordingCleanupService()
    await cleanup_service.delete_recording(recording_id, recording.user_id)

    return None
