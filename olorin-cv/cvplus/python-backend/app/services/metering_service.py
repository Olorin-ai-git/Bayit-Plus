"""
Olorin Metering Service
Tracks billable operations and usage metrics
Follows Olorin ecosystem metering patterns
"""

import logging
from typing import Dict, Optional
from datetime import datetime
from enum import Enum

from app.models import User
from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)
settings = get_settings()


class MeterableOperation(str, Enum):
    """Billable operations in CVPlus"""

    CV_UPLOAD = "cv_upload"
    CV_ANALYSIS = "cv_analysis"
    CV_GENERATION = "cv_generation"
    PROFILE_CREATION = "profile_creation"
    QR_CODE_GENERATION = "qr_code_generation"
    AI_API_CALL = "ai_api_call"
    STORAGE_UPLOAD = "storage_upload"
    STORAGE_DOWNLOAD = "storage_download"


class MeteringService:
    """
    Usage metering and billing service
    Tracks operations for billing and quota enforcement
    """

    def __init__(self):
        self.tier_limits = {
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

    async def record_usage(
        self,
        user_id: str,
        operation: MeterableOperation,
        units: int = 1,
        metadata: Optional[Dict] = None
    ):
        """
        Record billable operation

        Args:
            user_id: User ID
            operation: Operation type
            units: Number of units (default: 1)
            metadata: Additional operation metadata
        """
        logger.info(
            f"Metering: {operation}",
            extra={
                "user_id": user_id,
                "operation": operation.value,
                "units": units,
                "metadata": metadata or {},
            },
        )

        # Get user
        user = await User.get(user_id)

        if not user:
            logger.warning(f"User not found for metering: {user_id}")
            return

        # Update user usage counters
        if operation == MeterableOperation.CV_UPLOAD:
            user.cvs_created += units
        elif operation == MeterableOperation.CV_ANALYSIS:
            user.analyses_used += units
        elif operation == MeterableOperation.PROFILE_CREATION:
            user.profiles_created += units

        user.updated_at = datetime.utcnow()
        await user.save()

        logger.debug(
            "Usage recorded",
            extra={
                "user_id": user_id,
                "operation": operation.value,
                "cvs_created": user.cvs_created,
                "analyses_used": user.analyses_used,
                "profiles_created": user.profiles_created,
            },
        )

    async def check_quota(
        self,
        user_id: str,
        operation: MeterableOperation
    ) -> bool:
        """
        Check if user has quota for operation

        Args:
            user_id: User ID
            operation: Operation type

        Returns:
            True if operation allowed, False if quota exceeded
        """
        user = await User.get(user_id)

        if not user:
            logger.warning(f"User not found for quota check: {user_id}")
            return False

        tier = user.subscription_tier
        limits = self.tier_limits.get(tier, self.tier_limits["free"])

        # Check specific limits
        if operation == MeterableOperation.CV_UPLOAD:
            limit = limits["cv_uploads_per_month"]
            if limit != -1 and user.cvs_created >= limit:
                logger.warning(
                    "Quota exceeded",
                    extra={
                        "user_id": user_id,
                        "operation": operation.value,
                        "limit": limit,
                        "used": user.cvs_created,
                    },
                )
                return False

        elif operation == MeterableOperation.CV_ANALYSIS:
            limit = limits["analyses_per_month"]
            if limit != -1 and user.analyses_used >= limit:
                logger.warning(
                    "Quota exceeded",
                    extra={
                        "user_id": user_id,
                        "operation": operation.value,
                        "limit": limit,
                        "used": user.analyses_used,
                    },
                )
                return False

        elif operation == MeterableOperation.PROFILE_CREATION:
            limit = limits["profiles_per_account"]
            if limit != -1 and user.profiles_created >= limit:
                logger.warning(
                    "Quota exceeded",
                    extra={
                        "user_id": user_id,
                        "operation": operation.value,
                        "limit": limit,
                        "used": user.profiles_created,
                    },
                )
                return False

        return True

    async def get_usage_summary(self, user_id: str) -> Dict:
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
        limits = self.tier_limits.get(tier, self.tier_limits["free"])

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

    async def reset_monthly_usage(self, user_id: str):
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
