"""
Daily Mission Service.

Generates daily missions from templates, tracks progress, and handles
completion/claiming with shekel rewards.
"""

import logging
import random
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.daily_mission import (
    MissionStatus,
    MissionTemplate,
    UserMission,
)
from app.models.shekel_currency import TransactionType
from app.services.mission.shekel_service import shekel_service

logger = logging.getLogger(__name__)


class MissionService:
    """Generates and manages daily missions for users."""

    async def get_daily_missions(
        self,
        user_id: str,
        profile_id: Optional[str],
        date: str,
    ) -> List[UserMission]:
        """Get or generate daily missions for a user."""
        existing = await UserMission.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "mission_date": date,
            }
        ).to_list()

        if existing:
            return existing

        return await self._generate_daily_missions(
            user_id, profile_id, date
        )

    async def _generate_daily_missions(
        self,
        user_id: str,
        profile_id: Optional[str],
        date: str,
    ) -> List[UserMission]:
        """Generate new daily missions from active templates."""
        templates = await MissionTemplate.find(
            {"is_active": True}
        ).to_list()

        if not templates:
            logger.warning("No active mission templates found")
            return []

        count = min(settings.MISSIONS_DAILY_COUNT, len(templates))
        selected = random.sample(templates, count)
        missions = []

        for template in selected:
            mission = UserMission(
                user_id=user_id,
                profile_id=profile_id,
                template_id=template.template_id,
                mission_type=template.mission_type,
                title=template.title,
                title_he=template.title_he,
                description=template.description,
                description_he=template.description_he,
                icon_name=template.icon_name,
                target_value=template.target_value,
                shekel_reward=template.shekel_reward,
                points_reward=template.points_reward,
                mission_date=date,
            )
            await mission.insert()
            missions.append(mission)

        logger.info(
            "Generated daily missions",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "date": date,
                "count": len(missions),
            },
        )
        return missions

    async def update_progress(
        self,
        user_id: str,
        profile_id: Optional[str],
        mission_id: str,
        increment: int = 1,
    ) -> Optional[UserMission]:
        """Increment mission progress."""
        from beanie import PydanticObjectId

        mission = await UserMission.get(PydanticObjectId(mission_id))
        if not mission:
            return None

        if mission.user_id != user_id:
            return None

        if mission.status != MissionStatus.ACTIVE:
            return mission

        mission.current_value = min(
            mission.current_value + increment, mission.target_value
        )

        if mission.is_complete:
            mission.status = MissionStatus.COMPLETED
            mission.completed_at = datetime.now(timezone.utc)
            logger.info(
                "Mission completed",
                extra={
                    "user_id": user_id,
                    "mission_id": mission_id,
                    "type": mission.mission_type.value,
                },
            )

        await mission.save()
        return mission

    async def claim_reward(
        self,
        user_id: str,
        profile_id: Optional[str],
        mission_id: str,
    ) -> Optional[UserMission]:
        """Claim shekel reward for a completed mission."""
        from beanie import PydanticObjectId

        mission = await UserMission.get(PydanticObjectId(mission_id))
        if not mission:
            return None

        if mission.user_id != user_id:
            return None

        if mission.status != MissionStatus.COMPLETED:
            raise ValueError(
                f"Mission not claimable: status={mission.status.value}"
            )

        await shekel_service.earn_shekels(
            user_id=user_id,
            profile_id=profile_id,
            amount=mission.shekel_reward,
            transaction_type=TransactionType.MISSION_REWARD,
            description=f"Mission reward: {mission.title}",
            description_he=f"פרס משימה: {mission.title_he}",
            reference_id=str(mission.id),
        )

        mission.status = MissionStatus.CLAIMED
        mission.claimed_at = datetime.now(timezone.utc)
        await mission.save()

        logger.info(
            "Mission reward claimed",
            extra={
                "user_id": user_id,
                "mission_id": mission_id,
                "shekels": mission.shekel_reward,
            },
        )
        return mission

    async def get_mission_history(
        self,
        user_id: str,
        profile_id: Optional[str],
        limit: int = 30,
        offset: int = 0,
    ) -> List[UserMission]:
        """Get mission history for a user."""
        return (
            await UserMission.find(
                {"user_id": user_id, "profile_id": profile_id}
            )
            .sort("-mission_date")
            .skip(offset)
            .limit(limit)
            .to_list()
        )


mission_service = MissionService()
