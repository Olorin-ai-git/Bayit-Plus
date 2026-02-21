"""
User Avatar Animator Service

Animates the user's child avatar speaking their polished question
using ElevenLabs TTS with the user's cloned voice and Aurora lip-sync.
Used in the Pause & Ask pipeline.
"""

import hashlib

import httpx

from app.core.config import settings
from app.core.fal_aurora_client import fal_aurora_client
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.models.child_avatar import ChildAvatar
from app.models.vod_interaction import AnimatedResponse
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)

logger = get_logger(__name__)


class UserAvatarAnimator:
    """Animates user's avatar with their cloned voice and lip-sync."""

    def __init__(self) -> None:
        self.elevenlabs_api_key = settings.ELEVENLABS_API_KEY
        self.elevenlabs_api_url = (
            settings.ELEVENLABS_API_URL or "https://api.elevenlabs.io"
        ).rstrip("/")

    async def animate_user_avatar(
        self,
        polished_text: str,
        avatar: ChildAvatar,
    ) -> AnimatedResponse:
        """
        Generate animated user avatar video speaking the polished text.

        Args:
            polished_text: Grammar-polished question text
            avatar: ChildAvatar with elevenlabs_voice_id and face image

        Returns:
            AnimatedResponse with audio_url, video_url, duration

        Raises:
            ValueError: If avatar lacks voice clone or face image
        """
        if not avatar.elevenlabs_voice_id:
            raise ValueError("Avatar has no cloned voice ID")

        face_image_url = self._get_face_image_url(avatar)
        if not face_image_url:
            raise ValueError("Avatar has no face image for lip-sync")

        logger.info(
            "Animating user avatar",
            extra={
                "avatar_id": str(avatar.id),
                "text_length": len(polished_text),
            },
        )

        audio_url = await self._generate_user_tts(
            polished_text, avatar.elevenlabs_voice_id, str(avatar.id),
        )
        duration = await character_animator_service._get_audio_duration(
            audio_url,
        )

        public_audio = await character_animator_service._ensure_public_url(
            audio_url,
        )
        public_image = await character_animator_service._ensure_public_url(
            face_image_url,
        )

        fal_video_url = await fal_aurora_client.create_lipsync(
            image_url=public_image,
            audio_url=public_audio,
        )

        video_url = await self._persist_lipsync_video(
            fal_video_url, str(avatar.id), polished_text,
        )

        logger.info(
            "User avatar animation completed",
            extra={
                "avatar_id": str(avatar.id),
                "duration": duration,
                "video_url": video_url,
            },
        )

        return AnimatedResponse(
            audio_url=audio_url,
            video_url=video_url,
            duration=duration,
        )

    async def _persist_lipsync_video(
        self, fal_url: str, avatar_id: str, text: str,
    ) -> str:
        """Download fal.ai video and upload to GCS for durable storage."""
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        gcs_path = (
            f"vod-interactions/user-avatar-lipsync/"
            f"{avatar_id}_{text_hash}.mp4"
        )
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            response = await client.get(fal_url)
            response.raise_for_status()
        return await storage_service.upload_bytes(
            response.content, gcs_path, content_type="video/mp4",
        )

    def _get_face_image_url(self, avatar: ChildAvatar) -> str:
        """Get the best face image URL for lip-sync from the avatar."""
        if avatar.creatify_avatar_image_url:
            return avatar.creatify_avatar_image_url
        if avatar.primary_avatar_gcs_path:
            return avatar.primary_avatar_gcs_path
        return ""

    async def _generate_user_tts(
        self, text: str, voice_id: str, avatar_id: str,
    ) -> str:
        """Generate speech audio using ElevenLabs TTS with user's cloned voice."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            response = await client.post(
                f"{self.elevenlabs_api_url}/v1/text-to-speech/{voice_id}",
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
                headers={
                    "xi-api-key": self.elevenlabs_api_key,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

            text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
            gcs_path = (
                f"vod-interactions/user-avatar-audio/"
                f"{avatar_id}_{text_hash}.mp3"
            )

            audio_url = await storage_service.upload_bytes(
                response.content, gcs_path, content_type="audio/mpeg",
            )
            logger.info(
                "User avatar TTS generated",
                extra={"avatar_id": avatar_id, "audio_url": audio_url},
            )
            return audio_url


user_avatar_animator = UserAvatarAnimator()
