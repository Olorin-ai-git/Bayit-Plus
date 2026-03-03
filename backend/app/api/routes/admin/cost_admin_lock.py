"""Admin lock for cost dashboard iOS app.

Verifies the authenticated user matches the configured admin identity.
Checks email (OLORIN_COSTS_ADMIN_EMAIL) or user ID
(OLORIN_COSTS_ADMIN_UID) against the current user.
"""

from fastapi import Depends, HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.user import User

logger = get_logger(__name__)


async def require_costs_admin_uid(
    user: User = Depends(get_current_active_user),
) -> User:
    """Verify the authenticated user is the costs admin."""
    admin_uid = settings.olorin.costs_admin_uid
    admin_email = settings.olorin.costs_admin_email

    if not admin_uid and not admin_email:
        logger.error("Cost admin identity not configured")
        raise HTTPException(
            status_code=503,
            detail="Cost dashboard not configured",
        )

    user_email = getattr(user, "email", None)
    user_id = str(getattr(user, "id", ""))

    is_admin = (
        (admin_email and user_email == admin_email)
        or (admin_uid and user_id == admin_uid)
    )

    if not is_admin:
        logger.warning(
            "COSTS_ADMIN_ACCESS_DENIED",
            extra={
                "user_email": user_email,
                "user_id": user_id,
            },
        )
        raise HTTPException(
            status_code=403,
            detail="Access restricted to cost dashboard admin",
        )

    return user
