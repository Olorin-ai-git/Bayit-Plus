"""
FastAPI dependencies for Olorin tier-based feature gating.
"""

from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.services.olorin.tier_service import OlorinTierService

_tier_service = OlorinTierService()


def is_demo_portal_request(request: Request) -> bool:
    """Check if the request originates from the demo portal.

    Matches on either the Origin header (web portals) or the
    X-Client-Type header (native apps like playground-ios).
    """
    # Web: check Origin header against DEMO_PORTAL_ORIGINS
    origins_raw = getattr(settings, "DEMO_PORTAL_ORIGINS", "") or ""
    if origins_raw:
        allowed_origins = {
            o.strip().rstrip("/") for o in origins_raw.split(",") if o.strip()
        }
        origin = (request.headers.get("origin") or "").rstrip("/")
        if origin in allowed_origins:
            return True

    # Native: check X-Client-Type header against DEMO_PORTAL_CLIENT_TYPES
    clients_raw = getattr(settings, "DEMO_PORTAL_CLIENT_TYPES", "") or ""
    if clients_raw:
        allowed_clients = {
            c.strip() for c in clients_raw.split(",") if c.strip()
        }
        client_type = (request.headers.get("x-client-type") or "").strip()
        if client_type in allowed_clients:
            return True

    return False


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
