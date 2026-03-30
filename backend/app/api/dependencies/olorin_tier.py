"""
FastAPI dependencies for Olorin tier-based feature gating.
"""

from fastapi import HTTPException, status
from app.services.olorin.tier_service import OlorinTierService

_tier_service = OlorinTierService()


def require_lip_sync(user) -> None:
    if not _tier_service.can_use_lip_sync(user):
        tier = _tier_service.resolve_tier(user).value
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Lip-sync animation requires Superfan tier or above (current: {tier})",
        )


def require_share_clips(user) -> None:
    if not _tier_service.can_share_clips(user):
        tier = _tier_service.resolve_tier(user).value
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Shareable clips require Fan tier or above (current: {tier})",
        )


def require_trivia(user) -> None:
    if not _tier_service.can_trivia(user):
        tier = _tier_service.resolve_tier(user).value
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Trivia generation requires Superfan tier or above (current: {tier})",
        )


def require_dubbing(user) -> None:
    if not _tier_service.can_dubbing(user):
        tier = _tier_service.resolve_tier(user).value
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Dubbing requires Superfan tier or above (current: {tier})",
        )
