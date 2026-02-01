"""
HighlightsService - Real-time highlight detection for live streams.

Subscribes to the TranscriptEventBus and detects notable moments
using sliding window analysis of transcripts.
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.highlight import LiveHighlight
from app.services.highlights.detector import HighlightDetector
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)


class HighlightsService:
    """
    Real-time highlight detection service.

    Subscribes to transcript bus and uses sliding window analysis
    to detect notable moments (emotional, entity, keyword, dramatic).
    """

    def __init__(self):
        """Initialize the highlights service."""
        self._active_detectors: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._config = settings.olorin.highlights

    async def start_detection(self, channel_id: str) -> None:
        """
        Start highlight detection for a channel.

        Args:
            channel_id: Channel to detect highlights for
        """
        if not self._config.enabled:
            logger.debug(
                "Highlights service disabled",
                extra={"channel_id": channel_id},
            )
            return

        async with self._lock:
            if channel_id in self._active_detectors:
                logger.debug(
                    "Already detecting for channel",
                    extra={"channel_id": channel_id},
                )
                return

            transcript_bus = get_transcript_bus()
            queue = await transcript_bus.subscribe(
                channel_id=channel_id,
                consumer_id=f"highlights_{channel_id}",
                queue_size=self._config.queue_size,
            )

            task = asyncio.create_task(
                self._detection_loop(channel_id, queue)
            )
            self._active_detectors[channel_id] = task

            logger.info(
                "Started highlight detection",
                extra={"channel_id": channel_id},
            )

    async def stop_detection(self, channel_id: str) -> None:
        """
        Stop highlight detection for a channel.

        Args:
            channel_id: Channel to stop detecting for
        """
        async with self._lock:
            if channel_id not in self._active_detectors:
                return

            task = self._active_detectors.pop(channel_id)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            transcript_bus = get_transcript_bus()
            await transcript_bus.unsubscribe(channel_id, f"highlights_{channel_id}")

            logger.info(
                "Stopped highlight detection",
                extra={"channel_id": channel_id},
            )

    async def _detection_loop(
        self, channel_id: str, queue: asyncio.Queue[TranscriptEvent]
    ) -> None:
        """
        Detect highlights from sliding window of transcripts.

        Args:
            channel_id: Channel identifier
            queue: Queue to receive events from
        """
        window: deque[TranscriptEvent] = deque(maxlen=self._config.window_size)
        detector = HighlightDetector(min_confidence=self._config.min_confidence)
        last_highlight_time: float = 0.0
        min_interval: float = 30.0

        try:
            while True:
                event = await queue.get()

                if event.event_type == "channel_end":
                    logger.info(
                        "Channel ended, stopping highlight detection",
                        extra={"channel_id": channel_id},
                    )
                    break

                if event.event_type != "transcript":
                    continue

                if event.is_partial:
                    continue

                window.append(event)

                if event.timestamp - last_highlight_time < min_interval:
                    continue

                if not await self._can_add_highlight(channel_id):
                    continue

                highlight = await detector.analyze_window(window)
                if highlight:
                    await self._save_highlight(channel_id, highlight)
                    last_highlight_time = event.timestamp
                    window.clear()

        except asyncio.CancelledError:
            logger.info(
                "Detection loop cancelled",
                extra={"channel_id": channel_id},
            )
        except Exception as e:
            logger.error(
                "Error in detection loop",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    async def _can_add_highlight(self, channel_id: str) -> bool:
        """Check if we can add more highlights (rate limiting)."""
        hour_ago = datetime.utcnow() - timedelta(hours=1)
        count = await LiveHighlight.count_recent(channel_id, hour_ago)
        return count < self._config.max_per_hour

    async def _save_highlight(self, channel_id: str, highlight) -> None:
        """Save detected highlight to database."""
        try:
            doc = LiveHighlight(
                channel_id=channel_id,
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
                    "channel_id": channel_id,
                    "highlight_type": highlight.highlight_type,
                    "confidence": highlight.confidence,
                },
            )
        except Exception as e:
            logger.error(
                "Error saving highlight",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    async def get_highlights(
        self,
        channel_id: str,
        limit: int = 20,
        highlight_type: str | None = None,
    ) -> list[dict]:
        """
        Get recent highlights for a channel.

        Args:
            channel_id: Channel to get highlights for
            limit: Maximum results
            highlight_type: Filter by type

        Returns:
            List of highlight dictionaries
        """
        results = await LiveHighlight.get_recent(
            channel_id, limit, highlight_type
        )
        return [
            {
                "highlight_id": r.highlight_id,
                "start_time": r.start_time,
                "end_time": r.end_time,
                "transcript_text": r.transcript_text,
                "highlight_type": r.highlight_type,
                "confidence": r.confidence,
                "metadata": r.metadata,
                "created_at": r.created_at.isoformat(),
            }
            for r in results
        ]

    def get_active_channels(self) -> list[str]:
        """Get list of channels currently being monitored."""
        return list(self._active_detectors.keys())


_highlights_service: HighlightsService | None = None


def get_highlights_service() -> HighlightsService:
    """Get the singleton HighlightsService instance."""
    global _highlights_service
    if _highlights_service is None:
        _highlights_service = HighlightsService()
    return _highlights_service
