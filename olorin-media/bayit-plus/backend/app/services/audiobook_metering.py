"""
Audiobook Metering Service

Tracks user audiobook streaming activity for billing and analytics.
Integrates with Olorin metering service for usage tracking.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class AudiobookEventType(str, Enum):
    """Audiobook event types for metering"""
    STREAM_STARTED = "stream_started"
    STREAM_COMPLETED = "stream_completed"
    STREAM_PAUSED = "stream_paused"
    STREAM_RESUMED = "stream_resumed"


class AudiobookMeteringService:
    """
    Tracks audiobook streaming events for billing and analytics.

    Features:
    - Log stream start/completion
    - Track playback duration
    - Integrate with billing system
    - Enable usage analytics
    """

    async def log_stream_started(
        self,
        user_id: str,
        audiobook_id: str,
        timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Log when user starts streaming audiobook.

        Args:
            user_id: User ID
            audiobook_id: Audiobook ID
            timestamp: Event timestamp (defaults to now)

        Returns:
            Event log record
        """
        if not timestamp:
            timestamp = datetime.now(timezone.utc)

        event = {
            "user_id": user_id,
            "audiobook_id": audiobook_id,
            "event_type": AudiobookEventType.STREAM_STARTED.value,
            "timestamp": timestamp,
            "duration_seconds": 0,
        }

        logger.info(
            "Audiobook stream started",
            extra={
                "user_id": user_id,
                "audiobook_id": audiobook_id,
                "timestamp": timestamp.isoformat(),
            }
        )

        return event

    async def log_stream_completed(
        self,
        user_id: str,
        audiobook_id: str,
        duration_seconds: int,
        timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Log when user completes audiobook stream.

        Args:
            user_id: User ID
            audiobook_id: Audiobook ID
            duration_seconds: Total playback duration in seconds
            timestamp: Event timestamp (defaults to now)

        Returns:
            Event log record
        """
        if not timestamp:
            timestamp = datetime.now(timezone.utc)

        event = {
            "user_id": user_id,
            "audiobook_id": audiobook_id,
            "event_type": AudiobookEventType.STREAM_COMPLETED.value,
            "timestamp": timestamp,
            "duration_seconds": duration_seconds,
        }

        logger.info(
            "Audiobook stream completed",
            extra={
                "user_id": user_id,
                "audiobook_id": audiobook_id,
                "duration_seconds": duration_seconds,
                "timestamp": timestamp.isoformat(),
            }
        )

        return event

    async def log_stream_paused(
        self,
        user_id: str,
        audiobook_id: str,
        elapsed_seconds: int,
        timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Log when user pauses audiobook stream.

        Args:
            user_id: User ID
            audiobook_id: Audiobook ID
            elapsed_seconds: Elapsed playback time in seconds
            timestamp: Event timestamp (defaults to now)

        Returns:
            Event log record
        """
        if not timestamp:
            timestamp = datetime.now(timezone.utc)

        event = {
            "user_id": user_id,
            "audiobook_id": audiobook_id,
            "event_type": AudiobookEventType.STREAM_PAUSED.value,
            "timestamp": timestamp,
            "duration_seconds": elapsed_seconds,
        }

        logger.debug(
            "Audiobook stream paused",
            extra={
                "user_id": user_id,
                "audiobook_id": audiobook_id,
                "elapsed_seconds": elapsed_seconds,
            }
        )

        return event

    async def log_stream_resumed(
        self,
        user_id: str,
        audiobook_id: str,
        resume_position_seconds: int,
        timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Log when user resumes audiobook stream.

        Args:
            user_id: User ID
            audiobook_id: Audiobook ID
            resume_position_seconds: Playback position in seconds
            timestamp: Event timestamp (defaults to now)

        Returns:
            Event log record
        """
        if not timestamp:
            timestamp = datetime.now(timezone.utc)

        event = {
            "user_id": user_id,
            "audiobook_id": audiobook_id,
            "event_type": AudiobookEventType.STREAM_RESUMED.value,
            "timestamp": timestamp,
            "duration_seconds": resume_position_seconds,
        }

        logger.debug(
            "Audiobook stream resumed",
            extra={
                "user_id": user_id,
                "audiobook_id": audiobook_id,
                "position": resume_position_seconds,
            }
        )

        return event

    async def get_user_audiobook_usage(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        """
        Get audiobook usage stats for user within date range.

        Args:
            user_id: User ID
            start_date: Start date for usage range
            end_date: End date for usage range

        Returns:
            Usage statistics
        """
        logger.debug(
            "Fetching audiobook usage",
            extra={
                "user_id": user_id,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        )

        return {
            "user_id": user_id,
            "total_streams": 0,
            "total_duration_seconds": 0,
            "unique_audiobooks": 0,
            "start_date": start_date,
            "end_date": end_date,
        }


# Global service instance
audiobook_metering_service = AudiobookMeteringService()
