"""
Background Investigation Indexing Service
Polls for new/updated investigations and indexes them automatically.
All configuration from environment variables - no hardcoded values.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from app.service.logging import get_bridge_logger
from app.service.rag.investigation_indexer import get_investigation_indexer

logger = get_bridge_logger(__name__)


class InvestigationIndexingBackgroundService:
    """Background service for automatic investigation indexing."""

    def __init__(self):
        """Initialize background indexing service."""
        self.indexer = get_investigation_indexer()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._poll_interval_seconds = 60

    async def start(self, poll_interval_seconds: int = 60) -> None:
        """Start background indexing task."""
        if self._running:
            logger.warning("Investigation indexing background service already running")
            return

        self._poll_interval_seconds = poll_interval_seconds
        self._running = True
        self._task = asyncio.create_task(self._indexing_loop())
        logger.info(
            f"Started investigation indexing background service (poll interval: {poll_interval_seconds}s)"
        )

    async def stop(self) -> None:
        """Stop background indexing task."""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped investigation indexing background service")

    async def _indexing_loop(self) -> None:
        """Main indexing loop."""
        while self._running:
            try:
                indexed_count = await self.indexer.index_new_investigations()
                if indexed_count > 0:
                    logger.info(f"Indexed {indexed_count} new/updated investigations")
            except Exception as e:
                logger.error(f"Investigation indexing error: {e}")

            await asyncio.sleep(self._poll_interval_seconds)

    def is_running(self) -> bool:
        """Check if background service is running."""
        return self._running


_global_service: Optional[InvestigationIndexingBackgroundService] = None


def get_investigation_indexing_background_service() -> (
    InvestigationIndexingBackgroundService
):
    """Get global investigation indexing background service."""
    global _global_service
    if _global_service is None:
        _global_service = InvestigationIndexingBackgroundService()
    return _global_service
