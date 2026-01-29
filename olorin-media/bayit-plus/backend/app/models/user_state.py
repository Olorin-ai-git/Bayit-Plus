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

    This enum replaces implicit role-based state logic with explicit
    state tracking based on multiple user fields.
    """
    # Signup flow states
    REGISTRATION_INCOMPLETE = "registration_incomplete"  # Account created, no payment started
    PAYMENT_PENDING = "payment_pending"  # Checkout session created, awaiting payment

    # Active states
    TRIAL = "trial"  # Paid, in trial period
    ACTIVE = "active"  # Fully subscribed
    PAST_DUE = "past_due"  # Payment failed, grace period

    # Terminal states
    CANCELED = "canceled"  # Subscription ended
    SUSPENDED = "suspended"  # Admin action


def compute_user_state(user: "User") -> UserState:
    """Compute user state from multiple fields.

    This function is the single source of truth for determining
    user lifecycle state.

    Args:
        user: User model instance

    Returns:
        UserState enum value

    Example:
        >>> from app.models.user import User
        >>> user = User(payment_pending=True)
        >>> compute_user_state(user)
        UserState.PAYMENT_PENDING
    """
    # Admins always have full access
    if user.role == "admin" or user.role == "super_admin":
        return UserState.ACTIVE

    # Payment pending takes priority (blocks access)
    if user.payment_pending:
        return UserState.PAYMENT_PENDING

    # No subscription tier = incomplete registration
    if not user.subscription_tier:
        return UserState.REGISTRATION_INCOMPLETE

    # Check subscription status
    if user.subscription_status == "trialing":
        return UserState.TRIAL

    if user.subscription_status == "past_due":
        return UserState.PAST_DUE

    if user.subscription_status == "active":
        return UserState.ACTIVE

    if user.subscription_status == "canceled":
        return UserState.CANCELED

    # Default to canceled for safety
    logger.warning(
        "User in unexpected state",
        extra={
            "user_id": str(user.id),
            "role": user.role,
            "subscription_tier": user.subscription_tier,
            "subscription_status": user.subscription_status,
            "payment_pending": user.payment_pending,
        }
    )
    return UserState.CANCELED


def can_access_content(user: "User") -> bool:
    """Check if user can access protected content.

    Args:
        user: User model instance

    Returns:
        True if user can access content, False otherwise
    """
    state = compute_user_state(user)

    # Only these states allow content access
    allowed_states = {
        UserState.ACTIVE,
        UserState.TRIAL,
        UserState.PAST_DUE,  # Grace period
    }

    return state in allowed_states
