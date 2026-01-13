"""
Recording Quota Service
Manages user recording quotas and storage limits
"""

import logging
from typing import Dict

from app.models.user import User
from app.models.recording import RecordingSession, Recording

logger = logging.getLogger(__name__)


class RecordingQuotaService:
    """Manages user recording quotas"""

    async def check_quota(
        self,
        user_id: str,
        estimated_size_bytes: int = 0
    ) -> Dict[str, any]:
        """
        Check if user has available quota.

        Args:
            user_id: User ID to check
            estimated_size_bytes: Estimated recording size

        Returns:
            Dictionary with quota check results:
            {
                "allowed": bool,
                "reason": str,
                "available_storage_bytes": int,
                "concurrent_recordings": int,
                "max_concurrent_recordings": int
            }
        """
        try:
            user = await User.get(user_id)
            if not user:
                return {
                    "allowed": False,
                    "reason": "User not found",
                    "available_storage_bytes": 0,
                    "concurrent_recordings": 0,
                    "max_concurrent_recordings": 0
                }

            # Check storage quota
            available_storage = user.recording_quota.available_storage_bytes

            if estimated_size_bytes > 0 and available_storage < estimated_size_bytes:
                return {
                    "allowed": False,
                    "reason": f"Insufficient storage. Available: {self._format_bytes(available_storage)}, "
                             f"Required: {self._format_bytes(estimated_size_bytes)}",
                    "available_storage_bytes": available_storage,
                    "concurrent_recordings": 0,
                    "max_concurrent_recordings": user.recording_quota.max_concurrent_recordings
                }

            # Check concurrent recordings
            active_sessions = await RecordingSession.find(
                RecordingSession.user_id == user_id,
                RecordingSession.status == "recording"
            ).count()

            if active_sessions >= user.recording_quota.max_concurrent_recordings:
                return {
                    "allowed": False,
                    "reason": f"Maximum concurrent recordings reached ({active_sessions}/{user.recording_quota.max_concurrent_recordings})",
                    "available_storage_bytes": available_storage,
                    "concurrent_recordings": active_sessions,
                    "max_concurrent_recordings": user.recording_quota.max_concurrent_recordings
                }

            # All checks passed
            return {
                "allowed": True,
                "reason": "Quota available",
                "available_storage_bytes": available_storage,
                "concurrent_recordings": active_sessions,
                "max_concurrent_recordings": user.recording_quota.max_concurrent_recordings
            }

        except Exception as e:
            logger.error(f"Error checking quota for user {user_id}: {str(e)}")
            return {
                "allowed": False,
                "reason": f"Error checking quota: {str(e)}",
                "available_storage_bytes": 0,
                "concurrent_recordings": 0,
                "max_concurrent_recordings": 0
            }

    async def reserve_quota(
        self,
        user_id: str,
        estimated_size_bytes: int
    ):
        """
        Reserve quota for recording (pessimistic reservation).

        Note: Pessimistic quota reservation is not currently implemented.
        Current implementation uses optimistic concurrency control where quota
        is checked at recording start and updated at recording completion.

        Pessimistic reservation would be useful if:
        - Multiple concurrent users are competing for quota
        - Recording size estimates are accurate enough to justify upfront reservation
        - We want to prevent quota over-subscription

        Implementation would require:
        - Reservation tracking in database (reserved_quota field in RecordingQuota)
        - Timeout mechanism to release stale reservations
        - Transaction support to ensure atomic reserve/release operations

        Args:
            user_id: User ID
            estimated_size_bytes: Estimated recording size
        """
        # Not implemented - using optimistic quota control instead
        pass

    async def update_used_quota(
        self,
        user_id: str,
        recording_size_bytes: int
    ):
        """
        Update used quota after recording completes.

        Args:
            user_id: User ID
            recording_size_bytes: Actual recording size
        """
        try:
            user = await User.get(user_id)
            if not user:
                logger.error(f"User {user_id} not found for quota update")
                return

            user.recording_quota.used_storage_bytes += recording_size_bytes
            await user.save()

            logger.info(
                f"Updated quota for user {user_id}: "
                f"+{self._format_bytes(recording_size_bytes)}, "
                f"Total: {self._format_bytes(user.recording_quota.used_storage_bytes)}"
            )

        except Exception as e:
            logger.error(f"Failed to update quota for user {user_id}: {str(e)}")
            raise

    async def release_quota(
        self,
        user_id: str,
        recording_size_bytes: int
    ):
        """
        Release quota when recording deleted.

        Args:
            user_id: User ID
            recording_size_bytes: Recording size to release
        """
        try:
            user = await User.get(user_id)
            if not user:
                logger.error(f"User {user_id} not found for quota release")
                return

            # Ensure we don't go negative
            user.recording_quota.used_storage_bytes = max(
                0,
                user.recording_quota.used_storage_bytes - recording_size_bytes
            )
            await user.save()

            logger.info(
                f"Released quota for user {user_id}: "
                f"-{self._format_bytes(recording_size_bytes)}, "
                f"Total: {self._format_bytes(user.recording_quota.used_storage_bytes)}"
            )

        except Exception as e:
            logger.error(f"Failed to release quota for user {user_id}: {str(e)}")
            raise

    async def get_quota_summary(
        self,
        user_id: str
    ) -> Dict[str, any]:
        """
        Get user's quota usage summary.

        Args:
            user_id: User ID

        Returns:
            Dictionary with quota summary
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception("User not found")

            # Count recordings
            total_recordings = await Recording.find(
                Recording.user_id == user_id
            ).count()

            active_sessions = await RecordingSession.find(
                RecordingSession.user_id == user_id,
                RecordingSession.status == "recording"
            ).count()

            quota = user.recording_quota

            return {
                "total_storage_bytes": quota.total_storage_bytes,
                "used_storage_bytes": quota.used_storage_bytes,
                "available_storage_bytes": quota.available_storage_bytes,
                "storage_usage_percentage": round(quota.storage_usage_percentage, 2),
                "total_storage_formatted": self._format_bytes(quota.total_storage_bytes),
                "used_storage_formatted": self._format_bytes(quota.used_storage_bytes),
                "available_storage_formatted": self._format_bytes(quota.available_storage_bytes),
                "max_recording_duration_seconds": quota.max_recording_duration_seconds,
                "max_recording_duration_formatted": self._format_duration(quota.max_recording_duration_seconds),
                "max_concurrent_recordings": quota.max_concurrent_recordings,
                "active_recordings": active_sessions,
                "total_recordings": total_recordings
            }

        except Exception as e:
            logger.error(f"Failed to get quota summary for user {user_id}: {str(e)}")
            raise

    def _format_bytes(self, bytes_value: int) -> str:
        """Format bytes to human-readable string"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_value < 1024.0:
                return f"{bytes_value:.2f} {unit}"
            bytes_value /= 1024.0
        return f"{bytes_value:.2f} PB"

    def _format_duration(self, seconds: int) -> str:
        """Format seconds to human-readable duration"""
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60

        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"


# Singleton instance
recording_quota_service = RecordingQuotaService()
