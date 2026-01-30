"""
Background worker that feeds STT transcript segments into ChannelTranscriptService.

This service monitors active channels (channels with viewers) and maintains
transcript feed tasks for them. It serves as the integration point between
the live streaming STT pipeline and the transcript buffer system.
"""

import asyncio
from datetime import datetime
from typing import Dict, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.transcript_service import (
    ChannelTranscriptService,
    TranscriptSegment,
    get_transcript_service,
)

logger = get_logger(__name__)


class TranscriptFeeder:
    """
    Background worker that feeds STT transcript segments into ChannelTranscriptService.

    This service:
    - Monitors which channels have active viewers
    - Maintains feed tasks for active channels
    - Provides public API for STT pipeline to add transcript segments
    - Automatically cleans up inactive channel buffers
    """

    def __init__(
        self,
        transcript_service: Optional[ChannelTranscriptService] = None,
    ):
        """
        Initialize transcript feeder.

        Args:
            transcript_service: Transcript service instance (uses singleton if None)
        """
        self._transcript_service = transcript_service or get_transcript_service()
        self._active_feeds: Dict[str, asyncio.Task] = {}
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._monitor_interval_seconds = 60

        logger.info(
            "TranscriptFeeder initialized",
            extra={
                "monitor_interval_seconds": self._monitor_interval_seconds,
            },
        )

    async def start(self) -> None:
        """
        Start the transcript feeder background worker.

        Begins monitoring for active channels and managing feed tasks.
        """
        if self._running:
            logger.warning("TranscriptFeeder already running")
            return

        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_active_channels())

        logger.info("TranscriptFeeder started")

    async def stop(self) -> None:
        """
        Stop the transcript feeder background worker.

        Cancels all active feed tasks and stops monitoring.
        """
        if not self._running:
            logger.warning("TranscriptFeeder not running")
            return

        self._running = False

        # Cancel monitor task
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
            logger.debug("Monitor task cancelled")

        # Cancel all active feed tasks
        feed_tasks = list(self._active_feeds.values())
        for task in feed_tasks:
            task.cancel()

        if feed_tasks:
            await asyncio.gather(*feed_tasks, return_exceptions=True)
            logger.info(
                "All feed tasks cancelled",
                extra={"cancelled_count": len(feed_tasks)},
            )

        self._active_feeds.clear()

        logger.info("TranscriptFeeder stopped")

    async def _monitor_active_channels(self) -> None:
        """
        Monitor active channels and manage feed tasks.

        Periodically checks which channels have active viewers and:
        - Starts feed tasks for new active channels
        - Stops feed tasks for channels that lost all viewers
        - Cleans up inactive transcript buffers
        """
        logger.info("Active channel monitor started")

        try:
            while self._running:
                try:
                    # Detect active channels (channels with viewers)
                    active_channel_ids = await self._detect_active_channels()

                    # Start feed tasks for new active channels
                    for channel_id in active_channel_ids:
                        if channel_id not in self._active_feeds:
                            await self._start_feed(channel_id)

                    # Stop feed tasks for inactive channels
                    await self._cleanup_feeds(active_channel_ids)

                    # Clean up transcript buffers for inactive channels
                    await self._transcript_service.cleanup_inactive_channels(
                        active_channel_ids
                    )

                    logger.debug(
                        "Active channel monitor cycle completed",
                        extra={
                            "active_channels": len(active_channel_ids),
                            "active_feeds": len(self._active_feeds),
                        },
                    )

                except Exception as e:
                    logger.error(
                        "Error in active channel monitor cycle",
                        extra={"error": str(e)},
                        exc_info=True,
                    )

                # Wait before next monitoring cycle
                await asyncio.sleep(self._monitor_interval_seconds)

        except asyncio.CancelledError:
            logger.info("Active channel monitor cancelled")
            raise
        except Exception as e:
            logger.error(
                "Fatal error in active channel monitor",
                extra={"error": str(e)},
                exc_info=True,
            )
            raise

    async def _detect_active_channels(self) -> set:
        """
        Detect channels that currently have active viewers.

        This integrates with the live streaming system to determine which
        channels need transcript buffering. In a full implementation, this
        would query websocket connections, active sessions, or viewer metrics.

        For now, this returns an empty set as a safe default. The actual
        integration should be implemented based on the specific viewer
        tracking mechanism (e.g., ConnectionManager, LiveFeatureQuotaService).

        Returns:
            Set of active channel IDs
        """
        # Integration point: Query active viewers/sessions
        # Examples:
        # - Query ConnectionManager for channels with active websocket connections
        # - Query LiveFeatureQuotaService for channels with active sessions
        # - Query viewer metrics service for channels with viewers
        #
        # For production:
        # from app.services.connection_manager import connection_manager
        # active_channels = set()
        # for party_id in connection_manager._party_connections:
        #     if party_id.startswith("channel:"):
        #         channel_id = party_id.replace("channel:", "")
        #         active_channels.add(channel_id)
        # return active_channels

        # Safe default: no active channels
        # This prevents unnecessary transcript buffering when no viewers present
        active_channels = set()

        logger.debug(
            "Detected active channels",
            extra={"count": len(active_channels)},
        )

        return active_channels

    async def _start_feed(self, channel_id: str) -> None:
        """
        Start a feed task for a channel.

        Args:
            channel_id: Channel identifier
        """
        if channel_id in self._active_feeds:
            logger.warning(
                "Feed task already exists for channel",
                extra={"channel_id": channel_id},
            )
            return

        task = asyncio.create_task(self._feed_channel(channel_id))
        self._active_feeds[channel_id] = task

        logger.info(
            "Started feed task for channel",
            extra={"channel_id": channel_id},
        )

    async def _feed_channel(self, channel_id: str) -> None:
        """
        Maintain feed task lifecycle for a channel.

        This is the integration point for the live stream STT pipeline.
        The actual STT data flows through the add_transcript_segment() public method.

        This task maintains the feed lifecycle and handles graceful shutdown
        when the channel becomes inactive.

        Args:
            channel_id: Channel identifier
        """
        logger.info(
            "Feed task started for channel",
            extra={"channel_id": channel_id},
        )

        try:
            # The feed task runs as long as the channel is active
            # STT segments are added via add_transcript_segment() from external pipeline
            #
            # This loop maintains the task lifecycle and yields control
            # to allow proper async coordination
            while self._running and channel_id in self._active_feeds:
                # Yield control to event loop
                # Actual transcript segments arrive via add_transcript_segment()
                await asyncio.sleep(1)

        except asyncio.CancelledError:
            logger.info(
                "Feed task cancelled for channel",
                extra={"channel_id": channel_id},
            )
            raise
        except Exception as e:
            logger.error(
                "Error in feed task",
                extra={"channel_id": channel_id, "error": str(e)},
                exc_info=True,
            )
        finally:
            logger.info(
                "Feed task stopped for channel",
                extra={"channel_id": channel_id},
            )

    async def add_transcript_segment(
        self, channel_id: str, text: str, language: str
    ) -> None:
        """
        Add a transcript segment to the channel buffer.

        This is the public API called by the STT pipeline to feed transcript
        segments into the system. Segments are stored in the transcript buffer
        for catch-up and replay functionality.

        Args:
            channel_id: Channel identifier
            text: Transcript text content
            language: Language code (e.g., "en", "he", "es")
        """
        segment = TranscriptSegment(
            text=text,
            timestamp=datetime.utcnow(),
            language=language,
        )

        await self._transcript_service.add_transcript(channel_id, segment)

        logger.debug(
            "Added transcript segment",
            extra={
                "channel_id": channel_id,
                "text_length": len(text),
                "language": language,
                "timestamp": segment.timestamp.isoformat(),
            },
        )

    async def _cleanup_feeds(self, active_channel_ids: set) -> None:
        """
        Cancel feed tasks for channels not in active set.

        Args:
            active_channel_ids: Set of currently active channel IDs
        """
        inactive_channel_ids = set(self._active_feeds.keys()) - active_channel_ids

        for channel_id in inactive_channel_ids:
            task = self._active_feeds.pop(channel_id, None)
            if task:
                task.cancel()
                logger.info(
                    "Cancelled feed task for inactive channel",
                    extra={"channel_id": channel_id},
                )

        if inactive_channel_ids:
            # Wait for cancelled tasks to complete
            tasks = [
                self._active_feeds.get(cid)
                for cid in inactive_channel_ids
                if cid in self._active_feeds
            ]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

            logger.info(
                "Cleaned up inactive feed tasks",
                extra={
                    "cleaned_count": len(inactive_channel_ids),
                    "remaining_count": len(self._active_feeds),
                },
            )

    def get_active_feed_count(self) -> int:
        """
        Get number of currently active feed tasks.

        Returns:
            Count of active feed tasks
        """
        return len(self._active_feeds)

    def is_running(self) -> bool:
        """
        Check if the feeder is running.

        Returns:
            True if running, False otherwise
        """
        return self._running


# Module-level singleton
_transcript_feeder: Optional[TranscriptFeeder] = None


async def get_transcript_feeder() -> TranscriptFeeder:
    """
    Get singleton transcript feeder instance.

    Returns:
        Transcript feeder singleton
    """
    global _transcript_feeder
    if _transcript_feeder is None:
        _transcript_feeder = TranscriptFeeder()
    return _transcript_feeder


async def shutdown_transcript_feeder() -> None:
    """
    Shutdown the global transcript feeder instance.

    Stops all feed tasks and clears the singleton.
    """
    global _transcript_feeder
    if _transcript_feeder:
        await _transcript_feeder.stop()
        _transcript_feeder = None
        logger.info("Global transcript feeder shutdown completed")
