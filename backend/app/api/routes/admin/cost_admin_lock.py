"""Admin UID lock for cost dashboard iOS app."""

from fastapi import Depends, HTTPException, Request

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.user import User

logger = get_logger(__name__)


async def require_costs_admin_uid(
    request: Request,
    user: User = Depends(get_current_active_user),
) -> User:
    """Verify the user's Firebase UID matches the configured admin."""
    admin_uid = settings.olorin.costs_admin_uid
    if not admin_uid:
        logger.error("OLORIN_COSTS_ADMIN_UID not configured")
        raise HTTPException(
            status_code=503,
            detail="Cost dashboard not configured",
        )

    firebase_uid = getattr(request.state, "firebase_uid", None)
    if not firebase_uid:
        firebase_uid = getattr(user, "firebase_uid", None)

    if firebase_uid != admin_uid:
        logger.warning(
            "COSTS_ADMIN_ACCESS_DENIED",
            extra={
                "attempted_uid": firebase_uid,
                "user_id": user.id,
            },
        )
        raise HTTPException(
            status_code=403,
            detail="Access restricted to cost dashboard admin",
        )

    return user
