"""
Rewards Core API Routes.

Endpoints for user rewards, badges, and statistics.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.profile import Profile
from app.models.reward import (
    Badge,
    BadgeResponse,
    RewardStatsResponse,
    UserReward,
    UserRewardResponse,
)
from app.models.user import User
from app.services.quiz import RewardService
from app.services.security_utils import validate_object_id

logger = logging.getLogger(__name__)

router = APIRouter()


def _format_badge_response(
    badge: Badge,
    earned_badges: List[str],
    badge_dates: dict,
) -> BadgeResponse:
    """Format badge for API response with earned status."""
    is_earned = badge.badge_id in earned_badges
    earned_date = badge_dates.get(badge.badge_id) if is_earned else None

    return BadgeResponse(
        badge_id=badge.badge_id,
        name=badge.name,
        name_he=badge.name_he,
        description=badge.description,
        description_he=badge.description_he,
        icon_url=badge.icon_url,
        rarity=badge.rarity,
        points_bonus=badge.points_bonus,
        earned=is_earned,
        earned_date=earned_date,
    )


@router.get("/me")
@limiter.limit(RATE_LIMITS.get("rewards_me", "60/minute"))
async def get_my_rewards(
    request: Request,
    profile_id: Optional[str] = Query(None, description="Kids profile ID"),
    current_user: User = Depends(get_current_user),
) -> UserRewardResponse:
    """
    Get current user's rewards.

    Returns points, quizzes completed, streaks, and earned badges.
    Can be filtered by profile for family accounts.
    """
    validated_profile_id = None
    if profile_id:
        validated_profile_id = validate_object_id(profile_id)
        profile = await Profile.get(validated_profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        if profile.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Profile access denied")

    reward_service = RewardService()
    user_reward = await reward_service.get_user_rewards(
        user_id=str(current_user.id),
        profile_id=validated_profile_id,
    )

    if not user_reward:
        user_reward = UserReward(
            user_id=str(current_user.id),
            profile_id=validated_profile_id,
        )

    all_badges = await reward_service.get_all_badges()
    badge_responses = [
        _format_badge_response(
            badge,
            user_reward.earned_badges,
            user_reward.badge_earned_dates,
        )
        for badge in all_badges
    ]

    earned_badges = [b for b in badge_responses if b.earned]

    return UserRewardResponse(
        total_points=user_reward.total_points,
        quizzes_completed=user_reward.quizzes_completed,
        perfect_scores=user_reward.perfect_scores,
        current_streak=user_reward.current_streak,
        longest_streak=user_reward.longest_streak,
        earned_badges=earned_badges,
    )


@router.get("/stats")
@limiter.limit(RATE_LIMITS.get("rewards_stats", "60/minute"))
async def get_reward_stats(
    request: Request,
    profile_id: Optional[str] = Query(None, description="Kids profile ID"),
    current_user: User = Depends(get_current_user),
) -> RewardStatsResponse:
    """
    Get quick reward stats for UI display.

    Returns minimal stats for displaying in UI widgets.
    """
    validated_profile_id = None
    if profile_id:
        validated_profile_id = validate_object_id(profile_id)
        profile = await Profile.get(validated_profile_id)
        if profile and profile.user_id == str(current_user.id):
            validated_profile_id = str(profile.id)

    reward_service = RewardService()
    user_reward = await reward_service.get_user_rewards(
        user_id=str(current_user.id),
        profile_id=validated_profile_id,
    )

    if not user_reward:
        return RewardStatsResponse(
            total_points=0,
            current_streak=0,
            badges_count=0,
            quizzes_completed=0,
        )

    return RewardStatsResponse(
        total_points=user_reward.total_points,
        current_streak=user_reward.current_streak,
        badges_count=len(user_reward.earned_badges),
        quizzes_completed=user_reward.quizzes_completed,
    )


@router.get("/badges")
@limiter.limit(RATE_LIMITS.get("badges_list", "60/minute"))
async def get_all_badges(
    request: Request,
) -> List[BadgeResponse]:
    """
    Get all available badges.

    Returns all active badge definitions. Does not require authentication.
    """
    reward_service = RewardService()
    badges = await reward_service.get_all_badges()

    return [
        BadgeResponse(
            badge_id=b.badge_id,
            name=b.name,
            name_he=b.name_he,
            description=b.description,
            description_he=b.description_he,
            icon_url=b.icon_url,
            rarity=b.rarity,
            points_bonus=b.points_bonus,
            earned=False,
            earned_date=None,
        )
        for b in badges
    ]


@router.get("/badges/{badge_id}")
@limiter.limit(RATE_LIMITS.get("badge_detail", "60/minute"))
async def get_badge_detail(
    request: Request,
    badge_id: str,
) -> BadgeResponse:
    """
    Get details for a specific badge.

    Returns badge definition by badge_id.
    """
    badge = await Badge.find_one({"badge_id": badge_id, "is_active": True})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")

    return BadgeResponse(
        badge_id=badge.badge_id,
        name=badge.name,
        name_he=badge.name_he,
        description=badge.description,
        description_he=badge.description_he,
        icon_url=badge.icon_url,
        rarity=badge.rarity,
        points_bonus=badge.points_bonus,
        earned=False,
        earned_date=None,
    )
