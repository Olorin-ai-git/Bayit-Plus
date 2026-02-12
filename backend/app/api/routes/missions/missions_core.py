"""
Daily Missions Routes.

Endpoints for retrieving daily missions, claiming rewards,
and viewing mission history.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.daily_mission import DailyMissionsResponse, MissionResponse
from app.models.user import User
from app.services.mission.mission_service import mission_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/missions", tags=["missions"])


class ClaimRequest(BaseModel):
    """Request body for claiming a mission reward."""
    mission_id: str


@router.get("/daily", response_model=DailyMissionsResponse)
async def get_daily_missions(
    profile_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Get today's daily missions for a user/profile."""
    effective_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    missions = await mission_service.get_daily_missions(
        user_id=str(user.id),
        profile_id=profile_id,
        date=effective_date,
    )

    total_shekels = sum(m.shekel_reward for m in missions)
    entries = []
    for m in missions:
        entries.append(
            MissionResponse(
                id=str(m.id),
                mission_type=m.mission_type.value,
                title=m.title,
                title_he=m.title_he,
                description=m.description,
                description_he=m.description_he,
                icon_name=m.icon_name,
                target_value=m.target_value,
                current_value=m.current_value,
                progress_percent=m.progress_percent,
                shekel_reward=m.shekel_reward,
                points_reward=m.points_reward,
                status=m.status.value,
                mission_date=m.mission_date,
            )
        )

    return DailyMissionsResponse(
        missions=entries,
        date=effective_date,
        total_available_shekels=total_shekels,
    )


@router.post("/claim", response_model=MissionResponse)
async def claim_mission_reward(
    request: ClaimRequest,
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Claim shekel reward for a completed mission."""
    try:
        mission = await mission_service.claim_reward(
            user_id=str(user.id),
            profile_id=profile_id,
            mission_id=request.mission_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )

    return MissionResponse(
        id=str(mission.id),
        mission_type=mission.mission_type.value,
        title=mission.title,
        title_he=mission.title_he,
        description=mission.description,
        description_he=mission.description_he,
        icon_name=mission.icon_name,
        target_value=mission.target_value,
        current_value=mission.current_value,
        progress_percent=mission.progress_percent,
        shekel_reward=mission.shekel_reward,
        points_reward=mission.points_reward,
        status=mission.status.value,
        mission_date=mission.mission_date,
    )


@router.get("/history", response_model=List[MissionResponse])
async def get_mission_history(
    profile_id: Optional[str] = Query(None),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get mission history for a user/profile."""
    missions = await mission_service.get_mission_history(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=limit,
        offset=offset,
    )

    return [
        MissionResponse(
            id=str(m.id),
            mission_type=m.mission_type.value,
            title=m.title,
            title_he=m.title_he,
            description=m.description,
            description_he=m.description_he,
            icon_name=m.icon_name,
            target_value=m.target_value,
            current_value=m.current_value,
            progress_percent=m.progress_percent,
            shekel_reward=m.shekel_reward,
            points_reward=m.points_reward,
            status=m.status.value,
            mission_date=m.mission_date,
        )
        for m in missions
    ]
