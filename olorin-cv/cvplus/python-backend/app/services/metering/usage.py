"""
Metering Usage Summary
Functions for retrieving and resetting usage data
"""

from datetime import datetime
from typing import Dict

from app.core.logging_config import get_logger
from app.models import User
from app.services.metering.tier_limits import get_tier_limits

logger = get_logger(__name__)


async def get_usage_summary(user_id: str) -> Dict:
    """
    Get usage summary for user

    Args:
        user_id: User ID

    Returns:
        Usage summary with limits and current usage
    """
    user = await User.get(user_id)

    if not user:
        raise ValueError("User not found")

    tier = user.subscription_tier
    limits = get_tier_limits(tier)

    return {
        "tier": tier,
        "limits": limits,
        "usage": {
            "cvs_created": user.cvs_created,
            "analyses_used": user.analyses_used,
            "profiles_created": user.profiles_created,
        },
        "remaining": {
            "cv_uploads": (
                limits["cv_uploads_per_month"] - user.cvs_created
                if limits["cv_uploads_per_month"] != -1
                else "unlimited"
            ),
            "analyses": (
                limits["analyses_per_month"] - user.analyses_used
                if limits["analyses_per_month"] != -1
                else "unlimited"
            ),
            "profiles": (
                limits["profiles_per_account"] - user.profiles_created
                if limits["profiles_per_account"] != -1
                else "unlimited"
            ),
        },
    }


async def reset_monthly_usage(user_id: str):
    """
    Reset monthly usage counters
    Called by scheduled job on billing cycle

    Args:
        user_id: User ID
    """
    user = await User.get(user_id)

    if user:
        user.cvs_created = 0
        user.analyses_used = 0
        user.updated_at = datetime.utcnow()
        await user.save()

        logger.info(
            "Monthly usage reset",
            extra={"user_id": user_id},
        )
