"""
Catchup Bus Consumer - Feeds transcript bus events into transcript buffer.

Subscribes to TranscriptEventBus and accumulates transcripts
for catch-up summary generation.
"""

import asyncio
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.transcript_service import (
    TranscriptSegment,
    get_transcript_service,
)
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)


class CatchupBusConsumer:
    """Feeds transcript bus events into existing ChannelTranscriptService."""

    def __init__(self):
        """Initialize catchup bus consumer."""
        self._config = settings.olorin.catchup
        self._active_tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

        logger.info(
            "CatchupBusConsumer initialized",
            extra={"queue_size": self._config.queue_size},
        )

    async def start_accumulating(self, channel_id: str) -> None:
        """Start accumulating transcripts for a channel.

        Args:
            channel_id: Channel to start accumulating for
        """
        async with self._lock:
            if channel_id in self._active_tasks:
                logger.debug(
                    "Already accumulating for channel",
                    extra={"channel_id": channel_id},
                )
                return

            transcript_bus = get_transcript_bus()
            transcript_service = get_transcript_service()

            queue = await transcript_bus.subscribe(
                channel_id,
                f"catchup_{channel_id}",
                queue_size=self._config.queue_size,
            )

            task = asyncio.create_task(
                self._accumulate_loop(channel_id, queue, transcript_service)
            )
            self._active_tasks[channel_id] = task

            logger.info(
                "Started catchup accumulation",
                extra={"channel_id": channel_id},
            )

    async def stop_accumulating(self, channel_id: str) -> None:
        """Stop accumulating transcripts for a channel.

        Args:
            channel_id: Channel to stop accumulating for
        """
        async with self._lock:
            if channel_id not in self._active_tasks:
                return

            task = self._active_tasks.pop(channel_id)
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass

            transcript_bus = get_transcript_bus()
            await transcript_bus.unsubscribe(channel_id, f"catchup_{channel_id}")

            logger.info(
                "Stopped catchup accumulation",
                extra={"channel_id": channel_id},
            )

    async def _accumulate_loop(
        self,
        channel_id: str,
        queue: asyncio.Queue[TranscriptEvent],
        transcript_service,
    ) -> None:
        """Accumulate transcripts from queue into transcript service.

        Args:
            channel_id: Channel identifier
            queue: Queue receiving transcript events
            transcript_service: Service to add transcripts to
        """
        accumulated = 0

        try:
            while True:
                event = await queue.get()

                if event.event_type == "channel_end":
                    logger.info(
                        "Channel ended, stopping catchup accumulation",
                        extra={
                            "channel_id": channel_id,
                            "total_accumulated": accumulated,
                        },
                    )
                    break

                if event.event_type == "transcript" and not event.is_partial:
                    segment = TranscriptSegment(
                        text=event.text,
                        timestamp=datetime.fromtimestamp(event.timestamp),
                        language=event.source_lang,
                    )
                    await transcript_service.add_transcript(channel_id, segment)
                    accumulated += 1

                    if accumulated % 100 == 0:
                        logger.debug(
                            "Catchup accumulation progress",
                            extra={
                                "channel_id": channel_id,
                                "accumulated": accumulated,
                            },
                        )

        except asyncio.CancelledError:
            logger.info(
                "Catchup accumulation cancelled",
                extra={
                    "channel_id": channel_id,
                    "total_accumulated": accumulated,
                },
            )
            raise
        except Exception as e:
            logger.error(
                "Catchup accumulation error",
                extra={
                    "channel_id": channel_id,
                    "error": str(e),
                    "total_accumulated": accumulated,
                },
            )

    def get_active_channels(self) -> list[str]:
        """Get list of channels with active accumulation.

        Returns:
            List of channel IDs
        """
        return list(self._active_tasks.keys())

    async def cleanup(self) -> None:
        """Stop all active accumulation tasks."""
        async with self._lock:
            for channel_id, task in list(self._active_tasks.items()):
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            self._active_tasks.clear()
            logger.info("Cleaned up all catchup accumulation tasks")


# Module-level singleton
_catchup_consumer: Optional[CatchupBusConsumer] = None


def get_catchup_consumer() -> CatchupBusConsumer:
    """Get singleton CatchupBusConsumer instance.

    Returns:
        Catchup bus consumer singleton
    """
    global _catchup_consumer
    if _catchup_consumer is None:
        _catchup_consumer = CatchupBusConsumer()
    return _catchup_consumer
