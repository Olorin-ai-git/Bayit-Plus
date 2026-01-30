"""Channel transcript buffer service for live stream catch-up."""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class TranscriptSegment:
    """Single transcript segment from live channel STT."""

    text: str
    timestamp: datetime
    language: str


class TranscriptBuffer:
    """In-memory buffer for channel transcript with time-based retention."""

    def __init__(self, channel_id: str, max_duration_minutes: int):
        """Initialize transcript buffer.

        Args:
            channel_id: Channel identifier
            max_duration_minutes: Maximum buffer retention duration
        """
        self.channel_id = channel_id
        self.max_duration_minutes = max_duration_minutes
        self._segments: List[TranscriptSegment] = []
        self._lock = asyncio.Lock()
        logger.info(
            "Transcript buffer initialized",
            extra={
                "channel_id": channel_id,
                "max_duration_minutes": max_duration_minutes,
            },
        )

    async def add_segment(self, segment: TranscriptSegment) -> None:
        """Add segment and trim old entries beyond buffer limit.

        Args:
            segment: Transcript segment to add
        """
        async with self._lock:
            self._segments.append(segment)

            # Trim segments older than max duration
            cutoff_time = datetime.now(timezone.utc) - timedelta(
                minutes=self.max_duration_minutes
            )
            original_count = len(self._segments)
            self._segments = [s for s in self._segments if s.timestamp >= cutoff_time]
            trimmed_count = original_count - len(self._segments)

            if trimmed_count > 0:
                logger.debug(
                    "Trimmed old transcript segments",
                    extra={
                        "channel_id": self.channel_id,
                        "trimmed_count": trimmed_count,
                        "remaining_count": len(self._segments),
                    },
                )

    async def get_transcript(
        self, window_start: datetime, window_end: datetime
    ) -> List[TranscriptSegment]:
        """Get transcript segments within time range.

        Args:
            window_start: Start of time window
            window_end: End of time window

        Returns:
            List of transcript segments in range
        """
        async with self._lock:
            segments = [
                s
                for s in self._segments
                if window_start <= s.timestamp <= window_end
            ]
            logger.debug(
                "Retrieved transcript segments",
                extra={
                    "channel_id": self.channel_id,
                    "window_start": window_start.isoformat(),
                    "window_end": window_end.isoformat(),
                    "segment_count": len(segments),
                },
            )
            return segments

    async def get_duration_seconds(self) -> float:
        """Get total buffer duration in seconds.

        Returns:
            Duration in seconds between first and last segment
        """
        async with self._lock:
            if not self._segments:
                return 0.0

            first_timestamp = self._segments[0].timestamp
            last_timestamp = self._segments[-1].timestamp
            duration = (last_timestamp - first_timestamp).total_seconds()
            return duration


class ChannelTranscriptService:
    """Singleton service managing transcript buffers for all live channels."""

    def __init__(self):
        """Initialize channel transcript service."""
        self._active_buffers: Dict[str, TranscriptBuffer] = {}
        self._lock = asyncio.Lock()
        self._max_buffer_minutes = settings.olorin.catchup.transcript_buffer_max_minutes
        logger.info(
            "Channel transcript service initialized",
            extra={"max_buffer_minutes": self._max_buffer_minutes},
        )

    async def get_or_create_buffer(self, channel_id: str) -> TranscriptBuffer:
        """Get existing buffer or create new one for channel.

        Args:
            channel_id: Channel identifier

        Returns:
            Transcript buffer for channel
        """
        async with self._lock:
            if channel_id not in self._active_buffers:
                buffer = TranscriptBuffer(channel_id, self._max_buffer_minutes)
                self._active_buffers[channel_id] = buffer
                logger.info(
                    "Created new transcript buffer",
                    extra={"channel_id": channel_id},
                )
            return self._active_buffers[channel_id]

    async def add_transcript(
        self, channel_id: str, segment: TranscriptSegment
    ) -> None:
        """Add transcript segment to channel buffer.

        Fed by STT background task during live streaming.

        Args:
            channel_id: Channel identifier
            segment: Transcript segment to add
        """
        buffer = await self.get_or_create_buffer(channel_id)
        await buffer.add_segment(segment)
        logger.debug(
            "Added transcript segment",
            extra={
                "channel_id": channel_id,
                "text_length": len(segment.text),
                "timestamp": segment.timestamp.isoformat(),
                "language": segment.language,
            },
        )

    async def get_transcript(
        self, channel_id: str, window_start: datetime, window_end: datetime
    ) -> List[TranscriptSegment]:
        """Get transcript segments for channel within time window.

        Args:
            channel_id: Channel identifier
            window_start: Start of time window
            window_end: End of time window

        Returns:
            List of transcript segments in range
        """
        buffer = await self.get_or_create_buffer(channel_id)
        return await buffer.get_transcript(window_start, window_end)

    async def has_sufficient_data(self, channel_id: str, min_seconds: int) -> bool:
        """Check if channel buffer has sufficient data duration.

        Args:
            channel_id: Channel identifier
            min_seconds: Minimum required duration in seconds

        Returns:
            True if buffer has at least min_seconds of data
        """
        async with self._lock:
            if channel_id not in self._active_buffers:
                return False

            buffer = self._active_buffers[channel_id]
            duration = await buffer.get_duration_seconds()
            has_sufficient = duration >= min_seconds

            logger.debug(
                "Checked transcript data sufficiency",
                extra={
                    "channel_id": channel_id,
                    "duration_seconds": duration,
                    "min_seconds": min_seconds,
                    "has_sufficient": has_sufficient,
                },
            )
            return has_sufficient

    async def cleanup_inactive_channels(self, active_channel_ids: set) -> None:
        """Remove buffers for channels not in active set.

        Args:
            active_channel_ids: Set of currently active channel IDs
        """
        async with self._lock:
            inactive_channels = set(self._active_buffers.keys()) - active_channel_ids
            for channel_id in inactive_channels:
                del self._active_buffers[channel_id]
                logger.info(
                    "Cleaned up inactive channel buffer",
                    extra={"channel_id": channel_id},
                )

            if inactive_channels:
                logger.info(
                    "Completed inactive channel cleanup",
                    extra={
                        "removed_count": len(inactive_channels),
                        "remaining_count": len(self._active_buffers),
                    },
                )


# Module-level singleton
_transcript_service: Optional[ChannelTranscriptService] = None


def get_transcript_service() -> ChannelTranscriptService:
    """Get singleton transcript service instance.

    Returns:
        Channel transcript service singleton
    """
    global _transcript_service
    if _transcript_service is None:
        _transcript_service = ChannelTranscriptService()
    return _transcript_service
