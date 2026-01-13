"""
Verification Dependencies
Middleware for checking user verification status
"""
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.core.security import get_current_active_user


async def require_verified_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Require verified user OR admin role.

    Admins bypass verification requirements.
    Regular users must have both email and phone verified.
    """
    if current_user.is_admin_role():
        return current_user

    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "verification_required",
                "message": "Please verify your email and phone to access this feature",
                "email_verified": current_user.email_verified,
                "phone_verified": current_user.phone_verified,
            }
        )

    return current_user


async def can_watch_vod(
    current_user: User = Depends(require_verified_user)
) -> User:
    """
    Require Basic plan or higher, or admin role.

    Feature gate for VOD content access.
    """
    if current_user.is_admin_role():
        return current_user

    if not current_user.subscription_tier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "subscription_required",
                "message": "Please subscribe to watch VOD content"
            }
        )

    return current_user


async def can_create_widgets(
    current_user: User = Depends(require_verified_user)
) -> User:
    """
    Require Premium plan or higher, or admin role.

    Feature gate for widget creation.
    """
    if current_user.is_admin_role():
        return current_user

    if current_user.subscription_tier not in ["premium", "family"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "premium_required",
                "message": "Upgrade to Premium to create widgets"
            }
        )

    return current_user
