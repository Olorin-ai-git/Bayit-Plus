"""Stage management for podcast translation pipeline."""
import logging
from datetime import datetime
from typing import List, Optional

from app.models.content import PodcastEpisode, TranslationStageMetrics

from .constants import STAGE_WEIGHTS

logger = logging.getLogger(__name__)


class StageManager:
    """Manages translation pipeline stages and progress tracking."""

    async def start_stage(self, episode_id: str, stage_name: str):
        """
        Mark the start of a translation stage for timing.

        Args:
            episode_id: Episode ID
            stage_name: Stage name
        """
        now = datetime.utcnow()
        await PodcastEpisode.find_one({"_id": episode_id}).update(
            {
                "$set": {
                    f"translation_stage_timings.{stage_name}.started_at": now.isoformat()
                }
            }
        )
        logger.info(f"⏱️ Stage '{stage_name}' started")

    async def complete_stage(
        self, episode_id: str, stage_name: str, stage_data: Optional[dict] = None
    ):
        """Mark stage completion, calculate duration, update progress and ETA."""
        now = datetime.utcnow()
        episode = await PodcastEpisode.get(episode_id)
        if not episode:
            logger.error(f"Episode {episode_id} not found during stage completion")
            return

        # Calculate stage duration
        stage_timings = episode.translation_stage_timings or {}
        started_at_str = stage_timings.get(stage_name, {}).get("started_at")
        duration_seconds = (
            (now - datetime.fromisoformat(started_at_str)).total_seconds()
            if started_at_str
            else 0
        )

        # Build timing update with stage data
        timing_update = {
            f"translation_stage_timings.{stage_name}.completed_at": now.isoformat(),
            f"translation_stage_timings.{stage_name}.duration_seconds": duration_seconds,
        }
        if stage_data:
            stage_data["timestamp"] = now.isoformat()
            timing_update[f"translation_stages.{stage_name}"] = stage_data

        # Calculate progress and ETA
        completed_stages = list((episode.translation_stages or {}).keys())
        if stage_name not in completed_stages:
            completed_stages.append(stage_name)
        progress = self.calculate_progress(completed_stages)
        eta_seconds = await self.calculate_eta(episode_id, completed_stages)

        # Update database
        await PodcastEpisode.find_one({"_id": episode_id}).update(
            {
                "$set": {
                    **timing_update,
                    "translation_progress": progress,
                    "translation_eta_seconds": eta_seconds,
                    "updated_at": now,
                }
            }
        )

        # Update metrics
        if duration_seconds > 0:
            await TranslationStageMetrics.update_stage_average(stage_name, duration_seconds)

        logger.info(
            f"✅ '{stage_name}' done in {duration_seconds:.1f}s | {progress:.1f}% | ETA: {eta_seconds}s"
        )
        return progress

    def calculate_progress(self, completed_stages: List[str]) -> float:
        """
        Calculate weighted progress percentage based on completed stages.

        Args:
            completed_stages: List of completed stage names

        Returns:
            Progress percentage (0-100)
        """
        total_weight = 0.0
        for stage_name in completed_stages:
            total_weight += STAGE_WEIGHTS.get(stage_name, 0.0)

        return min(total_weight, 100.0)

    async def calculate_eta(
        self, episode_id: str, completed_stages: List[str]
    ) -> Optional[int]:
        """
        Calculate estimated time remaining based on historical averages.

        Args:
            episode_id: Episode ID
            completed_stages: List of completed stage names

        Returns:
            Estimated seconds remaining, or None if cannot calculate
        """
        # Get remaining stages
        all_stages = list(STAGE_WEIGHTS.keys())
        remaining_stages = [s for s in all_stages if s not in completed_stages]

        if not remaining_stages:
            return 0

        # Fetch historical averages for remaining stages
        total_eta_seconds = 0.0
        stages_with_data = 0

        for stage_name in remaining_stages:
            metric = await TranslationStageMetrics.find_one(
                {"stage_name": stage_name}
)
            if metric and metric.avg_duration_seconds > 0:
                total_eta_seconds += metric.avg_duration_seconds
                stages_with_data += 1

        # If we have historical data for at least some stages, return ETA
        # Otherwise return None (cannot estimate yet)
        if stages_with_data > 0:
            return int(total_eta_seconds)

        return None

    async def send_progress_webhook(
        self, episode_id: str, stage_name: str, progress: float, webhook_handler
    ):
        """Send progress webhook at threshold milestones (25%, 50%, 75%)."""
        episode = await PodcastEpisode.get(episode_id)
        if not episode:
            return

        # Check thresholds and send webhook
        for threshold in [25, 50, 75]:
            if threshold <= progress < threshold + 20:
                stage_idx = list(STAGE_WEIGHTS.keys()).index(stage_name)
                eta_seconds = await self.calculate_eta(
                    episode_id, list((episode.translation_stages or {}).keys())
                )
                await webhook_handler.send_webhook(
                    episode_id,
                    "translation.progress",
                    {
                        "episode_id": str(episode_id),
                        "podcast_id": episode.podcast_id,
                        "title": episode.title,
                        "progress": round(progress, 1),
                        "current_stage": stage_name,
                        "stage_number": stage_idx + 1,
                        "total_stages": len(STAGE_WEIGHTS),
                        "eta_seconds": eta_seconds,
                        "updated_at": datetime.utcnow().isoformat(),
                    },
                )
                break
