"""
Catchup Bus Integration - Feeds transcript bus events to ChannelTranscriptService.

Subscribes to the TranscriptEventBus and accumulates transcripts for the
catch-up TV feature, which allows users to get summaries of missed content.
"""

import asyncio
from datetime import datetime

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.transcript_service import (
    TranscriptSegment,
    get_transcript_service,
)
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)


class CatchupBusConsumer:
    """
    Consumes transcript events from the bus and feeds to catchup service.

    Subscribes to TranscriptEventBus and adds segments to the existing
    ChannelTranscriptService buffer for catch-up TV functionality.
    """

    def __init__(self):
        """Initialize the catchup bus consumer."""
        self._active_consumers: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._config = settings.olorin.catchup

    async def start_accumulating(self, channel_id: str) -> None:
        """
        Start accumulating transcripts for a channel.

        Args:
            channel_id: Channel to accumulate transcripts for
        """
        if not self._config.enabled:
            logger.debug(
                "Catchup bus integration disabled",
                extra={"channel_id": channel_id},
            )
            return

        async with self._lock:
            if channel_id in self._active_consumers:
                logger.debug(
                    "Already accumulating for channel",
                    extra={"channel_id": channel_id},
                )
                return

            transcript_bus = get_transcript_bus()
            queue = await transcript_bus.subscribe(
                channel_id=channel_id,
                consumer_id=f"catchup_{channel_id}",
                queue_size=self._config.queue_size,
            )

            task = asyncio.create_task(
                self._accumulate_loop(channel_id, queue)
            )
            self._active_consumers[channel_id] = task

            logger.info(
                "Started catchup accumulation",
                extra={"channel_id": channel_id},
            )

    async def stop_accumulating(self, channel_id: str) -> None:
        """
        Stop accumulating transcripts for a channel.

        Args:
            channel_id: Channel to stop accumulating for
        """
        async with self._lock:
            if channel_id not in self._active_consumers:
                return

            task = self._active_consumers.pop(channel_id)
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
        self, channel_id: str, queue: asyncio.Queue[TranscriptEvent]
    ) -> None:
        """
        Accumulate transcripts from bus into catchup service.

        Args:
            channel_id: Channel identifier
            queue: Queue to receive events from
        """
        transcript_service = get_transcript_service()

        try:
            while True:
                event = await queue.get()

                if event.event_type == "channel_end":
                    logger.info(
                        "Channel ended, stopping catchup accumulation",
                        extra={"channel_id": channel_id},
                    )
                    break

                if event.event_type != "transcript":
                    continue

                if event.is_partial:
                    continue

                segment = TranscriptSegment(
                    text=event.text,
                    timestamp=datetime.fromtimestamp(event.timestamp),
                    language=event.source_lang,
                )

                await transcript_service.add_transcript(channel_id, segment)

                logger.debug(
                    "Added transcript to catchup buffer",
                    extra={
                        "channel_id": channel_id,
                        "text_length": len(event.text),
                    },
                )

        except asyncio.CancelledError:
            logger.info(
                "Catchup accumulation cancelled",
                extra={"channel_id": channel_id},
            )
        except Exception as e:
            logger.error(
                "Error in catchup accumulation",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    def get_active_channels(self) -> list[str]:
        """Get list of channels currently being accumulated."""
        return list(self._active_consumers.keys())


_catchup_consumer: CatchupBusConsumer | None = None


def get_catchup_consumer() -> CatchupBusConsumer:
    """Get the singleton CatchupBusConsumer instance."""
    global _catchup_consumer
    if _catchup_consumer is None:
        _catchup_consumer = CatchupBusConsumer()
    return _catchup_consumer
