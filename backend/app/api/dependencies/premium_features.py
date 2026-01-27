"""Premium feature authorization dependencies.

Ensures only premium/family tier users can access premium features like Audible integration.
"""

from fastapi import Depends, HTTPException, status
from app.core.config import settings
from app.models.user import User
from app.api.dependencies.verification import get_current_active_user


async def require_premium_or_family(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Premium or Family subscription for premium features.

    Raises:
        HTTPException: 403 if user doesn't have premium/family subscription.
                      Admin users always have access.
    """
    # Admins always have access to premium features
    if current_user.is_admin_role():
        return current_user

    # Check subscription tier
    if current_user.subscription_tier not in ["premium", "family"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="audible_requires_premium"
        )

    return current_user


async def require_audible_configured() -> bool:
    """
    Check if Audible integration is configured.

    Verifies that all required Audible OAuth credentials are present in configuration.

    Raises:
        HTTPException: 503 if Audible is not properly configured.

    Returns:
        bool: True if configured (checked for dependency validation).
    """
    if not settings.is_audible_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_integration_not_configured"
        )

    return True
