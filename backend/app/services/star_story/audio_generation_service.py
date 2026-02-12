"""
Audio Generation Service.

Generates narration audio for each scene using the existing ElevenLabs HTTP TTS service.
"""

import logging
from uuid import uuid4

from app.core.config import settings
from app.core.storage import StorageService
from app.models.story_episode import StoryEpisode
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)
from app.services.elevenlabs_http_tts_service import ElevenLabsHTTPTTSService

logger = logging.getLogger(__name__)


class AudioGenerationService:
    """Generates narration audio via ElevenLabs TTS."""

    def __init__(self):
        self._storage = StorageService()
        self._tts: ElevenLabsHTTPTTSService = None

    def _get_tts(self) -> ElevenLabsHTTPTTSService:
        """Lazy-load TTS service."""
        if self._tts is None:
            self._tts = ElevenLabsHTTPTTSService()
        return self._tts

    async def generate_scene_audio(
        self,
        episode: StoryEpisode,
    ) -> StoryEpisode:
        """Generate narration audio for all scenes."""
        if not episode.scenes:
            raise ValueError("Episode has no scenes for audio generation")

        job = StoryGenerationJob(
            episode_id=str(episode.id),
            user_id=episode.user_id,
            stage=StoryJobStage.AUDIO_GENERATION,
            total_items=len(episode.scenes),
        )
        await job.insert()
        await job.start_processing()

        try:
            tts = self._get_tts()

            for i, scene in enumerate(episode.scenes):
                audio_bytes = await tts.text_to_speech(
                    text=scene.narration,
                    voice_id=settings.STAR_STORY_NARRATOR_VOICE_ID,
                    model_id=settings.ELEVENLABS_MODEL,
                    stability=settings.ELEVENLABS_STABILITY,
                    similarity_boost=settings.ELEVENLABS_SIMILARITY_BOOST,
                    style=settings.ELEVENLABS_STYLE,
                )

                gcs_path = (
                    f"star-story/audio/{episode.user_id}/"
                    f"{episode.id}/scene_{scene.scene_number}_{uuid4()}.mp3"
                )
                await self._upload_audio(audio_bytes, gcs_path)

                for media in episode.scene_media:
                    if media.scene_number == scene.scene_number:
                        media.audio_gcs_path = gcs_path
                        break

                await job.update_progress(i + 1)

            await episode.save()
            await job.complete()

            logger.info(
                "Scene audio generated",
                extra={
                    "episode_id": str(episode.id),
                    "scenes": len(episode.scenes),
                },
            )
            return episode

        except Exception as exc:
            await job.fail(str(exc))
            raise

    async def _upload_audio(
        self, audio_bytes: bytes, gcs_path: str
    ) -> str:
        """Upload audio to GCS."""
        return await self._storage.upload_file_bytes(
            audio_bytes, gcs_path, "audio/mpeg"
        )


audio_generation_service = AudioGenerationService()
