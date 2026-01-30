"""
Podcast Translation Worker
Background worker for automatic podcast translation processing.
"""

import asyncio
import logging
from typing import List, Optional, Set

from app.core.config import settings
from app.models.content import PodcastEpisode, PodcastEpisodeMinimal
from app.services.beta.podcast_translation_integration import BetaPodcastTranslationIntegration
from app.services.podcast_translation_service import PodcastTranslationService

logger = logging.getLogger(__name__)


class PodcastTranslationWorker:
    """Background worker for automatic podcast translation."""

    def __init__(self):
        """Initialize translation worker with queue and worker tasks."""
        self.translation_service = PodcastTranslationService()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.poll_interval = settings.PODCAST_TRANSLATION_POLL_INTERVAL  # 300 seconds
        self.max_concurrent = settings.PODCAST_TRANSLATION_MAX_CONCURRENT  # 2
        self._processing_queue: asyncio.Queue[PodcastEpisode] = asyncio.Queue()
        self._workers: List[asyncio.Task] = []
        self._processing_ids: Set[str] = set()  # Deduplication

    async def start(self) -> None:
        """Start the translation worker with queue feeder and worker tasks."""
        if self._running:
            logger.warning("Translation worker already running")
            return

        self._running = True

        # Start queue feeder task
        self._task = asyncio.create_task(self._feed_queue())

        # Start worker tasks
        for i in range(self.max_concurrent):
            worker = asyncio.create_task(self._process_worker(worker_id=i))
            self._workers.append(worker)

        logger.info(
            f"Podcast translation worker started with {self.max_concurrent} workers"
        )

    async def stop(self) -> None:
        """Stop the translation worker gracefully."""
        logger.info("Stopping podcast translation worker...")
        self._running = False

        # Cancel feeder task
        if self._task:
            self._task.cancel()

        # Cancel all worker tasks
        for worker in self._workers:
            worker.cancel()

        # Wait for all tasks to finish
        await asyncio.gather(*[self._task] + self._workers, return_exceptions=True)

        logger.info("Podcast translation worker stopped")

    async def _feed_queue(self) -> None:
        """Continuously feed untranslated episodes to the queue."""
        while self._running:
            try:
                # Find episodes that need translation (exclude max retries exceeded)
                episodes = (
                    await PodcastEpisode.find(
                        {
                            "translation_status": {"$in": ["pending", "failed"]},
                            "$or": [
                                {"retry_count": {"$exists": False}},
                                {"retry_count": {"$lt": 3}},
                            ],
                        },
                        projection_model=PodcastEpisodeMinimal,
                    )
                    .sort("-published_at")
                    .limit(10)
                    .to_list()
                )

                # Queue episodes with deduplication
                for episode in episodes:
                    episode_id = str(episode.id)
                    if episode_id not in self._processing_ids:
                        self._processing_ids.add(episode_id)
                        await self._processing_queue.put(episode)
                        logger.debug(f"Queued episode {episode_id} for translation")

                if not episodes:
                    logger.debug("No episodes to translate, sleeping...")

            except Exception as e:
                logger.error(f"Error feeding translation queue: {e}")

            await asyncio.sleep(self.poll_interval)

    async def _process_worker(self, worker_id: int) -> None:
        """
        Worker task that processes episodes from the queue.

        Args:
            worker_id: Unique identifier for this worker
        """
        logger.info(f"Translation worker {worker_id} started")

        while self._running:
            try:
                # Get next episode from queue (with timeout)
                episode = await asyncio.wait_for(
                    self._processing_queue.get(), timeout=10.0
                )

                episode_id = str(episode.id)
                logger.info(
                    f"Worker {worker_id} translating episode: {episode.title} ({episode_id})"
                )

                # Process translation
                try:
                    # Reload full episode to get requested_by_user_id
                    full_episode = await PodcastEpisode.get(episode.id)

                    # Use Beta integration if user requested translation
                    if full_episode.requested_by_user_id:
                        logger.info(
                            f"Worker {worker_id} using Beta integration for user {full_episode.requested_by_user_id}"
                        )
                        beta_service = BetaPodcastTranslationIntegration(
                            user_id=full_episode.requested_by_user_id
                        )
                        await beta_service.translate_episode(full_episode)
                    else:
                        # Fallback to standard service for legacy episodes
                        await self.translation_service.translate_episode(full_episode)

                    logger.info(
                        f"Worker {worker_id} completed episode: {episode.title}"
                    )
                except Exception as e:
                    logger.error(
                        f"Worker {worker_id} failed to translate episode {episode_id}: {e}"
                    )
                finally:
                    # Remove from processing set
                    self._processing_ids.discard(episode_id)

            except asyncio.TimeoutError:
                # No episodes in queue, continue waiting
                continue
            except asyncio.CancelledError:
                logger.info(f"Translation worker {worker_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                await asyncio.sleep(5)  # Brief pause before retrying

    async def queue_episode(self, episode_id: str) -> bool:
        """
        Manually queue a specific episode for translation.

        Args:
            episode_id: Episode ID to queue

        Returns:
            True if queued successfully, False if episode not found
        """
        episode = await PodcastEpisode.get(episode_id)
        if not episode:
            logger.warning(f"Episode {episode_id} not found for manual queueing")
            return False

        # Add to queue if not already processing
        if episode_id not in self._processing_ids:
            self._processing_ids.add(episode_id)
            await self._processing_queue.put(episode)
            logger.info(f"Manually queued episode {episode_id} for translation")
            return True

        logger.warning(f"Episode {episode_id} already queued or processing")
        return False


# Global worker instance
_translation_worker: Optional[PodcastTranslationWorker] = None


def get_translation_worker() -> Optional[PodcastTranslationWorker]:
    """Get the global translation worker instance."""
    return _translation_worker


def set_translation_worker(worker: PodcastTranslationWorker) -> None:
    """Set the global translation worker instance."""
    global _translation_worker
    _translation_worker = worker
