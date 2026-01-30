"""
Recording Schedule API Routes
Endpoints for managing EPG-scheduled recordings
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_active_user
from app.models.content import EPGEntry, LiveChannel
from app.models.recording import RecordingSchedule
from app.models.user import User

from .recording_schedule_models import (
    ScheduleRecordingRequest,
    ScheduleResponse,
    schedule_to_response,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Ensure user has premium access for scheduling."""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for recording scheduling",
        )
    return current_user


@router.post("/schedule", response_model=ScheduleResponse)
async def schedule_recording(
    request: ScheduleRecordingRequest,
    current_user: User = Depends(_get_premium_user),
):
    """Schedule a recording from an EPG entry."""
    try:
        epg_entry = await EPGEntry.get(request.epg_entry_id)
        if not epg_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="EPG entry not found",
            )

        now = datetime.utcnow()
        if epg_entry.end_time <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot schedule recording for a program that has already ended",
            )

        channel = await LiveChannel.get(epg_entry.channel_id)
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found",
            )

        from app.services.recording_scheduler_service import (
            recording_scheduler_service,
        )

        conflicts = await recording_scheduler_service.check_conflicts(
            user_id=str(current_user.id),
            start_time=epg_entry.start_time,
            end_time=epg_entry.end_time,
            channel_id=epg_entry.channel_id,
        )

        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Schedule conflicts with existing recording(s)",
            )

        schedule = RecordingSchedule(
            user_id=str(current_user.id),
            channel_id=epg_entry.channel_id,
            channel_name=channel.name,
            program_title=epg_entry.title,
            start_time=epg_entry.start_time,
            end_time=epg_entry.end_time,
            subtitle_enabled=request.subtitle_enabled,
            subtitle_target_language=request.subtitle_target_language,
            dubbing_enabled=request.dubbing_enabled,
            dubbing_target_language=request.dubbing_target_language,
            epg_entry_id=request.epg_entry_id,
            status="pending",
        )
        await schedule.insert()
        await recording_scheduler_service.schedule_recording(schedule)

        return schedule_to_response(schedule)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to schedule recording",
            extra={
                "epg_entry_id": request.epg_entry_id,
                "user_id": str(current_user.id),
                "error": str(e),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to schedule recording",
        )


@router.delete("/schedule/{schedule_id}")
async def cancel_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a scheduled recording."""
    try:
        schedule = await RecordingSchedule.get(schedule_id)
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found",
            )

        if schedule.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this schedule",
            )

        if schedule.status not in ("pending", "recording"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel schedule in '{schedule.status}' state",
            )

        from app.services.recording_scheduler_service import (
            recording_scheduler_service,
        )

        await recording_scheduler_service.cancel_schedule(schedule_id)
        return {"message": "Schedule cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to cancel schedule",
            extra={"schedule_id": schedule_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel schedule",
        )


