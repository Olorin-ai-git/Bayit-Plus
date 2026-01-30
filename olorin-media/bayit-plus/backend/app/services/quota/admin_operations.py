"""
Admin Operations - Administrative quota management functions
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class AdminOperations:
    """Administrative operations for quota management"""

    @staticmethod
    async def reset_user_quota(quota_manager, user_id: str):
        """Reset all usage counters (admin action)"""
        quota = await quota_manager.get_or_create_quota(user_id)

        quota.subtitle_usage_current_hour = 0.0
        quota.subtitle_usage_current_day = 0.0
        quota.subtitle_usage_current_month = 0.0

        quota.dubbing_usage_current_hour = 0.0
        quota.dubbing_usage_current_day = 0.0
        quota.dubbing_usage_current_month = 0.0

        quota.accumulated_subtitle_minutes = 0.0
        quota.accumulated_dubbing_minutes = 0.0

        quota.estimated_cost_current_month = 0.0

        quota.updated_at = datetime.now(timezone.utc)
        await quota.save()

        logger.info(f"Reset quota for user {user_id}")

    @staticmethod
    async def extend_user_limits(
        quota_manager,
        user_id: str,
        admin_id: str,
        new_limits: Dict,
        notes: Optional[str] = None,
    ):
        """Admin extends user limits"""
        quota = await quota_manager.get_or_create_quota(user_id)

        # Update limits from dict
        for key, value in new_limits.items():
            if hasattr(quota, key):
                setattr(quota, key, value)

        quota.notes = notes
        quota.limit_extended_by = admin_id
        quota.limit_extended_at = datetime.now(timezone.utc)
        quota.updated_at = datetime.now(timezone.utc)

        await quota.save()

        logger.info(f"Extended limits for user {user_id} by admin {admin_id}")
