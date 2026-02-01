"""
SearchIndexService - Real-time transcript indexing for live content search.

Subscribes to the TranscriptEventBus and indexes transcripts with debounced
batch operations for efficient MongoDB writes.
"""

import asyncio
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.live_transcript_index import LiveTranscriptIndex
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)


class SearchIndexService:
    """
    Real-time transcript indexing service.

    Subscribes to transcript bus and indexes content with debounced
    batch operations to optimize MongoDB write performance.
    """

    def __init__(self):
        """Initialize the search index service."""
        self._active_indexers: dict[str, asyncio.Task] = {}
        self._batch_buffers: dict[str, list[TranscriptEvent]] = {}
        self._flush_tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._config = settings.olorin.search_index

    async def start_indexing(self, channel_id: str) -> None:
        """
        Start indexing transcripts for a channel.

        Args:
            channel_id: Channel to index transcripts for
        """
        if not self._config.enabled:
            logger.debug(
                "Search index service disabled",
                extra={"channel_id": channel_id},
            )
            return

        async with self._lock:
            if channel_id in self._active_indexers:
                logger.debug(
                    "Already indexing for channel",
                    extra={"channel_id": channel_id},
                )
                return

            transcript_bus = get_transcript_bus()
            queue = await transcript_bus.subscribe(
                channel_id=channel_id,
                consumer_id=f"search_{channel_id}",
                queue_size=self._config.queue_size,
            )

            self._batch_buffers[channel_id] = []

            index_task = asyncio.create_task(
                self._index_loop(channel_id, queue)
            )
            flush_task = asyncio.create_task(
                self._flush_loop(channel_id)
            )

            self._active_indexers[channel_id] = index_task
            self._flush_tasks[channel_id] = flush_task

            logger.info(
                "Started search indexing",
                extra={"channel_id": channel_id},
            )

    async def stop_indexing(self, channel_id: str) -> None:
        """
        Stop indexing transcripts for a channel.

        Args:
            channel_id: Channel to stop indexing for
        """
        async with self._lock:
            if channel_id not in self._active_indexers:
                return

            index_task = self._active_indexers.pop(channel_id)
            flush_task = self._flush_tasks.pop(channel_id, None)

            index_task.cancel()
            if flush_task:
                flush_task.cancel()

            try:
                await index_task
            except asyncio.CancelledError:
                pass

            if flush_task:
                try:
                    await flush_task
                except asyncio.CancelledError:
                    pass

            await self._flush_batch(channel_id)
            self._batch_buffers.pop(channel_id, None)

            transcript_bus = get_transcript_bus()
            await transcript_bus.unsubscribe(channel_id, f"search_{channel_id}")

            logger.info(
                "Stopped search indexing",
                extra={"channel_id": channel_id},
            )

    async def _index_loop(
        self, channel_id: str, queue: asyncio.Queue[TranscriptEvent]
    ) -> None:
        """
        Index transcripts from bus with batching.

        Args:
            channel_id: Channel identifier
            queue: Queue to receive events from
        """
        try:
            while True:
                event = await queue.get()

                if event.event_type == "channel_end":
                    await self._flush_batch(channel_id)
                    logger.info(
                        "Channel ended, flushed final batch",
                        extra={"channel_id": channel_id},
                    )
                    break

                if event.event_type != "transcript":
                    continue

                if event.is_partial:
                    continue

                self._batch_buffers.setdefault(channel_id, []).append(event)

                if len(self._batch_buffers[channel_id]) >= self._config.batch_size:
                    await self._flush_batch(channel_id)

        except asyncio.CancelledError:
            logger.info(
                "Index loop cancelled",
                extra={"channel_id": channel_id},
            )
        except Exception as e:
            logger.error(
                "Error in index loop",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    async def _flush_loop(self, channel_id: str) -> None:
        """
        Periodically flush batched transcripts.

        Args:
            channel_id: Channel identifier
        """
        try:
            while True:
                await asyncio.sleep(self._config.flush_interval_seconds)
                await self._flush_batch(channel_id)
        except asyncio.CancelledError:
            pass

    async def _flush_batch(self, channel_id: str) -> None:
        """
        Flush buffered transcripts to database.

        Args:
            channel_id: Channel to flush
        """
        events = self._batch_buffers.pop(channel_id, [])
        if not events:
            return

        self._batch_buffers[channel_id] = []

        docs = [
            LiveTranscriptIndex(
                channel_id=event.channel_id,
                text=event.text,
                timestamp=datetime.fromtimestamp(event.timestamp),
                source_lang=event.source_lang,
            )
            for event in events
            if not event.is_partial and event.text
        ]

        if not docs:
            return

        try:
            await LiveTranscriptIndex.insert_many(docs)
            logger.debug(
                "Flushed transcripts to index",
                extra={
                    "channel_id": channel_id,
                    "document_count": len(docs),
                },
            )
        except Exception as e:
            logger.error(
                "Error flushing to index",
                extra={"channel_id": channel_id, "error": str(e)},
            )

    async def search(
        self,
        channel_id: str,
        query: str,
        limit: int = 20,
    ) -> list[dict]:
        """
        Search transcripts in a channel.

        Args:
            channel_id: Channel to search in
            query: Text search query
            limit: Maximum results

        Returns:
            List of matching transcript segments
        """
        results = await LiveTranscriptIndex.search_channel(
            channel_id, query, limit
        )
        return [
            {
                "text": r.text,
                "timestamp": r.timestamp.isoformat(),
                "source_lang": r.source_lang,
            }
            for r in results
        ]

    async def get_recent(
        self,
        channel_id: str,
        limit: int = 50,
        minutes: int = 15,
    ) -> list[dict]:
        """
        Get recent transcripts for a channel.

        Args:
            channel_id: Channel to get transcripts for
            limit: Maximum results
            minutes: Get transcripts from last N minutes

        Returns:
            List of recent transcript segments
        """
        from datetime import timedelta

        since = datetime.utcnow() - timedelta(minutes=minutes)
        results = await LiveTranscriptIndex.get_recent(
            channel_id, limit, since
        )
        return [
            {
                "text": r.text,
                "timestamp": r.timestamp.isoformat(),
                "source_lang": r.source_lang,
            }
            for r in results
        ]

    def get_active_channels(self) -> list[str]:
        """Get list of channels currently being indexed."""
        return list(self._active_indexers.keys())


_search_index_service: SearchIndexService | None = None


def get_search_index_service() -> SearchIndexService:
    """Get the singleton SearchIndexService instance."""
    global _search_index_service
    if _search_index_service is None:
        _search_index_service = SearchIndexService()
    return _search_index_service
