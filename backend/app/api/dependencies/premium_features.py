"""Plus-tier feature authorization dependencies.

Gates features exclusive to Plus subscribers: downloads, 4K quality.
"""

from fastapi import Depends, HTTPException, status
from app.core.config import settings
from app.models.user import User
from app.api.dependencies.verification import get_current_active_user


async def require_plus(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Plus subscription for premium-only features (downloads, 4K).

    Raises:
        HTTPException: 403 if user doesn't have Plus subscription.
                      Admin users always have access.
    """
    if current_user.is_admin_role():
        return current_user

    if current_user.subscription_tier != "plus":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="feature_requires_plus"
        )

    return current_user


async def require_audible_configured() -> bool:
    """
    Check if Audible integration is configured.

    Raises:
        HTTPException: 503 if Audible is not properly configured.
    """
    if not settings.is_audible_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_integration_not_configured"
        )

    return True
