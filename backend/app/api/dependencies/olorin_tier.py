"""
FastAPI dependencies for Olorin tier-based feature gating.
"""

from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.services.olorin.tier_service import OlorinTierService

_tier_service = OlorinTierService()


def is_demo_portal_request(request: Request) -> bool:
    """Check if the request originates from the demo portal."""
    raw = getattr(settings, "DEMO_PORTAL_ORIGINS", "") or ""
    if not raw:
        return False
    allowed = {o.strip().rstrip("/") for o in raw.split(",") if o.strip()}
    origin = (request.headers.get("origin") or "").rstrip("/")
    return origin in allowed


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
