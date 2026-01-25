"""
Live Feature Quota Service
Facade for managing and enforcing usage limits for live subtitles and dubbing features

This service delegates to modular components for maintainability:
- QuotaManager: Quota creation and window resets
- QuotaChecker: Quota validation
- SessionManager: Session lifecycle
- AdminOperations: Admin functions
"""

import logging
from typing import Dict, Optional, Tuple

from app.models.live_feature_quota import (FeatureType,
                                           LiveFeatureUsageSession,
                                           UsageSessionStatus)
from app.services.quota import (AdminOperations, QuotaChecker, QuotaManager,
                                SessionManager)

logger = logging.getLogger(__name__)


class LiveFeatureQuotaService:
    """
    Service for managing and enforcing live feature quotas

    Delegates operations to specialized modules:
    - QuotaManager for creation and window management
    - QuotaChecker for validation
    - SessionManager for session lifecycle
    - AdminOperations for admin functions
    """

    def __init__(self):
        self.quota_manager = QuotaManager()
        self.quota_checker = QuotaChecker()
        self.session_manager = SessionManager()
        self.admin_operations = AdminOperations()

    async def get_or_create_quota(self, user_id: str):
        """Get quota for user, create with defaults if doesn't exist"""
        return await self.quota_manager.get_or_create_quota(user_id)

    async def check_quota(
        self,
        user_id: str,
        feature_type: FeatureType,
        estimated_duration_minutes: float = 1.0,
    ) -> Tuple[bool, Optional[str], Dict]:
        """
        Check if user has quota available (with rollover support).

        Returns: (allowed, error_message, usage_stats)
        """
        return await self.quota_checker.check_quota(
            self.quota_manager, user_id, feature_type, estimated_duration_minutes
        )

    async def start_session(
        self,
        user_id: str,
        channel_id: str,
        feature_type: FeatureType,
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        platform: str = "web",
    ) -> LiveFeatureUsageSession:
        """Start tracking a new usage session"""
        return await self.session_manager.start_session(
            user_id,
            channel_id,
            feature_type,
            source_language,
            target_language,
            platform,
        )

    async def update_session(
        self,
        session_id: str,
        audio_seconds_delta: float,
        segments_delta: int = 0,
        chars_processed: int = 0,
    ):
        """Update session with usage increments"""
        return await self.session_manager.update_session(
            self.quota_manager,
            session_id,
            audio_seconds_delta,
            segments_delta,
            chars_processed,
        )

    async def end_session(self, session_id: str, status: UsageSessionStatus):
        """Finalize session and update totals"""
        return await self.session_manager.end_session(session_id, status)

    async def get_usage_stats(self, user_id: str) -> Dict:
        """Get current usage stats for user"""
        return await self.quota_checker.get_usage_stats(self.quota_manager, user_id)

    async def reset_user_quota(self, user_id: str):
        """Reset all usage counters (admin action)"""
        return await self.admin_operations.reset_user_quota(self.quota_manager, user_id)

    async def extend_user_limits(
        self,
        user_id: str,
        admin_id: str,
        new_limits: Dict,
        notes: Optional[str] = None,
    ):
        """Admin extends user limits"""
        return await self.admin_operations.extend_user_limits(
            self.quota_manager, user_id, admin_id, new_limits, notes
        )


# Singleton instance
live_feature_quota_service = LiveFeatureQuotaService()
