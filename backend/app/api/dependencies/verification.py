"""
Verification Dependencies
Middleware for checking user verification status
"""

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models.user import User


async def require_verified_user(
    current_user: User = Depends(get_current_active_user),
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
            },
        )

    return current_user


async def can_create_widgets(
    current_user: User = Depends(require_verified_user),
) -> User:
    """
    Check widget creation limit: free=1, plus=unlimited, admin=unlimited.
    """
    if current_user.is_admin_role() or current_user.subscription_tier == "plus":
        return current_user

    from app.models.subscription import SUBSCRIPTION_PLANS

    plan = SUBSCRIPTION_PLANS.get(current_user.subscription_tier or "free")
    max_widgets = plan.max_widgets if plan else 1

    if max_widgets > 0:
        from app.api.routes.widgets import Widget, WidgetType
        existing_count = await Widget.find(
            {"user_id": str(current_user.id), "type": WidgetType.PERSONAL}
        ).count()
        if existing_count >= max_widgets:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "widget_limit_reached",
                    "message": "Upgrade to Plus for unlimited widgets",
                    "current": existing_count,
                    "limit": max_widgets,
                },
            )

    return current_user
