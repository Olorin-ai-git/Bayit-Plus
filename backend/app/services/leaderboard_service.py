"""
Leaderboard Service.

Pre-computes and serves leaderboard rankings for global, friends,
and family scopes across daily/weekly/monthly/all-time periods.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from app.core.config import settings
from app.models.leaderboard import (
    LeaderboardEntry,
    LeaderboardPeriod,
    LeaderboardScope,
)
from app.models.reward import UserReward

logger = logging.getLogger(__name__)


class LeaderboardService:
    """Manages leaderboard computation and retrieval."""

    async def get_leaderboard(
        self,
        scope: LeaderboardScope,
        period: LeaderboardPeriod,
        period_key: str,
        page: int = 1,
        page_size: Optional[int] = None,
    ) -> Tuple[List[LeaderboardEntry], int]:
        """
        Get paginated leaderboard entries.

        Returns:
            Tuple of (entries, total_participants)
        """
        effective_page_size = page_size or settings.LEADERBOARD_PAGE_SIZE
        skip = (page - 1) * effective_page_size

        query = {
            "scope": scope,
            "period": period,
            "period_key": period_key,
        }

        total = await LeaderboardEntry.find(query).count()
        entries = (
            await LeaderboardEntry.find(query)
            .sort("rank")
            .skip(skip)
            .limit(effective_page_size)
            .to_list()
        )

        return entries, total

    async def get_user_rank(
        self,
        user_id: str,
        profile_id: Optional[str],
        scope: LeaderboardScope,
        period: LeaderboardPeriod,
        period_key: str,
    ) -> Optional[LeaderboardEntry]:
        """Get a specific user's rank in a leaderboard."""
        return await LeaderboardEntry.find_one(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "scope": scope,
                "period": period,
                "period_key": period_key,
            }
        )

    @staticmethod
    def _period_start(period: LeaderboardPeriod) -> Optional[datetime]:
        """Return the start datetime for a given period, or None for ALL_TIME."""
        now = datetime.now(timezone.utc)
        if period == LeaderboardPeriod.DAILY:
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == LeaderboardPeriod.WEEKLY:
            start_of_week = now - timedelta(days=now.weekday())
            return start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == LeaderboardPeriod.MONTHLY:
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return None

    async def recompute_global_leaderboard(
        self,
        period: LeaderboardPeriod,
        period_key: str,
    ) -> int:
        """
        Recompute global leaderboard from UserReward data.

        For time-bound periods (daily/weekly/monthly), only includes users
        whose rewards were updated within the period window.

        Returns:
            Number of entries created.
        """
        period_start = self._period_start(period)
        query_filter = {}
        if period_start is not None:
            query_filter["updated_at"] = {"$gte": period_start}

        rewards = (
            await UserReward.find(query_filter)
            .sort("-total_points")
            .to_list()
        )

        await LeaderboardEntry.find(
            {
                "scope": LeaderboardScope.GLOBAL,
                "period": period,
                "period_key": period_key,
            }
        ).delete()

        now = datetime.now(timezone.utc)
        entries = []

        for rank, reward in enumerate(rewards, start=1):
            entry = LeaderboardEntry(
                user_id=reward.user_id,
                profile_id=reward.profile_id,
                display_name=reward.user_id[:settings.LEADERBOARD_DISPLAY_NAME_MAX_LENGTH],
                scope=LeaderboardScope.GLOBAL,
                period=period,
                period_key=period_key,
                rank=rank,
                total_points=reward.total_points,
                missions_completed=0,
                quizzes_completed=reward.quizzes_completed,
                current_streak=reward.current_streak,
                computed_at=now,
            )
            entries.append(entry)

        if entries:
            await LeaderboardEntry.insert_many(entries)

        logger.info(
            "Global leaderboard recomputed",
            extra={
                "period": period.value,
                "period_key": period_key,
                "entries": len(entries),
            },
        )
        return len(entries)


leaderboard_service = LeaderboardService()
