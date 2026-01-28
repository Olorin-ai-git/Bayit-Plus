"""
User Dubbing Service

Wraps existing RealtimeDubbingService for user-facing dubbing and subtitle sessions
Adds JWT authentication, quota enforcement, and session management
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.dubbing.session import (
    CreateSessionRequest,
    DubbingSessionType,
    SessionResponse,
    UserDubbingSession,
)
from app.models.user import User
from app.services.dubbing.user_quota_service import UserQuotaService

logger = get_logger(__name__)


class UserDubbingService:
    """
    User-facing dubbing and subtitle service

    Provides:
    - Audio dubbing (Hebrew → English/Spanish)
    - Live subtitles (Hebrew → English/Spanish text)
    - Combined mode (dubbing + subtitles)
    """

    def __init__(self, user: User):
        self.user = user
        self.quota_service = UserQuotaService()

    async def create_session(
        self, request: CreateSessionRequest
    ) -> tuple[UserDubbingSession, str]:
        """
        Create a new dubbing/subtitle session

        Args:
            request: Session creation request

        Returns:
            tuple: (UserDubbingSession, websocket_url)

        Raises:
            ValueError: If quota exhausted or invalid parameters
        """
        try:
            # Validate session type
            if not request.audio_dubbing and not request.live_subtitles:
                raise ValueError(
                    "At least one of audio_dubbing or live_subtitles must be enabled"
                )

            # Check quota (server-side enforcement)
            has_quota = await self.quota_service.check_and_reserve_quota(
                str(self.user.id), estimated_duration_minutes=0.5
            )

            if not has_quota:
                raise ValueError(
                    f"Daily quota of {UserQuotaService.FREE_TIER_MINUTES_PER_DAY} minutes exhausted. "
                    "Upgrade to premium for unlimited dubbing."
                )

            # Generate session ID
            session_id = f"session_{uuid.uuid4().hex[:16]}"

            # Create session type configuration
            session_type = DubbingSessionType(
                audio_dubbing=request.audio_dubbing,
                live_subtitles=request.live_subtitles,
                subtitle_language=request.subtitle_language or request.target_language,
            )

            # Create session document
            session = UserDubbingSession(
                user_id=str(self.user.id),
                session_id=session_id,
                session_type=session_type,
                source_language=request.source_language,
                target_language=request.target_language,
                voice_id=request.voice_id,
                status="active",
                extension_version=request.extension_version,
                browser=request.browser,
                platform=request.platform,
            )

            await session.insert()

            # Generate WebSocket URL
            websocket_url = (
                f"{settings.WEBSOCKET_BASE_URL}/api/v1/dubbing/ws/{session_id}"
            )

            logger.info(
                f"Created dubbing session for user {self.user.id}",
                extra={
                    "session_id": session_id,
                    "audio_dubbing": request.audio_dubbing,
                    "live_subtitles": request.live_subtitles,
                    "source_language": request.source_language,
                    "target_language": request.target_language,
                },
            )

            return session, websocket_url

        except Exception as e:
            logger.error(
                f"Error creating dubbing session for user {self.user.id}: {e}",
                exc_info=True,
            )
            raise

    async def get_session(self, session_id: str) -> Optional[UserDubbingSession]:
        """
        Get session by ID

        Args:
            session_id: Session ID

        Returns:
            UserDubbingSession or None if not found
        """
        try:
            session = await UserDubbingSession.find_one(
                UserDubbingSession.session_id == session_id,
                UserDubbingSession.user_id == str(self.user.id),
            )

            if not session:
                logger.warning(
                    f"Session not found: {session_id} for user {self.user.id}"
                )
                return None

            return session

        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}", exc_info=True)
            return None

    async def end_session(
        self, session_id: str, actual_duration_seconds: float
    ) -> Optional[UserDubbingSession]:
        """
        End a dubbing session and adjust quota

        Args:
            session_id: Session ID
            actual_duration_seconds: Actual session duration in seconds

        Returns:
            Updated UserDubbingSession or None if not found
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return None

            # Update session
            session.status = "completed"
            session.end_time = datetime.now(timezone.utc)
            session.duration_seconds = actual_duration_seconds
            session.updated_at = datetime.now(timezone.utc)

            await session.save()

            # Adjust quota (actual vs reserved)
            actual_minutes = actual_duration_seconds / 60.0
            reserved_minutes = 0.5  # Initial reservation
            await self.quota_service.deduct_actual_usage(
                str(self.user.id), actual_minutes, reserved_minutes
            )

            logger.info(
                f"Ended dubbing session {session_id}",
                extra={
                    "user_id": str(self.user.id),
                    "duration_seconds": actual_duration_seconds,
                    "duration_minutes": actual_minutes,
                },
            )

            return session

        except Exception as e:
            logger.error(f"Error ending session {session_id}: {e}", exc_info=True)
            return None

    async def update_session_activity(
        self,
        session_id: str,
        audio_chunks_processed: int = 0,
        subtitles_generated: int = 0,
        bytes_transferred: int = 0,
    ) -> None:
        """
        Update session activity statistics

        Args:
            session_id: Session ID
            audio_chunks_processed: Number of audio chunks processed
            subtitles_generated: Number of subtitles generated
            bytes_transferred: Bytes transferred
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return

            # Update statistics
            if audio_chunks_processed > 0:
                session.audio_chunks_processed += audio_chunks_processed

            if subtitles_generated > 0:
                session.subtitles_generated += subtitles_generated

            if bytes_transferred > 0:
                session.bytes_transferred += bytes_transferred

            session.last_activity = datetime.now(timezone.utc)
            session.updated_at = datetime.now(timezone.utc)

            await session.save()

        except Exception as e:
            logger.error(
                f"Error updating session activity {session_id}: {e}", exc_info=True
            )

    async def mark_session_failed(
        self, session_id: str, error_message: str
    ) -> None:
        """
        Mark session as failed

        Args:
            session_id: Session ID
            error_message: Error message
        """
        try:
            session = await self.get_session(session_id)
            if not session:
                return

            session.status = "failed"
            session.error_message = error_message
            session.error_count += 1
            session.end_time = datetime.now(timezone.utc)
            session.updated_at = datetime.now(timezone.utc)

            await session.save()

            logger.error(
                f"Session {session_id} failed",
                extra={"user_id": str(self.user.id), "error": error_message},
            )

        except Exception as e:
            logger.error(f"Error marking session failed {session_id}: {e}", exc_info=True)

    async def cleanup_expired_sessions(self, expiry_hours: int = 24) -> int:
        """
        Cleanup expired sessions

        Args:
            expiry_hours: Hours after which sessions expire

        Returns:
            Number of sessions cleaned up
        """
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=expiry_hours)

            expired_sessions = await UserDubbingSession.find(
                UserDubbingSession.user_id == str(self.user.id),
                UserDubbingSession.status == "active",
                UserDubbingSession.last_activity < cutoff_time,
            ).to_list()

            count = 0
            for session in expired_sessions:
                session.status = "expired"
                session.end_time = datetime.now(timezone.utc)
                session.updated_at = datetime.now(timezone.utc)
                await session.save()
                count += 1

            if count > 0:
                logger.info(
                    f"Cleaned up {count} expired sessions for user {self.user.id}"
                )

            return count

        except Exception as e:
            logger.error(
                f"Error cleaning up expired sessions for user {self.user.id}: {e}",
                exc_info=True,
            )
            return 0
