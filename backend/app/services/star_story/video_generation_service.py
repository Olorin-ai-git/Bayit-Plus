"""
Video Generation Service.

Uses Runway Gen-4 to generate video clips for each scene.
Character reference images (avatar poses) ensure visual consistency.
"""

import logging
from typing import Optional
from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.storage import StorageService
from app.models.story_episode import SceneMedia, StoryEpisode
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)

logger = logging.getLogger(__name__)


class VideoGenerationService:
    """Generates video clips via Runway Gen-4 API."""

    def __init__(self):
        self._storage = StorageService()

    async def generate_scene_videos(
        self,
        episode: StoryEpisode,
        avatar_primary_url: str,
    ) -> StoryEpisode:
        """Generate video clips for all scenes in an episode."""
        if not episode.scenes:
            raise ValueError("Episode has no scenes to generate videos for")

        job = StoryGenerationJob(
            episode_id=str(episode.id),
            user_id=episode.user_id,
            stage=StoryJobStage.VIDEO_GENERATION,
            total_items=len(episode.scenes),
        )
        await job.insert()
        await job.start_processing()

        try:
            scene_media = []
            total_cost = 0.0

            for i, scene in enumerate(episode.scenes):
                video_bytes, cost = await self._generate_clip(
                    prompt=scene.description,
                    character_ref_url=avatar_primary_url,
                    duration=scene.duration_seconds,
                )

                gcs_path = (
                    f"star-story/videos/{episode.user_id}/"
                    f"{episode.id}/scene_{scene.scene_number}_{uuid4()}.mp4"
                )
                await self._upload_video(video_bytes, gcs_path)

                scene_media.append(SceneMedia(
                    scene_number=scene.scene_number,
                    video_gcs_path=gcs_path,
                    duration_seconds=scene.duration_seconds,
                ))
                total_cost += cost
                await job.update_progress(i + 1)

            episode.scene_media = scene_media
            await episode.save()

            await job.complete(cost_usd=total_cost)

            logger.info(
                "Scene videos generated",
                extra={
                    "episode_id": str(episode.id),
                    "scenes": len(scene_media),
                    "total_cost_usd": total_cost,
                },
            )
            return episode

        except Exception as exc:
            await job.fail(str(exc))
            raise

    async def _generate_clip(
        self,
        prompt: str,
        character_ref_url: str,
        duration: float,
    ) -> tuple:
        """Call Runway Gen-4 API to generate a video clip."""
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{settings.RUNWAY_API_BASE_URL}/image_to_video",
                json={
                    "model": settings.RUNWAY_MODEL_ID,
                    "promptText": prompt,
                    "promptImage": character_ref_url,
                    "duration": int(min(duration, 10)),
                    "watermark": False,
                },
                headers={
                    "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
                    "X-Runway-Version": "2024-11-06",
                },
            )
            response.raise_for_status()
            result = response.json()

            task_id = result.get("id")
            video_url = await self._poll_task(client, task_id)

            video_response = await client.get(video_url)
            video_response.raise_for_status()

            estimated_cost = 0.25
            return video_response.content, estimated_cost

    async def _poll_task(
        self,
        client: httpx.AsyncClient,
        task_id: str,
    ) -> str:
        """Poll Runway task until completion."""
        import asyncio

        max_attempts = 120
        poll_interval = 5

        for _ in range(max_attempts):
            response = await client.get(
                f"{settings.RUNWAY_API_BASE_URL}/tasks/{task_id}",
                headers={
                    "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
                    "X-Runway-Version": "2024-11-06",
                },
            )
            response.raise_for_status()
            data = response.json()

            status = data.get("status")
            if status == "SUCCEEDED":
                output = data.get("output", [])
                if output:
                    return output[0]
                raise ValueError("Task succeeded but no output URL")

            if status == "FAILED":
                raise ValueError(
                    f"Runway task failed: {data.get('failure', 'unknown')}"
                )

            await asyncio.sleep(poll_interval)

        raise TimeoutError(f"Runway task {task_id} did not complete")

    async def _upload_video(
        self, video_bytes: bytes, gcs_path: str
    ) -> str:
        """Upload video to GCS."""
        return await self._storage.upload_file_bytes(
            video_bytes, gcs_path, "video/mp4"
        )


video_generation_service = VideoGenerationService()
