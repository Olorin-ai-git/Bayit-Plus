"""
Metering Tier Limits
Subscription tier configuration for usage limits
"""

from typing import Dict

# Tier limit definitions
TIER_LIMITS: Dict[str, Dict] = {
    "free": {
        "cv_uploads_per_month": 5,
        "analyses_per_month": 10,
        "profiles_per_account": 1,
        "storage_mb": 50,
    },
    "pro": {
        "cv_uploads_per_month": 50,
        "analyses_per_month": 100,
        "profiles_per_account": 10,
        "storage_mb": 1000,
    },
    "enterprise": {
        "cv_uploads_per_month": -1,  # Unlimited
        "analyses_per_month": -1,
        "profiles_per_account": -1,
        "storage_mb": 10000,
    },
}


def get_tier_limits(tier: str) -> Dict:
    """
    Get limits for a subscription tier

    Args:
        tier: Subscription tier name

    Returns:
        Dict of limits for the tier
    """
    return TIER_LIMITS.get(tier, TIER_LIMITS["free"])
