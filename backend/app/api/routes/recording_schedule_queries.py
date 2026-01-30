"""
Recording Schedule Query Routes
Read-only endpoints for listing schedules and checking conflicts.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.recording import RecordingSchedule
from app.models.user import User

from .recording_schedule_models import (
    ConflictCheckResponse,
    ScheduleResponse,
    schedule_to_response,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/schedules", response_model=list[ScheduleResponse])
async def list_schedules(
    schedule_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
):
    """List user's scheduled recordings with optional status filter."""
    try:
        query_filters = [
            RecordingSchedule.user_id == str(current_user.id),
        ]
        if schedule_status:
            query_filters.append(RecordingSchedule.status == schedule_status)

        schedules = (
            await RecordingSchedule.find(*query_filters)
            .sort(-RecordingSchedule.start_time)
            .to_list(length=settings.RECORDING_QUERY_LIMIT)
        )

        return [schedule_to_response(s) for s in schedules]

    except Exception as e:
        logger.error(
            "Failed to list schedules",
            extra={"user_id": str(current_user.id), "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list schedules",
        )


@router.get("/schedule/conflicts", response_model=ConflictCheckResponse)
async def check_conflicts(
    start_time: str = Query(...),
    end_time: str = Query(...),
    channel_id: str = Query(...),
    current_user: User = Depends(get_current_active_user),
):
    """Check for scheduling conflicts."""
    try:
        parsed_start = datetime.fromisoformat(start_time)
        parsed_end = datetime.fromisoformat(end_time)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format. Use ISO format.",
        )

    try:
        from app.services.recording_scheduler_service import (
            recording_scheduler_service,
        )

        conflicts = await recording_scheduler_service.check_conflicts(
            user_id=str(current_user.id),
            start_time=parsed_start,
            end_time=parsed_end,
            channel_id=channel_id,
        )

        return ConflictCheckResponse(
            has_conflict=len(conflicts) > 0,
            conflicting_schedules=[schedule_to_response(c) for c in conflicts],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to check conflicts",
            extra={"user_id": str(current_user.id), "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check conflicts",
        )
