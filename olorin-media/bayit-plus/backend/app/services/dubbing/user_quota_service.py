"""
User Quota Service

Manages per-user quota enforcement for dubbing and subtitle services
Server-side source of truth for quota tracking
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.dubbing.session import UserQuota
from app.models.user import User

logger = get_logger(__name__)


class UserQuotaService:
    """
    User quota enforcement service

    Free tier: 5 minutes per day (configurable via settings)
    Premium/Family: Unlimited
    """

    @property
    def FREE_TIER_MINUTES_PER_DAY(self) -> float:
        """Get free tier quota from settings (lazy loaded to avoid initialization issues)."""
        return settings.FREE_TIER_MINUTES_PER_DAY or 5.0

    async def check_and_reserve_quota(
        self, user_id: str, estimated_duration_minutes: float = 0.5
    ) -> bool:
        """
        Atomically check and reserve quota

        Args:
            user_id: User ID
            estimated_duration_minutes: Estimated session duration to reserve

        Returns:
            True if quota available and reserved, False otherwise
        """
        try:
            # Get or create user quota
            quota = await UserQuota.find_one(UserQuota.user_id == user_id)
            if not quota:
                quota = UserQuota(user_id=user_id, daily_minutes_used=0.0)
                await quota.insert()

            # Check if premium user (unlimited quota)
            user = await User.get(user_id)
            if not user:
                logger.error(f"User not found: {user_id}")
                return False

            subscription_tier = getattr(user, "subscription_tier", None) or getattr(
                user, "role", "free"
            )

            if subscription_tier in ["premium", "family", "admin"]:
                logger.info(f"Premium user {user_id}, unlimited quota")
                return True

            # Reset quota if new day
            today = datetime.now(timezone.utc).date()
            last_reset = quota.last_reset_date.date() if quota.last_reset_date else None

            if not last_reset or last_reset < today:
                logger.info(
                    f"Resetting daily quota for user {user_id}",
                    extra={
                        "previous_date": str(last_reset),
                        "current_date": str(today),
                        "previous_usage": quota.daily_minutes_used,
                    },
                )
                quota.daily_minutes_used = 0.0
                quota.last_reset_date = datetime.now(timezone.utc)

            # Check if quota available
            if (
                quota.daily_minutes_used + estimated_duration_minutes
                > self.FREE_TIER_MINUTES_PER_DAY
            ):
                logger.warning(
                    f"Quota exhausted for user {user_id}",
                    extra={
                        "used": quota.daily_minutes_used,
                        "requested": estimated_duration_minutes,
                        "limit": self.FREE_TIER_MINUTES_PER_DAY,
                    },
                )
                return False

            # Reserve quota (optimistic locking)
            quota.daily_minutes_used += estimated_duration_minutes
            quota.updated_at = datetime.now(timezone.utc)
            await quota.save()

            logger.info(
                f"Quota reserved for user {user_id}",
                extra={
                    "reserved": estimated_duration_minutes,
                    "total_used": quota.daily_minutes_used,
                    "remaining": self.FREE_TIER_MINUTES_PER_DAY
                    - quota.daily_minutes_used,
                },
            )

            return True

        except Exception as e:
            logger.error(f"Error checking quota for user {user_id}: {e}", exc_info=True)
            return False

    async def deduct_actual_usage(
        self,
        user_id: str,
        actual_duration_minutes: float,
        reserved_duration_minutes: float,
    ) -> None:
        """
        Adjust quota after session ends (actual vs reserved)

        Args:
            user_id: User ID
            actual_duration_minutes: Actual session duration
            reserved_duration_minutes: Previously reserved duration
        """
        try:
            quota = await UserQuota.find_one(UserQuota.user_id == user_id)
            if not quota:
                logger.error(f"Quota not found for user {user_id}")
                return

            # Calculate difference
            difference = actual_duration_minutes - reserved_duration_minutes

            # Adjust quota
            quota.daily_minutes_used += difference
            quota.total_minutes_used += actual_duration_minutes
            quota.total_sessions += 1
            quota.updated_at = datetime.now(timezone.utc)

            await quota.save()

            logger.info(
                f"Quota adjusted for user {user_id}",
                extra={
                    "actual": actual_duration_minutes,
                    "reserved": reserved_duration_minutes,
                    "difference": difference,
                    "new_total": quota.daily_minutes_used,
                },
            )

        except Exception as e:
            logger.error(
                f"Error adjusting quota for user {user_id}: {e}", exc_info=True
            )

    async def get_usage_data(self, user_id: str) -> dict:
        """
        Get current usage data for user

        Returns:
            dict: Usage data with minutes used, remaining, etc.
        """
        try:
            # Check if premium user first (even if no quota record)
            user = await User.get(user_id)
            subscription_tier = getattr(user, "subscription_tier", None) or getattr(
                user, "role", "free"
            )
            is_premium = subscription_tier in ["premium", "family", "admin"]

            # Get or create quota record
            quota = await UserQuota.find_one(UserQuota.user_id == user_id)
            if not quota:
                return {
                    "daily_minutes_used": 0.0,
                    "daily_minutes_total": self.FREE_TIER_MINUTES_PER_DAY,
                    "daily_minutes_remaining": -1 if is_premium else self.FREE_TIER_MINUTES_PER_DAY,
                    "is_premium": is_premium,
                    "reset_at": datetime.now(timezone.utc)
                    .replace(hour=0, minute=0, second=0, microsecond=0)
                    .isoformat(),
                }

            # Reset if new day
            today = datetime.now(timezone.utc).date()
            last_reset = quota.last_reset_date.date() if quota.last_reset_date else None

            if not last_reset or last_reset < today:
                quota.daily_minutes_used = 0.0
                quota.last_reset_date = datetime.now(timezone.utc)
                await quota.save()

            # Calculate remaining
            remaining = max(
                0, self.FREE_TIER_MINUTES_PER_DAY - quota.daily_minutes_used
            )

            return {
                "daily_minutes_used": quota.daily_minutes_used,
                "daily_minutes_total": self.FREE_TIER_MINUTES_PER_DAY,
                "daily_minutes_remaining": remaining if not is_premium else -1,
                "is_premium": is_premium,
                "reset_at": (
                    datetime.now(timezone.utc)
                    .replace(hour=0, minute=0, second=0, microsecond=0)
                    .isoformat()
                ),
                "total_minutes_used": quota.total_minutes_used,
                "total_sessions": quota.total_sessions,
            }

        except Exception as e:
            logger.error(f"Error getting usage data for user {user_id}: {e}", exc_info=True)
            return {
                "daily_minutes_used": 0.0,
                "daily_minutes_total": self.FREE_TIER_MINUTES_PER_DAY,
                "daily_minutes_remaining": self.FREE_TIER_MINUTES_PER_DAY,
                "is_premium": False,
                "reset_at": datetime.now(timezone.utc).isoformat(),
            }

    async def sync_usage(self, user_id: str, client_usage_minutes: float) -> dict:
        """
        Sync usage data with client

        Server is source of truth, but we validate client data

        Args:
            user_id: User ID
            client_usage_minutes: Usage reported by client

        Returns:
            dict: Server-side usage data
        """
        try:
            server_usage = await self.get_usage_data(user_id)

            # Log discrepancy if significant difference
            if abs(server_usage["daily_minutes_used"] - client_usage_minutes) > 1.0:
                logger.warning(
                    f"Usage discrepancy for user {user_id}",
                    extra={
                        "server": server_usage["daily_minutes_used"],
                        "client": client_usage_minutes,
                        "difference": server_usage["daily_minutes_used"]
                        - client_usage_minutes,
                    },
                )

            return server_usage

        except Exception as e:
            logger.error(f"Error syncing usage for user {user_id}: {e}", exc_info=True)
            raise

    async def get_remaining_quota(self, user_id: str) -> float:
        """
        Get remaining quota for user

        Args:
            user_id: User ID

        Returns:
            Remaining quota in minutes (float('inf') for premium users)
        """
        try:
            usage_data = await self.get_usage_data(user_id)

            # Premium users have unlimited quota
            if usage_data["is_premium"]:
                return float("inf")

            return usage_data["daily_minutes_remaining"]

        except Exception as e:
            logger.error(f"Error getting remaining quota for user {user_id}: {e}", exc_info=True)
            return 0.0

    async def has_available_quota(self, user_id: str) -> bool:
        """
        Check if user has available quota

        Args:
            user_id: User ID

        Returns:
            True if quota available, False otherwise
        """
        try:
            remaining = await self.get_remaining_quota(user_id)
            return remaining > 0 or remaining == float("inf")

        except Exception as e:
            logger.error(f"Error checking available quota for user {user_id}: {e}", exc_info=True)
            return False
