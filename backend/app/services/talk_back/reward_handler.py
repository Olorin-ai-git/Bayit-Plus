"""
Talk Back Reward Handler.

Extends the reward system with Talk Back milestone badges.
Awards badges based on attempt count and response quality.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List

from app.models.reward import Badge, UserReward
from app.models.talk_back_attempt import ResponseQuality, TalkBackAttempt

logger = logging.getLogger(__name__)

TALK_BACK_MILESTONES: Dict[str, int] = {
    "first_talk_back": 1,
    "chatterbox": 10,
    "hebrew_hero": 50,
    "polyglot_pro": 100,
}


class TalkBackRewardHandler:
    """Awards Talk Back milestone badges based on engagement."""

    async def award_badges(
        self,
        user_id: str,
        profile_id: str,
        quality: ResponseQuality,
        total_attempts: int,
    ) -> List[Dict]:
        """
        Check and award Talk Back milestone badges.

        Returns list of newly awarded badge dicts.
        """
        user_reward = await self._get_or_create_reward(
            user_id, profile_id
        )
        new_badges = []

        for badge_id, threshold in TALK_BACK_MILESTONES.items():
            if total_attempts < threshold:
                continue
            if user_reward.has_badge(badge_id):
                continue

            badge = await Badge.find_one(
                {"badge_id": badge_id, "is_active": True}
            )
            if not badge:
                continue

            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            user_reward.earned_badges.append(badge_id)
            user_reward.badge_earned_dates[badge_id] = today
            user_reward.total_points += badge.points_bonus

            new_badges.append({
                "badge_id": badge.badge_id,
                "name": badge.name,
                "name_he": badge.name_he,
                "rarity": badge.rarity,
                "points_bonus": badge.points_bonus,
            })

            logger.info(
                "Talk Back badge awarded",
                extra={
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "badge_id": badge_id,
                    "total_attempts": total_attempts,
                },
            )

        if new_badges:
            user_reward.updated_at = datetime.now(timezone.utc)
            await user_reward.save()

        return new_badges

    async def check_milestone_badges(
        self,
        user_id: str,
        profile_id: str,
    ) -> List[str]:
        """Return list of Talk Back badge IDs already earned."""
        user_reward = await UserReward.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        if not user_reward:
            return []

        return [
            badge_id
            for badge_id in TALK_BACK_MILESTONES
            if user_reward.has_badge(badge_id)
        ]

    async def _get_or_create_reward(
        self,
        user_id: str,
        profile_id: str,
    ) -> UserReward:
        """Get or create user reward document."""
        existing = await UserReward.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        if existing:
            return existing

        reward = UserReward(user_id=user_id, profile_id=profile_id)
        await reward.insert()
        return reward


talk_back_reward_handler = TalkBackRewardHandler()
