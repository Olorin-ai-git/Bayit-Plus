"""
Leaderboard Routes.

Endpoints for retrieving leaderboard rankings by scope and period.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.models.leaderboard import (
    LeaderboardEntryResponse,
    LeaderboardPeriod,
    LeaderboardResponse,
    LeaderboardScope,
)
from app.models.user import User
from app.services.leaderboard_service import leaderboard_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _get_default_period_key(period: LeaderboardPeriod) -> str:
    """Generate the current period key based on period type."""
    now = datetime.now(timezone.utc)
    if period == LeaderboardPeriod.DAILY:
        return now.strftime("%Y-%m-%d")
    elif period == LeaderboardPeriod.WEEKLY:
        return now.strftime("%Y-W%W")
    elif period == LeaderboardPeriod.MONTHLY:
        return now.strftime("%Y-%m")
    return "all_time"


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    scope: LeaderboardScope = Query(default=LeaderboardScope.GLOBAL),
    period: LeaderboardPeriod = Query(
        default=LeaderboardPeriod.WEEKLY
    ),
    period_key: Optional[str] = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=5, le=100),
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Get leaderboard rankings by scope and period."""
    effective_key = period_key or _get_default_period_key(period)

    entries, total = await leaderboard_service.get_leaderboard(
        scope=scope,
        period=period,
        period_key=effective_key,
        page=page,
        page_size=page_size,
    )

    my_rank_entry = await leaderboard_service.get_user_rank(
        user_id=str(user.id),
        profile_id=profile_id,
        scope=scope,
        period=period,
        period_key=effective_key,
    )

    user_id_str = str(user.id)
    entry_responses = [
        LeaderboardEntryResponse(
            rank=e.rank,
            display_name=e.display_name,
            avatar_url=e.avatar_url,
            total_points=e.total_points,
            total_shekels=e.total_shekels,
            missions_completed=e.missions_completed,
            current_streak=e.current_streak,
            is_current_user=(e.user_id == user_id_str),
        )
        for e in entries
    ]

    return LeaderboardResponse(
        scope=scope.value,
        period=period.value,
        entries=entry_responses,
        total_participants=total,
        my_rank=my_rank_entry.rank if my_rank_entry else None,
        page=page,
        page_size=page_size,
    )


@router.get("/my-rank")
async def get_my_rank(
    scope: LeaderboardScope = Query(default=LeaderboardScope.GLOBAL),
    period: LeaderboardPeriod = Query(
        default=LeaderboardPeriod.WEEKLY
    ),
    period_key: Optional[str] = Query(None),
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Get the current user's rank in a specific leaderboard."""
    effective_key = period_key or _get_default_period_key(period)

    entry = await leaderboard_service.get_user_rank(
        user_id=str(user.id),
        profile_id=profile_id,
        scope=scope,
        period=period,
        period_key=effective_key,
    )

    if not entry:
        return {
            "rank": None,
            "total_points": 0,
            "scope": scope.value,
            "period": period.value,
        }

    return {
        "rank": entry.rank,
        "total_points": entry.total_points,
        "total_shekels": entry.total_shekels,
        "missions_completed": entry.missions_completed,
        "current_streak": entry.current_streak,
        "scope": scope.value,
        "period": period.value,
    }
