"""User lifecycle state machine.

This module defines explicit user states to prevent confusion between
role-based access and payment status.
"""
from enum import Enum
from typing import TYPE_CHECKING

from app.core.logging_config import get_logger

if TYPE_CHECKING:
    from app.models.user import User

logger = get_logger(__name__)


class UserState(Enum):
    """Explicit user lifecycle states.

    Freemium model: all users start as FREE with full content access.
    Plus subscribers get expanded AI credits and premium features.
    """
    # Free tier (default for all new users)
    FREE = "free"

    # Payment flow states
    PAYMENT_PENDING = "payment_pending"  # Checkout session created, awaiting payment

    # Plus subscriber states
    TRIAL = "trial"  # Plus trial period
    ACTIVE = "active"  # Active Plus subscriber
    PAST_DUE = "past_due"  # Payment failed, grace period

    # Terminal states
    CANCELED = "canceled"  # Plus subscription ended, reverts to free
    SUSPENDED = "suspended"  # Admin action


def compute_user_state(user: "User") -> UserState:
    """Compute user state from multiple fields.

    Freemium model: users without a paid subscription are FREE (not blocked).
    Only Plus subscribers go through TRIAL/ACTIVE/PAST_DUE/CANCELED states.

    Args:
        user: User model instance

    Returns:
        UserState enum value
    """
    # Admins always have full access
    if user.role == "admin" or user.role == "super_admin":
        return UserState.ACTIVE

    # Payment pending (upgrading to Plus)
    if user.payment_pending:
        return UserState.PAYMENT_PENDING

    # Free tier: no subscription or explicit "free" tier
    if not user.subscription_tier or user.subscription_tier == "free":
        return UserState.FREE

    # Plus subscriber states
    if user.subscription_status == "trialing":
        return UserState.TRIAL

    if user.subscription_status == "past_due":
        return UserState.PAST_DUE

    if user.subscription_status == "active":
        return UserState.ACTIVE

    if user.subscription_status == "canceled":
        return UserState.CANCELED

    # Default to free for safety (not blocked)
    logger.warning(
        "User in unexpected state, defaulting to free",
        extra={
            "user_id": str(user.id),
            "role": user.role,
            "subscription_tier": user.subscription_tier,
            "subscription_status": user.subscription_status,
            "payment_pending": user.payment_pending,
        }
    )
    return UserState.FREE


def can_access_content(user: "User") -> bool:
    """Check if user can access content (streaming, radio, podcasts, BYOC).

    Freemium model: all registered users can access content.
    Only PAYMENT_PENDING and SUSPENDED states block access.

    Args:
        user: User model instance

    Returns:
        True if user can access content, False otherwise
    """
    state = compute_user_state(user)

    blocked_states = {
        UserState.PAYMENT_PENDING,
        UserState.SUSPENDED,
    }

    return state not in blocked_states


def can_access_ai(user: "User") -> bool:
    """Check if user can access AI features.

    Plus subscribers and admins get unlimited AI access.
    Free users can access AI if they have remaining credits.
    Credit balance check is done separately by the credit service.

    Args:
        user: User model instance

    Returns:
        True if user has AI access (tier-level check, not credit balance)
    """
    if user.is_admin_role():
        return True

    if user.subscription_tier == "plus":
        state = compute_user_state(user)
        return state in {UserState.ACTIVE, UserState.TRIAL, UserState.PAST_DUE}

    # Free users: allowed (credit balance checked at deduction time)
    return True
