"""
Quota Checker - Validates quota availability and enforces limits
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from app.models.live_feature_quota import FeatureType

logger = logging.getLogger(__name__)


class QuotaChecker:
    """Checks quota availability and enforces limits"""

    @staticmethod
    async def check_quota(
        quota_manager,
        user_id: str,
        feature_type: FeatureType,
        estimated_duration_minutes: float = 1.0,
    ) -> Tuple[bool, Optional[str], Dict]:
        """
        Check if user has quota available (with rollover support).

        Args:
            quota_manager: QuotaManager instance for quota operations
            user_id: User ID to check
            feature_type: Type of feature (subtitle or dubbing)
            estimated_duration_minutes: Estimated session duration

        Returns:
            Tuple of (allowed, error_message, usage_stats)
        """
        try:
            quota = await quota_manager.get_or_create_quota(user_id)
            await quota_manager.reset_windows_and_rollover(quota)

            is_subtitle = feature_type == FeatureType.SUBTITLE

            # Get current usage and limits
            if is_subtitle:
                current_hour = quota.subtitle_usage_current_hour
                current_day = quota.subtitle_usage_current_day
                current_month = quota.subtitle_usage_current_month
                limit_hour = quota.subtitle_minutes_per_hour
                limit_day = quota.subtitle_minutes_per_day
                limit_month = quota.subtitle_minutes_per_month
                accumulated = quota.accumulated_subtitle_minutes
            else:
                current_hour = quota.dubbing_usage_current_hour
                current_day = quota.dubbing_usage_current_day
                current_month = quota.dubbing_usage_current_month
                limit_hour = quota.dubbing_minutes_per_hour
                limit_day = quota.dubbing_minutes_per_day
                limit_month = quota.dubbing_minutes_per_month
                accumulated = quota.accumulated_dubbing_minutes

            # Build usage stats
            usage_stats = quota_manager.build_usage_stats(quota)

            # Check hourly limit (with rollover)
            if current_hour + estimated_duration_minutes > limit_hour + accumulated:
                return (
                    False,
                    f"Hourly limit reached for {feature_type.value}. "
                    f"Used {current_hour:.1f} of {limit_hour + accumulated:.1f} minutes. "
                    f"Resets in {60 - datetime.now(timezone.utc).minute} minutes.",
                    usage_stats,
                )

            # Check daily limit
            if current_day + estimated_duration_minutes > limit_day:
                hours_until_reset = 24 - datetime.now(timezone.utc).hour
                return (
                    False,
                    f"Daily limit reached for {feature_type.value}. "
                    f"Used {current_day:.1f} of {limit_day} minutes. "
                    f"Resets in {hours_until_reset} hours.",
                    usage_stats,
                )

            # Check monthly limit
            if current_month + estimated_duration_minutes > limit_month:
                return (
                    False,
                    f"Monthly limit reached for {feature_type.value}. "
                    f"Used {current_month:.1f} of {limit_month} minutes. "
                    f"Resets next month.",
                    usage_stats,
                )

            # All checks passed
            return (True, None, usage_stats)

        except Exception as e:
            logger.error(f"Error checking quota for user {user_id}: {str(e)}")
            return (
                False,
                f"Error checking quota: {str(e)}",
                {},
            )

    @staticmethod
    async def get_usage_stats(quota_manager, user_id: str) -> Dict:
        """Get current usage stats for user"""
        quota = await quota_manager.get_or_create_quota(user_id)
        await quota_manager.reset_windows_and_rollover(quota)
        return quota_manager.build_usage_stats(quota)
