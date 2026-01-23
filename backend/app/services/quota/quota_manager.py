"""
Quota Manager - Handles quota creation, window resets, and rollover logic
"""

import logging
from datetime import datetime, timedelta
from typing import Dict

from app.core.config import settings
from app.models.live_feature_quota import LiveFeatureQuota
from app.models.user import User

logger = logging.getLogger(__name__)


class QuotaManager:
    """Manages quota creation and window reset operations"""

    @staticmethod
    async def get_or_create_quota(user_id: str) -> LiveFeatureQuota:
        """Get quota for user, create with defaults if doesn't exist"""
        quota = await LiveFeatureQuota.find_one(LiveFeatureQuota.user_id == user_id)

        if not quota:
            try:
                user = await User.get(user_id)
            except Exception as e:
                logger.error(f"Failed to fetch user {user_id}: {e}")
                user = None
            tier = user.subscription_tier if user else "premium"

            # Get defaults from configuration based on subscription tier
            if tier == "family":
                defaults = {
                    "subtitle_minutes_per_hour": settings.LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_HOUR,
                    "subtitle_minutes_per_day": settings.LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_DAY,
                    "subtitle_minutes_per_month": settings.LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_MONTH,
                    "dubbing_minutes_per_hour": settings.LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_HOUR,
                    "dubbing_minutes_per_day": settings.LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_DAY,
                    "dubbing_minutes_per_month": settings.LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_MONTH,
                }
            else:  # Default to premium
                defaults = {
                    "subtitle_minutes_per_hour": settings.LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_HOUR,
                    "subtitle_minutes_per_day": settings.LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_DAY,
                    "subtitle_minutes_per_month": settings.LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_MONTH,
                    "dubbing_minutes_per_hour": settings.LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_HOUR,
                    "dubbing_minutes_per_day": settings.LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_DAY,
                    "dubbing_minutes_per_month": settings.LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_MONTH,
                }

            quota = LiveFeatureQuota(
                user_id=user_id,
                **defaults,
                max_rollover_multiplier=settings.LIVE_QUOTA_MAX_ROLLOVER_MULTIPLIER,
                warning_threshold_percentage=settings.LIVE_QUOTA_WARNING_THRESHOLD_PERCENTAGE,
            )
            await quota.insert()
            logger.info(f"Created quota for user {user_id} with tier {tier}")

        return quota

    @staticmethod
    async def reset_windows_and_rollover(quota: LiveFeatureQuota) -> bool:
        """
        Reset time windows if expired and handle rollover accumulation.
        Returns True if any window was reset.
        """
        now = datetime.utcnow()
        updated = False

        # Hourly reset with rollover
        if now - quota.last_hour_reset >= timedelta(hours=1):
            # Calculate unused minutes for rollover
            unused_subtitle = max(
                0, quota.subtitle_minutes_per_hour - quota.subtitle_usage_current_hour
            )
            unused_dubbing = max(
                0, quota.dubbing_minutes_per_hour - quota.dubbing_usage_current_hour
            )

            # Add to accumulated (capped at limit * rollover_multiplier)
            max_subtitle_rollover = (
                quota.subtitle_minutes_per_hour * quota.max_rollover_multiplier
            )
            max_dubbing_rollover = (
                quota.dubbing_minutes_per_hour * quota.max_rollover_multiplier
            )

            quota.accumulated_subtitle_minutes = min(
                quota.accumulated_subtitle_minutes + unused_subtitle,
                max_subtitle_rollover,
            )
            quota.accumulated_dubbing_minutes = min(
                quota.accumulated_dubbing_minutes + unused_dubbing,
                max_dubbing_rollover,
            )

            # Reset hourly usage
            quota.subtitle_usage_current_hour = 0.0
            quota.dubbing_usage_current_hour = 0.0
            quota.last_hour_reset = now
            updated = True

            logger.info(
                f"Hourly reset for user {quota.user_id}: "
                f"subtitle_rollover={quota.accumulated_subtitle_minutes:.1f}, "
                f"dubbing_rollover={quota.accumulated_dubbing_minutes:.1f}"
            )

        # Daily reset (no rollover for daily/monthly)
        if now - quota.last_day_reset >= timedelta(days=1):
            quota.subtitle_usage_current_day = 0.0
            quota.dubbing_usage_current_day = 0.0
            quota.last_day_reset = now
            updated = True

        # Monthly reset
        if now - quota.last_month_reset >= timedelta(days=30):
            quota.subtitle_usage_current_month = 0.0
            quota.dubbing_usage_current_month = 0.0
            quota.estimated_cost_current_month = 0.0
            quota.last_month_reset = now
            updated = True

        if updated:
            quota.updated_at = now
            await quota.save()

        return updated

    @staticmethod
    def build_usage_stats(quota: LiveFeatureQuota) -> Dict:
        """Build usage statistics dictionary"""
        return {
            "subtitle_usage_current_hour": quota.subtitle_usage_current_hour,
            "subtitle_usage_current_day": quota.subtitle_usage_current_day,
            "subtitle_usage_current_month": quota.subtitle_usage_current_month,
            "subtitle_minutes_per_hour": quota.subtitle_minutes_per_hour,
            "subtitle_minutes_per_day": quota.subtitle_minutes_per_day,
            "subtitle_minutes_per_month": quota.subtitle_minutes_per_month,
            "subtitle_available_hour": max(
                0,
                quota.subtitle_minutes_per_hour
                + quota.accumulated_subtitle_minutes
                - quota.subtitle_usage_current_hour,
            ),
            "subtitle_available_day": max(
                0, quota.subtitle_minutes_per_day - quota.subtitle_usage_current_day
            ),
            "subtitle_available_month": max(
                0, quota.subtitle_minutes_per_month - quota.subtitle_usage_current_month
            ),
            "accumulated_subtitle_minutes": quota.accumulated_subtitle_minutes,
            "dubbing_usage_current_hour": quota.dubbing_usage_current_hour,
            "dubbing_usage_current_day": quota.dubbing_usage_current_day,
            "dubbing_usage_current_month": quota.dubbing_usage_current_month,
            "dubbing_minutes_per_hour": quota.dubbing_minutes_per_hour,
            "dubbing_minutes_per_day": quota.dubbing_minutes_per_day,
            "dubbing_minutes_per_month": quota.dubbing_minutes_per_month,
            "dubbing_available_hour": max(
                0,
                quota.dubbing_minutes_per_hour
                + quota.accumulated_dubbing_minutes
                - quota.dubbing_usage_current_hour,
            ),
            "dubbing_available_day": max(
                0, quota.dubbing_minutes_per_day - quota.dubbing_usage_current_day
            ),
            "dubbing_available_month": max(
                0, quota.dubbing_minutes_per_month - quota.dubbing_usage_current_month
            ),
            "accumulated_dubbing_minutes": quota.accumulated_dubbing_minutes,
            "estimated_cost_current_month": quota.estimated_cost_current_month,
            "warning_threshold_percentage": quota.warning_threshold_percentage,
        }
