"""
Session Manager Service
Manages playback sessions and enforces concurrent stream limits.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.models.playback_session import PlaybackSession, PlaybackSessionResponse
from app.models.user import User

logger = logging.getLogger(__name__)


class ConcurrentStreamLimitError(Exception):
    """Raised when user exceeds concurrent stream limit"""

    def __init__(
        self,
        message: str,
        max_streams: int,
        active_sessions: int,
        active_devices: List[Dict],
    ):
        super().__init__(message)
        self.max_streams = max_streams
        self.active_sessions = active_sessions
        self.active_devices = active_devices


class SessionManager:
    """Manages playback sessions and concurrent stream enforcement"""

    async def start_session(
        self,
        user_id: str,
        device_id: str,
        content_id: str,
        content_type: str,
        device_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> PlaybackSession:
        """
        Start a new playback session with concurrent stream limit validation.

        Validates that user has not exceeded their subscription tier's concurrent
        stream limit before creating the session.

        Args:
            user_id: User ID
            device_id: Device fingerprint
            content_id: Content being played
            content_type: Type of content (vod, live, podcast, radio)
            device_name: Human-readable device name
            ip_address: IP address of device

        Returns:
            Created PlaybackSession object

        Raises:
            ConcurrentStreamLimitError: If concurrent stream limit exceeded
            Exception: If user not found or database error
        """
        try:
            # Get user and their concurrent stream limit
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            max_streams = user.get_concurrent_stream_limit()

            # Get active sessions (not ended and heartbeat within 2 minutes)
            active_sessions = await self.get_active_sessions(user_id)

            # Check if user has reached concurrent stream limit
            if len(active_sessions) >= max_streams:
                # Build list of active devices for error response
                active_devices = [
                    {
                        "device_id": session.device_id,
                        "device_name": session.device_name or "Unknown Device",
                        "content_id": session.content_id,
                    }
                    for session in active_sessions
                ]

                error_message = (
                    f"Maximum concurrent streams ({max_streams}) reached for "
                    f"your {user.subscription_tier or 'Basic'} plan."
                )

                logger.warning(
                    f"User {user_id} exceeded concurrent stream limit: "
                    f"{len(active_sessions)}/{max_streams}"
                )

                raise ConcurrentStreamLimitError(
                    message=error_message,
                    max_streams=max_streams,
                    active_sessions=len(active_sessions),
                    active_devices=active_devices,
                )

            # Create new session
            session = PlaybackSession(
                user_id=user_id,
                device_id=device_id,
                content_id=content_id,
                content_type=content_type,
                device_name=device_name,
                ip_address=ip_address,
            )
            await session.insert()

            logger.info(
                f"Started playback session {session.id} for user {user_id} "
                f"on device {device_id} ({len(active_sessions) + 1}/{max_streams} streams)"
            )

            return session

        except ConcurrentStreamLimitError:
            # Re-raise limit errors as-is
            raise
        except Exception as e:
            logger.error(f"Failed to start session for user {user_id}: {str(e)}")
            raise

    async def end_session(self, session_id: str) -> bool:
        """
        End a playback session.

        Args:
            session_id: PlaybackSession ID

        Returns:
            True if session was ended, False if session not found

        Raises:
            Exception: If database error
        """
        try:
            session = await PlaybackSession.get(session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for ending")
                return False

            await session.end_session()
            logger.info(f"Ended playback session {session_id} for user {session.user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {str(e)}")
            raise

    async def update_heartbeat(self, session_id: str) -> bool:
        """
        Update session heartbeat to keep it alive.

        Args:
            session_id: PlaybackSession ID

        Returns:
            True if heartbeat updated, False if session not found

        Raises:
            Exception: If database error
        """
        try:
            session = await PlaybackSession.get(session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for heartbeat update")
                return False

            # Don't update heartbeat for ended sessions
            if session.ended_at is not None:
                logger.warning(f"Session {session_id} already ended, ignoring heartbeat")
                return False

            await session.update_heartbeat()
            logger.debug(f"Updated heartbeat for session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update heartbeat for session {session_id}: {str(e)}")
            raise

    async def get_active_sessions(
        self, user_id: str, timeout_seconds: int = 120
    ) -> List[PlaybackSession]:
        """
        Get all active sessions for a user.

        A session is considered active if:
        - It has not been explicitly ended (ended_at is None)
        - Last heartbeat was within timeout_seconds (default 2 minutes)

        Args:
            user_id: User ID
            timeout_seconds: Heartbeat timeout in seconds (default 120)

        Returns:
            List of active PlaybackSession objects

        Raises:
            Exception: If database error
        """
        try:
            # Calculate cutoff time for stale sessions
            cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)

            # Query active sessions (not ended and recent heartbeat)
            sessions = await PlaybackSession.find(
                PlaybackSession.user_id == user_id,
                PlaybackSession.ended_at == None,
                PlaybackSession.last_heartbeat >= cutoff_time,
            ).to_list()

            logger.debug(f"Found {len(sessions)} active sessions for user {user_id}")
            return sessions

        except Exception as e:
            logger.error(f"Failed to get active sessions for user {user_id}: {str(e)}")
            raise

    async def get_active_sessions_count(
        self, user_id: str, timeout_seconds: int = 120
    ) -> int:
        """
        Get count of active sessions for a user (faster than get_active_sessions).

        Args:
            user_id: User ID
            timeout_seconds: Heartbeat timeout in seconds (default 120)

        Returns:
            Number of active sessions

        Raises:
            Exception: If database error
        """
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)

            count = await PlaybackSession.find(
                PlaybackSession.user_id == user_id,
                PlaybackSession.ended_at == None,
                PlaybackSession.last_heartbeat >= cutoff_time,
            ).count()

            return count

        except Exception as e:
            logger.error(f"Failed to count active sessions for user {user_id}: {str(e)}")
            raise

    async def terminate_device_sessions(self, user_id: str, device_id: str) -> int:
        """
        Terminate all active sessions on a specific device.

        Used when user disconnects a device via device management UI.

        Args:
            user_id: User ID
            device_id: Device fingerprint

        Returns:
            Number of sessions terminated

        Raises:
            Exception: If database error
        """
        try:
            # Find active sessions on this device
            sessions = await PlaybackSession.find(
                PlaybackSession.user_id == user_id,
                PlaybackSession.device_id == device_id,
                PlaybackSession.ended_at == None,
            ).to_list()

            # End each session
            terminated_count = 0
            for session in sessions:
                await session.end_session()
                terminated_count += 1

            logger.info(
                f"Terminated {terminated_count} sessions for device {device_id}, user {user_id}"
            )

            return terminated_count

        except Exception as e:
            logger.error(
                f"Failed to terminate sessions for device {device_id}, user {user_id}: {str(e)}"
            )
            raise

    async def cleanup_stale_sessions(self, timeout_seconds: int = 120) -> int:
        """
        Cleanup stale sessions (no heartbeat for timeout_seconds).

        This is a background task that runs periodically to clean up zombie sessions
        from users who closed their browsers without explicitly ending the session.

        Args:
            timeout_seconds: Heartbeat timeout in seconds (default 120)

        Returns:
            Number of sessions cleaned up

        Raises:
            Exception: If database error
        """
        try:
            # Calculate cutoff time for stale sessions
            cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)

            # Find stale sessions (not ended but heartbeat is old)
            stale_sessions = await PlaybackSession.find(
                PlaybackSession.ended_at == None,
                PlaybackSession.last_heartbeat < cutoff_time,
            ).to_list()

            # End each stale session
            cleaned_count = 0
            for session in stale_sessions:
                await session.end_session()
                cleaned_count += 1

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} stale playback sessions")
            else:
                logger.debug("No stale sessions to clean up")

            return cleaned_count

        except Exception as e:
            logger.error(f"Failed to cleanup stale sessions: {str(e)}")
            raise

    async def get_session_summary(self, user_id: str) -> Dict:
        """
        Get session summary for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary with session summary including max streams and active count

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            max_streams = user.get_concurrent_stream_limit()
            active_sessions = await self.get_active_sessions(user_id)

            return {
                "user_id": user_id,
                "subscription_tier": user.subscription_tier or "basic",
                "max_concurrent_streams": max_streams,
                "active_sessions_count": len(active_sessions),
                "available_streams": max(0, max_streams - len(active_sessions)),
                "active_sessions": [session.to_response() for session in active_sessions],
            }

        except Exception as e:
            logger.error(f"Failed to get session summary for user {user_id}: {str(e)}")
            raise


# Singleton instance
session_manager = SessionManager()
