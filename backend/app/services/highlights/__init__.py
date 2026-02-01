"""
Highlights Service - Detects and stores live transcript highlights.

Subscribes to TranscriptEventBus and analyzes transcripts using
sliding window detection algorithms to identify highlight-worthy moments.
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.highlight import LiveHighlight
from app.services.highlights.detector import DetectedHighlight, HighlightDetector
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)

_highlights_service: Optional["HighlightsService"] = None


class HighlightsService:
    """Service for highlight detection and retrieval with bus integration."""

    def __init__(self):
        """Initialize highlights service."""
        self._config = settings.olorin.highlights
        self._detector = HighlightDetector()
        self._active_channels: set[str] = set()
        self._consumer_tasks: dict[str, asyncio.Task] = {}
        self._windows: dict[str, deque[TranscriptEvent]] = {}
        self._hourly_counts: dict[str, int] = {}
        self._hour_starts: dict[str, datetime] = {}
        self._lock = asyncio.Lock()

        logger.info(
            "HighlightsService initialized",
            extra={
                "enabled": self._config.enabled,
                "window_size": self._config.window_size,
                "max_per_hour": self._config.max_per_hour,
            },
        )

    async def start_detection(self, channel_id: str) -> None:
        """Start highlight detection for a channel.

        Args:
            channel_id: Channel to detect highlights for
        """
        if not self._config.enabled:
            logger.debug("Highlights detection disabled by configuration")
            return

        async with self._lock:
            if channel_id in self._active_channels:
                logger.debug(
                    "Already detecting for channel",
                    extra={"channel_id": channel_id},
                )
                return

            self._active_channels.add(channel_id)
            self._windows[channel_id] = deque(maxlen=self._config.window_size)
            self._hourly_counts[channel_id] = 0
            self._hour_starts[channel_id] = datetime.utcnow()

            transcript_bus = get_transcript_bus()
            queue = await transcript_bus.subscribe(
                channel_id,
                f"highlights_{channel_id}",
                queue_size=self._config.queue_size,
            )

            task = asyncio.create_task(self._detection_loop(channel_id, queue))
            self._consumer_tasks[channel_id] = task

            logger.info(
                "Started highlight detection",
                extra={"channel_id": channel_id},
            )

    async def stop_detection(self, channel_id: str) -> None:
        """Stop highlight detection for a channel.

        Args:
            channel_id: Channel to stop detecting for
        """
        async with self._lock:
            if channel_id not in self._active_channels:
                return

            self._active_channels.discard(channel_id)

            if channel_id in self._consumer_tasks:
                self._consumer_tasks[channel_id].cancel()
                try:
                    await self._consumer_tasks[channel_id]
                except asyncio.CancelledError:
                    pass
                del self._consumer_tasks[channel_id]

            if channel_id in self._windows:
                del self._windows[channel_id]
            if channel_id in self._hourly_counts:
                del self._hourly_counts[channel_id]
            if channel_id in self._hour_starts:
                del self._hour_starts[channel_id]

            transcript_bus = get_transcript_bus()
            await transcript_bus.unsubscribe(channel_id, f"highlights_{channel_id}")

            logger.info(
                "Stopped highlight detection",
                extra={"channel_id": channel_id},
            )

    async def _detection_loop(
        self, channel_id: str, queue: asyncio.Queue[TranscriptEvent]
    ) -> None:
        """Detection loop for a channel.

        Args:
            channel_id: Channel identifier
            queue: Queue receiving transcript events
        """
        highlights_detected = 0

        try:
            while channel_id in self._active_channels:
                event = await queue.get()

                if event.event_type == "channel_end":
                    logger.info(
                        "Channel ended, stopping detection",
                        extra={
                            "channel_id": channel_id,
                            "total_detected": highlights_detected,
                        },
                    )
                    break

                if event.event_type == "transcript" and not event.is_partial:
                    window = self._windows.get(channel_id)
                    if window is not None:
                        window.append(event)

                        # Check rate limit
                        if not self._check_rate_limit(channel_id):
                            continue

                        # Analyze window for highlights
                        highlight = await self._detector.analyze_window(window)
                        if highlight:
                            await self._save_highlight(highlight)
                            highlights_detected += 1
                            self._hourly_counts[channel_id] += 1

        except asyncio.CancelledError:
            logger.debug(
                "Detection loop cancelled",
                extra={
                    "channel_id": channel_id,
                    "total_detected": highlights_detected,
                },
            )
            raise
        except Exception as e:
            logger.error(
                "Detection loop error",
                extra={
                    "channel_id": channel_id,
                    "error": str(e),
                    "total_detected": highlights_detected,
                },
            )

    def _check_rate_limit(self, channel_id: str) -> bool:
        """Check if we can create more highlights this hour.

        Args:
            channel_id: Channel identifier

        Returns:
            True if under rate limit, False otherwise
        """
        now = datetime.utcnow()
        hour_start = self._hour_starts.get(channel_id, now)

        # Reset counter if hour has passed
        if now - hour_start >= timedelta(hours=1):
            self._hourly_counts[channel_id] = 0
            self._hour_starts[channel_id] = now
            return True

        # Check if under limit
        count = self._hourly_counts.get(channel_id, 0)
        return count < self._config.max_per_hour

    async def _save_highlight(self, highlight: DetectedHighlight) -> None:
        """Save detected highlight to MongoDB.

        Args:
            highlight: Detected highlight to save
        """
        try:
            doc = LiveHighlight(
                channel_id=highlight.channel_id,
                start_time=highlight.start_time,
                end_time=highlight.end_time,
                transcript_text=highlight.transcript_text,
                highlight_type=highlight.highlight_type,
                confidence=highlight.confidence,
                metadata=highlight.metadata,
            )
            await doc.insert()

            logger.info(
                "Saved highlight",
                extra={
                    "channel_id": highlight.channel_id,
                    "highlight_id": doc.highlight_id,
                    "type": highlight.highlight_type,
                    "confidence": highlight.confidence,
                },
            )
        except Exception as e:
            logger.error(
                "Failed to save highlight",
                extra={
                    "channel_id": highlight.channel_id,
                    "error": str(e),
                },
            )

    def get_active_channels(self) -> list[str]:
        """Get list of channels with active detection.

        Returns:
            List of channel IDs
        """
        return list(self._active_channels)

    async def get_highlights(
        self,
        channel_id: str,
        limit: int = 20,
        highlight_type: Optional[str] = None,
    ) -> list[dict]:
        """Get recent highlights for a channel.

        Args:
            channel_id: Channel identifier
            limit: Maximum results
            highlight_type: Optional filter by type

        Returns:
            List of highlight dictionaries
        """
        highlights = await LiveHighlight.get_for_channel(
            channel_id=channel_id,
            limit=limit,
            highlight_type=highlight_type,
        )
        return [
            {
                "highlight_id": h.highlight_id,
                "channel_id": h.channel_id,
                "start_time": h.start_time,
                "end_time": h.end_time,
                "transcript_text": h.transcript_text,
                "highlight_type": h.highlight_type,
                "confidence": h.confidence,
                "metadata": h.metadata,
                "created_at": h.created_at.isoformat(),
            }
            for h in highlights
        ]

    async def cleanup(self) -> None:
        """Stop all active detection tasks."""
        for channel_id in list(self._active_channels):
            await self.stop_detection(channel_id)
        logger.info("Cleaned up all highlight detection tasks")


def get_highlights_service() -> HighlightsService:
    """Get or create singleton HighlightsService instance.

    Returns:
        Highlights service singleton
    """
    global _highlights_service
    if _highlights_service is None:
        _highlights_service = HighlightsService()
    return _highlights_service
