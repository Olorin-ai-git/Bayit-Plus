"""
Mission Event Hooks.

Hooks triggered by user actions (content watched, quiz completed, etc.)
that automatically update mission progress.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.models.daily_mission import MissionType, MissionStatus, UserMission
from app.models.shekel_currency import TransactionType
from app.services.mission.shekel_service import shekel_service

logger = logging.getLogger(__name__)


class MissionEventHooks:
    """Hooks that update mission progress based on user actions."""

    async def on_content_watched(
        self,
        user_id: str,
        profile_id: Optional[str],
        content_type: str,
        genre: Optional[str] = None,
        duration_minutes: int = 0,
    ) -> None:
        """Update WATCH_CONTENT and EXPLORE_GENRE missions."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        missions = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": today,
                "status": MissionStatus.ACTIVE,
                "mission_type": {
                    "$in": [
                        MissionType.WATCH_CONTENT,
                        MissionType.EXPLORE_GENRE,
                    ]
                },
            }
        ).to_list()

        for mission in missions:
            mission.current_value = min(
                mission.current_value + 1, mission.target_value
            )
            if mission.is_complete:
                mission.status = MissionStatus.COMPLETED
                mission.completed_at = datetime.now(timezone.utc)
            await mission.save()

        if missions:
            logger.info(
                "Content watched hook updated missions",
                extra={
                    "user_id": user_id,
                    "updated_count": len(missions),
                },
            )

    async def on_quiz_completed(
        self,
        user_id: str,
        profile_id: Optional[str],
        score_percent: float,
        is_perfect: bool,
    ) -> None:
        """Update COMPLETE_QUIZ missions and award bonus shekels."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        missions = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": today,
                "status": MissionStatus.ACTIVE,
                "mission_type": MissionType.COMPLETE_QUIZ,
            }
        ).to_list()

        for mission in missions:
            mission.current_value = min(
                mission.current_value + 1, mission.target_value
            )
            if mission.is_complete:
                mission.status = MissionStatus.COMPLETED
                mission.completed_at = datetime.now(timezone.utc)
            await mission.save()

        if is_perfect and settings.SHEKEL_PERFECT_QUIZ_BONUS > 0:
            await shekel_service.earn_shekels(
                user_id=user_id,
                profile_id=profile_id,
                amount=settings.SHEKEL_PERFECT_QUIZ_BONUS,
                transaction_type=TransactionType.QUIZ_BONUS,
                description="Perfect quiz bonus",
                description_he="בונוס חידון מושלם",
            )

    async def on_streak_maintained(
        self,
        user_id: str,
        profile_id: Optional[str],
        streak_days: int,
    ) -> None:
        """Update MAINTAIN_STREAK missions and award streak bonus."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        missions = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": today,
                "status": MissionStatus.ACTIVE,
                "mission_type": MissionType.MAINTAIN_STREAK,
            }
        ).to_list()

        for mission in missions:
            mission.current_value = streak_days
            if mission.is_complete:
                mission.status = MissionStatus.COMPLETED
                mission.completed_at = datetime.now(timezone.utc)
            await mission.save()

        bonus = int(
            streak_days * settings.SHEKEL_STREAK_BONUS_MULTIPLIER
        )
        if bonus > 0:
            await shekel_service.earn_shekels(
                user_id=user_id,
                profile_id=profile_id,
                amount=bonus,
                transaction_type=TransactionType.STREAK_BONUS,
                description=f"Streak bonus: {streak_days} days",
                description_he=f"בונוס רצף: {streak_days} ימים",
            )

    async def on_subtitles_used(
        self,
        user_id: str,
        profile_id: Optional[str],
    ) -> None:
        """Update USE_SUBTITLES missions."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        missions = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": today,
                "status": MissionStatus.ACTIVE,
                "mission_type": MissionType.USE_SUBTITLES,
            }
        ).to_list()

        for mission in missions:
            mission.current_value = min(
                mission.current_value + 1, mission.target_value
            )
            if mission.is_complete:
                mission.status = MissionStatus.COMPLETED
                mission.completed_at = datetime.now(timezone.utc)
            await mission.save()

    async def on_phrase_learned(
        self,
        user_id: str,
        profile_id: Optional[str],
        phrase_count: int = 1,
    ) -> None:
        """Update LEARN_PHRASES missions and award shekels."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        missions = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": today,
                "status": MissionStatus.ACTIVE,
                "mission_type": MissionType.LEARN_PHRASES,
            }
        ).to_list()

        for mission in missions:
            mission.current_value = min(
                mission.current_value + phrase_count,
                mission.target_value,
            )
            if mission.is_complete:
                mission.status = MissionStatus.COMPLETED
                mission.completed_at = datetime.now(timezone.utc)
            await mission.save()

        await shekel_service.earn_shekels(
            user_id=user_id,
            profile_id=profile_id,
            amount=phrase_count * settings.SHEKEL_PHRASE_LEARN_REWARD,
            transaction_type=TransactionType.PHRASE_LEARNING,
            description=f"Learned {phrase_count} phrases",
            description_he=f"למדת {phrase_count} ביטויים",
        )


mission_event_hooks = MissionEventHooks()
