"""Payment verification dependency for protected endpoints.

This module provides FastAPI dependencies to verify users have completed
payment before accessing protected content.
"""
from fastapi import Depends, HTTPException, status

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.responses import PaymentPendingError
from app.models.user import User
from app.models.user_state import can_access_content

logger = get_logger(__name__)


async def verify_payment_completed(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Verify user has completed payment (or is admin).

    This dependency should be added to all protected content endpoints
    to enforce the payment-required flow.

    Args:
        current_user: Current authenticated user

    Returns:
        User if payment is completed or user is admin

    Raises:
        HTTPException 403: If payment is still pending

    Usage:
        @router.get("/content/{content_id}")
        async def get_content(
            content_id: str,
            user: User = Depends(verify_payment_completed)
        ):
            # User has paid or is admin - allow access
            ...
    """
    # Admins bypass payment requirement
    if current_user.is_admin_role():
        return current_user

    # Check if user can access content (uses state machine)
    if not can_access_content(current_user):
        logger.warning(
            "Payment pending - blocking content access",
            extra={
                "user_id": str(current_user.id),
                "payment_pending": current_user.payment_pending,
                "subscription_tier": current_user.subscription_tier,
            }
        )

        # Return structured error with action URL
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PaymentPendingError(
                error="payment_pending",
                message="Please complete your subscription to access this content",
                action_url="/api/v1/auth/payment/checkout-url",
            ).dict(),
        )

    return current_user


async def require_active_subscription(
    current_user: User = Depends(verify_payment_completed),
) -> User:
    """Require user has active (not trial or past_due) subscription.

    Stricter than verify_payment_completed - requires fully active subscription.

    Args:
        current_user: Current authenticated user (already payment-verified)

    Returns:
        User if subscription is active

    Raises:
        HTTPException 403: If subscription is not active

    Usage:
        @router.get("/premium-content/{content_id}")
        async def get_premium_content(
            content_id: str,
            user: User = Depends(require_active_subscription)
        ):
            # User has active subscription
            ...
    """
    # Admins bypass
    if current_user.is_admin_role():
        return current_user

    # Check subscription status
    if current_user.subscription_status != "active":
        logger.warning(
            "Inactive subscription - blocking premium content",
            extra={
                "user_id": str(current_user.id),
                "subscription_status": current_user.subscription_status,
            }
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Active subscription required. Current status: {current_user.subscription_status}",
        )

    return current_user


async def require_premium_tier(
    current_user: User = Depends(verify_payment_completed),
) -> User:
    """Require user has premium or family subscription tier.

    Args:
        current_user: Current authenticated user (already payment-verified)

    Returns:
        User if subscription tier is premium or family

    Raises:
        HTTPException 403: If tier is not premium or family

    Usage:
        @router.get("/hd-content/{content_id}")
        async def get_hd_content(
            content_id: str,
            user: User = Depends(require_premium_tier)
        ):
            # User has premium/family tier
            ...
    """
    # Admins bypass
    if current_user.is_admin_role():
        return current_user

    # Check tier
    if not current_user.can_access_premium_features():
        logger.warning(
            "Insufficient subscription tier - blocking premium feature",
            extra={
                "user_id": str(current_user.id),
                "subscription_tier": current_user.subscription_tier,
            }
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium or Family subscription required for this feature",
        )

    return current_user
