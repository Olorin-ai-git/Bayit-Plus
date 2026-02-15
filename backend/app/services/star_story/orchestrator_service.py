"""
Star in Story Orchestrator.

Coordinates the full episode generation pipeline:
credit check -> script -> video -> audio -> assembly -> safety -> deliver.
"""

import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency
from app.models.story_episode import EpisodeStatus, StoryEpisode
from app.services.proficiency.assessment_service import assessment_service
from app.services.star_story.audio_generation_service import audio_generation_service
from app.services.star_story.content_safety_service import content_safety_service
from app.services.star_story.episode_assembly_service import episode_assembly_service
from app.services.star_story.script_generation_service import script_generation_service
from app.services.star_story.video_generation_service import video_generation_service

logger = logging.getLogger(__name__)


class StarStoryOrchestrator:
    """Orchestrates the full Star in Story generation pipeline."""

    async def generate_episode(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        theme: str,
        target_vocabulary: list,
    ) -> StoryEpisode:
        """
        Run the full episode generation pipeline.

        Stages: script -> video -> audio -> assembly -> safety.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or not avatar.is_ready:
            raise ValueError("Avatar not ready for episode generation")

        if avatar.user_id != user_id:
            raise ValueError("Avatar does not belong to this user")

        await self._check_daily_limit(user_id)

        proficiency = await assessment_service.get_or_create_proficiency(
            user_id, profile_id
        )

        existing_count = await StoryEpisode.find(
            {"user_id": user_id, "profile_id": profile_id}
).count()

        episode = StoryEpisode(
            user_id=user_id,
            profile_id=profile_id,
            avatar_id=avatar_id,
            episode_number=existing_count + 1,
            theme=theme,
            target_vocabulary=target_vocabulary,
            status=EpisodeStatus.PENDING,
            credits_charged=settings.CREDIT_RATE_STAR_STORY_EPISODE,
        )
        await episode.insert()

        try:
            episode.status = EpisodeStatus.SCRIPT_GENERATING
            episode.current_stage = "script"
            episode.progress_percent = 10
            await episode.save()

            await script_generation_service.generate_script(
                episode=episode,
                child_name=avatar.child_first_name,
                proficiency=proficiency,
            )

            episode.status = EpisodeStatus.VIDEO_GENERATING
            episode.current_stage = "video"
            episode.progress_percent = 25
            await episode.save()

            await video_generation_service.generate_scene_videos(
                episode=episode,
                avatar_primary_url=avatar.primary_avatar_gcs_path,
            )

            episode.status = EpisodeStatus.AUDIO_GENERATING
            episode.current_stage = "audio"
            episode.progress_percent = 60
            await episode.save()

            await audio_generation_service.generate_scene_audio(
                episode=episode,
            )

            episode.status = EpisodeStatus.ASSEMBLING
            episode.current_stage = "assembly"
            episode.progress_percent = 75
            await episode.save()

            await episode_assembly_service.assemble_episode(
                episode=episode,
            )

            episode.status = EpisodeStatus.SAFETY_REVIEW
            episode.current_stage = "safety"
            episode.progress_percent = 90
            await episode.save()

            safety = await content_safety_service.evaluate_episode(
                episode=episode,
            )

            if content_safety_service.passes_threshold(safety):
                episode.status = EpisodeStatus.READY
                episode.progress_percent = 100
            else:
                episode.status = EpisodeStatus.REJECTED
                episode.error_message = (
                    f"Safety score {safety.overall_safety:.2f} "
                    f"below threshold {settings.STAR_STORY_SAFETY_THRESHOLD}"
                )

            episode.completed_at = datetime.now(timezone.utc)
            episode.current_stage = None
            await episode.save()

            logger.info(
                "Episode generation complete",
                extra={
                    "episode_id": str(episode.id),
                    "status": episode.status.value,
                    "safety_score": safety.overall_safety,
                },
            )
            return episode

        except Exception as exc:
            episode.status = EpisodeStatus.FAILED
            episode.error_message = str(exc)
            episode.completed_at = datetime.now(timezone.utc)
            await episode.save()

            logger.error(
                "Episode generation failed",
                extra={
                    "episode_id": str(episode.id),
                    "error": str(exc),
                },
            )
            raise

    async def _check_daily_limit(self, user_id: str) -> None:
        """Verify user hasn't exceeded daily episode generation limit."""
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_count = await StoryEpisode.find(
            {"user_id": user_id}, 
            StoryEpisode.created_at >= today_start, 
        ).count()

        if today_count >= settings.STAR_STORY_MAX_EPISODES_PER_DAY:
            raise ValueError(
                f"Daily limit of {settings.STAR_STORY_MAX_EPISODES_PER_DAY} "
                f"episodes reached"
            )

    async def get_episode_progress(
        self, episode_id: str, user_id: str = "",
    ) -> dict:
        """Get current generation progress for an episode."""
        episode = await StoryEpisode.get(episode_id)
        if not episode:
            raise ValueError(f"Episode not found: {episode_id}")
        if user_id and episode.user_id != user_id:
            raise ValueError(f"Episode not found: {episode_id}")

        return {
            "episode_id": str(episode.id),
            "status": episode.status.value,
            "current_stage": episode.current_stage,
            "progress_percent": episode.progress_percent,
            "error_message": episode.error_message,
        }


star_story_orchestrator = StarStoryOrchestrator()
