"""
Search Index Service - Indexes and searches live transcripts.

Subscribes to TranscriptEventBus and indexes transcripts for full-text search
with debounced batch indexing for efficiency.
"""

import asyncio
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.live_transcript_index import LiveTranscriptIndex
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)

_search_index_service: Optional["SearchIndexService"] = None


class SearchIndexService:
    """Service for live transcript indexing and search with batch processing."""

    def __init__(self):
        """Initialize search index service."""
        self._config = settings.olorin.search_index
        self._active_channels: set[str] = set()
        self._batch_buffers: dict[str, list[TranscriptEvent]] = {}
        self._consumer_tasks: dict[str, asyncio.Task] = {}
        self._flush_tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

        logger.info(
            "SearchIndexService initialized",
            extra={
                "enabled": self._config.enabled,
                "batch_size": self._config.batch_size,
                "flush_interval": self._config.flush_interval_seconds,
            },
        )

    async def start_indexing(self, channel_id: str) -> None:
        """Start indexing for a channel.

        Args:
            channel_id: Channel to start indexing
        """
        if not self._config.enabled:
            logger.debug("Search indexing disabled by configuration")
            return

        async with self._lock:
            if channel_id in self._active_channels:
                logger.debug(
                    "Already indexing channel",
                    extra={"channel_id": channel_id},
                )
                return

            self._active_channels.add(channel_id)
            self._batch_buffers[channel_id] = []

            transcript_bus = get_transcript_bus()
            queue = await transcript_bus.subscribe(
                channel_id,
                f"search_{channel_id}",
                queue_size=self._config.queue_size,
            )

            # Start consumer task
            consumer_task = asyncio.create_task(
                self._index_loop(channel_id, queue)
            )
            self._consumer_tasks[channel_id] = consumer_task

            # Start flush task
            flush_task = asyncio.create_task(
                self._flush_loop(channel_id)
            )
            self._flush_tasks[channel_id] = flush_task

            logger.info(
                "Started search indexing",
                extra={"channel_id": channel_id},
            )

    async def stop_indexing(self, channel_id: str) -> None:
        """Stop indexing for a channel.

        Args:
            channel_id: Channel to stop indexing
        """
        async with self._lock:
            if channel_id not in self._active_channels:
                return

            self._active_channels.discard(channel_id)

            # Final flush before stopping
            await self._flush_batch(channel_id)

            # Cancel tasks
            if channel_id in self._flush_tasks:
                self._flush_tasks[channel_id].cancel()
                try:
                    await self._flush_tasks[channel_id]
                except asyncio.CancelledError:
                    pass
                del self._flush_tasks[channel_id]

            if channel_id in self._consumer_tasks:
                self._consumer_tasks[channel_id].cancel()
                try:
                    await self._consumer_tasks[channel_id]
                except asyncio.CancelledError:
                    pass
                del self._consumer_tasks[channel_id]

            # Cleanup buffer
            if channel_id in self._batch_buffers:
                del self._batch_buffers[channel_id]

            transcript_bus = get_transcript_bus()
            await transcript_bus.unsubscribe(channel_id, f"search_{channel_id}")

            logger.info(
                "Stopped search indexing",
                extra={"channel_id": channel_id},
            )

    async def _index_loop(
        self, channel_id: str, queue: asyncio.Queue[TranscriptEvent]
    ) -> None:
        """Consume transcript events and buffer for batch indexing.

        Args:
            channel_id: Channel identifier
            queue: Queue receiving transcript events
        """
        try:
            while channel_id in self._active_channels:
                event = await queue.get()

                if event.event_type == "channel_end":
                    await self._flush_batch(channel_id)
                    logger.info(
                        "Channel ended, flushed final batch",
                        extra={"channel_id": channel_id},
                    )
                    break

                if event.event_type == "transcript" and not event.is_partial:
                    self._batch_buffers.setdefault(channel_id, []).append(event)

                    # Flush if batch size reached
                    if len(self._batch_buffers[channel_id]) >= self._config.batch_size:
                        await self._flush_batch(channel_id)

        except asyncio.CancelledError:
            logger.debug(
                "Index loop cancelled",
                extra={"channel_id": channel_id},
            )
            raise
        except Exception as e:
            logger.error(
                "Index loop error",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    async def _flush_loop(self, channel_id: str) -> None:
        """Periodically flush buffered events.

        Args:
            channel_id: Channel identifier
        """
        try:
            while channel_id in self._active_channels:
                await asyncio.sleep(self._config.flush_interval_seconds)
                await self._flush_batch(channel_id)
        except asyncio.CancelledError:
            pass

    async def _flush_batch(self, channel_id: str) -> None:
        """Flush buffered events to MongoDB.

        Args:
            channel_id: Channel identifier
        """
        events = self._batch_buffers.pop(channel_id, [])
        if not events:
            return

        docs = [
            LiveTranscriptIndex(
                channel_id=e.channel_id,
                text=e.text,
                timestamp=datetime.fromtimestamp(e.timestamp),
                source_lang=e.source_lang,
            )
            for e in events
        ]

        try:
            await LiveTranscriptIndex.insert_many(docs)
            logger.debug(
                "Flushed transcripts to search index",
                extra={
                    "channel_id": channel_id,
                    "document_count": len(docs),
                },
            )
        except Exception as e:
            logger.error(
                "Failed to flush to search index",
                extra={
                    "channel_id": channel_id,
                    "document_count": len(docs),
                    "error": str(e),
                },
            )
            # Put events back for retry
            self._batch_buffers.setdefault(channel_id, []).extend(events)

    def get_active_channels(self) -> list[str]:
        """Get list of channels with active indexing.

        Returns:
            List of channel IDs
        """
        return list(self._active_channels)

    async def search(
        self,
        channel_id: str,
        query: str,
        limit: int = 20,
    ) -> list[dict]:
        """Search transcripts for a channel.

        Args:
            channel_id: Channel to search
            query: Search query
            limit: Maximum results

        Returns:
            List of matching transcript documents
        """
        return await LiveTranscriptIndex.search(
            channel_id=channel_id,
            query=query,
            limit=limit,
        )

    async def get_recent(
        self,
        channel_id: str,
        limit: int = 50,
        minutes: int = 15,
    ) -> list[dict]:
        """Get recent transcripts for a channel.

        Args:
            channel_id: Channel identifier
            limit: Maximum results
            minutes: Time window in minutes

        Returns:
            List of recent transcript documents
        """
        return await LiveTranscriptIndex.get_recent(
            channel_id=channel_id,
            limit=limit,
            minutes=minutes,
        )

    async def cleanup(self) -> None:
        """Stop all active indexing tasks."""
        for channel_id in list(self._active_channels):
            await self.stop_indexing(channel_id)
        logger.info("Cleaned up all search indexing tasks")


def get_search_index_service() -> SearchIndexService:
    """Get or create singleton SearchIndexService instance.

    Returns:
        Search index service singleton
    """
    global _search_index_service
    if _search_index_service is None:
        _search_index_service = SearchIndexService()
    return _search_index_service
