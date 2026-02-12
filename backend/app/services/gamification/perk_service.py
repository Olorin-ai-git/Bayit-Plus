"""Perk unlock service for gamification level rewards."""

import logging
from datetime import datetime, timezone
from typing import List

from app.models.gamification_profile import (
    LEVEL_DEFINITIONS,
    GamificationProfile,
    UnlockedPerk,
)

logger = logging.getLogger(__name__)


class PerkUnlockService:
    """Manages perk unlocking when players reach new levels."""

    async def process_level_perks(
        self,
        user_id: str,
        profile_id: str,
        level: int,
    ) -> List[UnlockedPerk]:
        """Process and grant perks for a newly reached level."""
        level_def = next(
            (ld for ld in LEVEL_DEFINITIONS if ld["level"] == level),
            None,
        )
        if not level_def or not level_def.get("perk_outfit"):
            return []

        profile = await GamificationProfile.find_one(
            GamificationProfile.user_id == user_id,
            GamificationProfile.profile_id == profile_id,
        )
        if not profile:
            return []

        perk_id = level_def["perk_outfit"]
        already_unlocked = any(
            p.perk_id == perk_id for p in profile.unlocked_perks
        )
        if already_unlocked:
            return []

        perk = UnlockedPerk(
            perk_id=perk_id,
            perk_type="outfit",
            level_unlocked=level,
        )
        profile.unlocked_perks.append(perk)
        profile.updated_at = datetime.now(timezone.utc)
        await profile.save()

        await self._grant_outfit_perk(user_id, profile_id, perk_id)

        logger.info(
            "Perk unlocked",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "perk_id": perk_id,
                "level": level,
            },
        )

        return [perk]

    async def _grant_outfit_perk(
        self,
        user_id: str,
        profile_id: str,
        outfit_id: str,
    ) -> None:
        """Grant an outfit perk to the avatar's wardrobe."""
        from app.models.child_avatar import ChildAvatar

        avatar = await ChildAvatar.find_one(
            ChildAvatar.user_id == user_id,
            ChildAvatar.profile_id == profile_id,
        )
        if not avatar:
            logger.warning(
                "No avatar found for perk grant",
                extra={"user_id": user_id, "profile_id": profile_id},
            )
            return

        from app.services.interactive_mission.outfit_service import (
            outfit_service,
        )

        await outfit_service.grant_outfit_reward(
            avatar_id=str(avatar.id),
            outfit_id=outfit_id,
            user_id=user_id,
            source="level_perk",
        )

    async def claim_perk(
        self,
        user_id: str,
        profile_id: str,
        perk_id: str,
    ) -> bool:
        """Claim a previously unlocked perk."""
        profile = await GamificationProfile.find_one(
            GamificationProfile.user_id == user_id,
            GamificationProfile.profile_id == profile_id,
        )
        if not profile:
            return False

        perk = next(
            (p for p in profile.unlocked_perks if p.perk_id == perk_id),
            None,
        )
        if not perk:
            return False

        await self._grant_outfit_perk(user_id, profile_id, perk_id)
        return True


perk_service = PerkUnlockService()
