"""Gamification level progression API endpoints."""

from app.core.logging_config import get_logger

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.models.user import User
from app.services.gamification.level_service import level_service
from app.services.gamification.perk_service import perk_service

logger = get_logger(__name__)
router = APIRouter()


@router.get("/gamification/profile")
async def get_gamification_profile(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """Get level, XP, perks, and activity stats."""
    return await level_service.get_profile(
        user_id=str(user.id),
        profile_id=profile_id,
    )


@router.get("/gamification/levels")
async def get_level_definitions(
    user: User = Depends(get_current_user),
):
    """Get all level definitions with XP thresholds."""
    return level_service.get_all_levels()


@router.post("/gamification/claim-perk")
async def claim_perk(
    profile_id: str,
    perk_id: str,
    user: User = Depends(get_current_user),
):
    """Claim an unlocked perk (e.g., outfit)."""
    success = await perk_service.claim_perk(
        user_id=str(user.id),
        profile_id=profile_id,
        perk_id=perk_id,
    )
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Perk not found or not unlocked",
        )

    logger.info(
        "Perk claimed",
        extra={
            "user_id": str(user.id),
            "profile_id": profile_id,
            "perk_id": perk_id,
        },
    )
    return {"status": "claimed", "perk_id": perk_id}


@router.get("/gamification/leaderboard")
async def get_leaderboard(
    limit: int = 20,
    user: User = Depends(get_current_user),
):
    """Get family/friend leaderboard by total XP."""
    return await level_service.get_leaderboard(
        limit=min(limit, 100),
    )
