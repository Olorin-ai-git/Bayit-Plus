"""
Metering Service
Core service for usage tracking and quota management
"""

from datetime import datetime
from typing import Dict, Optional

from app.core.logging_config import get_logger
from app.models import User
from app.services.metering.operations import MeterableOperation
from app.services.metering.tier_limits import get_tier_limits

logger = get_logger(__name__)


class MeteringService:
    """
    Usage metering and billing service
    Tracks operations for billing and quota enforcement
    """

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
        limits = get_tier_limits(tier)

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
