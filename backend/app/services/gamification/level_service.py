"""Level progression service for gamification XP and level-ups."""

from app.core.logging_config import get_logger
import math
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.gamification_profile import (
    LEVEL_DEFINITIONS,
    GamificationProfile,
    GamificationProfileResponse,
    LeaderboardEntryResponse,
    LevelUpRecord,
    XPAwardResult,
)

logger = get_logger(__name__)


class LevelProgressionService:
    """Manages XP awards, level-ups, and profile queries."""

    async def award_xp(
        self,
        user_id: str,
        profile_id: str,
        source: str,
        amount: int,
    ) -> XPAwardResult:
        """Award XP and handle level-ups."""
        profile = await self.get_or_create_profile(user_id, profile_id)

        profile.current_xp += amount
        profile.total_xp += amount

        if source == "mission":
            profile.missions_completed += 1
        elif source == "mirror":
            profile.mirror_sessions += 1
        elif source == "talk_back":
            profile.talk_back_attempts += 1

        leveled_up = False
        new_level = None
        perks_unlocked: List[str] = []

        threshold = self._calculate_level_threshold(profile.current_level)
        while profile.current_xp >= threshold:
            profile.current_xp -= threshold
            profile.current_level += 1
            leveled_up = True
            new_level = profile.current_level

            level_def = self._get_level_definition(profile.current_level)
            if level_def:
                profile.level_title = level_def["title"]
                profile.level_title_he = level_def["title_he"]
                if level_def.get("perk_outfit"):
                    perks_unlocked.append(level_def["perk_outfit"])

            profile.level_history.append(
                LevelUpRecord(
                    level=profile.current_level,
                    perks_unlocked=perks_unlocked,
                )
            )

            threshold = self._calculate_level_threshold(profile.current_level)

        profile.updated_at = datetime.now(timezone.utc)
        await profile.save()

        logger.info(
            "XP awarded",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "source": source,
                "amount": amount,
                "total_xp": profile.total_xp,
                "level": profile.current_level,
                "leveled_up": leveled_up,
            },
        )

        return XPAwardResult(
            xp_awarded=amount,
            total_xp=profile.total_xp,
            current_xp=profile.current_xp,
            current_level=profile.current_level,
            leveled_up=leveled_up,
            new_level=new_level,
            new_title=profile.level_title if leveled_up else None,
            new_title_he=profile.level_title_he if leveled_up else None,
            perks_unlocked=perks_unlocked,
        )

    async def get_profile(
        self, user_id: str, profile_id: str
    ) -> GamificationProfileResponse:
        """Get gamification profile with XP to next level."""
        profile = await self.get_or_create_profile(user_id, profile_id)
        threshold = self._calculate_level_threshold(profile.current_level)

        return GamificationProfileResponse(
            current_level=profile.current_level,
            current_xp=profile.current_xp,
            total_xp=profile.total_xp,
            xp_to_next_level=threshold - profile.current_xp,
            level_title=profile.level_title,
            level_title_he=profile.level_title_he,
            unlocked_perks=profile.unlocked_perks,
            missions_completed=profile.missions_completed,
            mirror_sessions=profile.mirror_sessions,
            talk_back_attempts=profile.talk_back_attempts,
        )

    async def get_leaderboard(
        self, limit: int = 20
    ) -> List[LeaderboardEntryResponse]:
        """Get top profiles by total XP."""
        profiles = (
            await GamificationProfile.find()
            .sort(-GamificationProfile.total_xp)
            .limit(limit)
            .to_list()
        )

        return [
            LeaderboardEntryResponse(
                profile_id=p.profile_id,
                level=p.current_level,
                total_xp=p.total_xp,
                level_title=p.level_title,
                rank=i + 1,
            )
            for i, p in enumerate(profiles)
        ]

    async def get_or_create_profile(
        self, user_id: str, profile_id: str
    ) -> GamificationProfile:
        """Get or create a gamification profile."""
        profile = await GamificationProfile.find_one(
            {"user_id": user_id, "profile_id": profile_id}
)

        if not profile:
            profile = GamificationProfile(
                user_id=user_id,
                profile_id=profile_id,
            )
            await profile.insert()
            logger.info(
                "Created gamification profile",
                extra={"user_id": user_id, "profile_id": profile_id},
            )

        return profile

    def _calculate_level_threshold(self, level: int) -> int:
        """Calculate XP required for next level: base * multiplier^(level-1)."""
        base = settings.GAMIFICATION_LEVEL_BASE_XP
        multiplier = settings.GAMIFICATION_LEVEL_XP_MULTIPLIER
        return int(base * math.pow(multiplier, level - 1))

    def _get_level_definition(self, level: int) -> Optional[dict]:
        """Get level definition if it exists."""
        return next(
            (ld for ld in LEVEL_DEFINITIONS if ld["level"] == level),
            None,
        )

    def get_all_levels(self) -> list:
        """Return all level definitions with XP thresholds."""
        return [
            {
                **ld,
                "xp_threshold": self._calculate_level_threshold(ld["level"]),
            }
            for ld in LEVEL_DEFINITIONS
        ]


level_service = LevelProgressionService()
