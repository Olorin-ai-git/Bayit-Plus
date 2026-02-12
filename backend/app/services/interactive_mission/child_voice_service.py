"""
Child Voice Service.

Clones a child's voice using ElevenLabs Voice Lab from video selfie audio.
Generates corrected Hebrew TTS: child's voice timbre + correct pronunciation.
"""

from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.services.star_story.media_processing_service import (
    media_processing_service,
)

logger = get_logger(__name__)


class ChildVoiceService:
    """Manages child voice cloning and corrected Hebrew TTS."""

    async def clone_voice_from_selfie(
        self,
        avatar: ChildAvatar,
    ) -> str:
        """
        Extract audio from video selfie and create ElevenLabs voice clone.

        Returns the ElevenLabs voice ID for the cloned voice.
        """
        if not avatar.video_selfie_gcs_path:
            raise ValueError("No video selfie available for voice cloning")

        if not avatar.consent or not avatar.consent.voice_clone_consent:
            raise ValueError("Voice clone consent not granted")

        avatar.voice_clone_status = "training"
        await avatar.save()

        try:
            audio_path = await self._extract_audio(
                avatar.video_selfie_gcs_path
            )

            voice_id = await self._create_voice_clone(
                audio_path=audio_path,
                name=f"child_{avatar.child_first_name}_{avatar.id}",
            )

            avatar.elevenlabs_voice_id = voice_id
            avatar.voice_clone_status = "ready"
            await avatar.save()

            logger.info(
                "Voice clone created",
                extra={
                    "avatar_id": str(avatar.id),
                    "voice_id": voice_id,
                },
            )
            return voice_id

        except Exception as exc:
            avatar.voice_clone_status = "failed"
            avatar.error_message = f"Voice clone failed: {exc}"
            await avatar.save()

            logger.error(
                "Voice clone failed",
                extra={
                    "avatar_id": str(avatar.id),
                    "error": str(exc),
                },
            )
            raise

    async def generate_corrected_hebrew(
        self,
        avatar: ChildAvatar,
        hebrew_text: str,
    ) -> Optional[str]:
        """
        Generate corrected Hebrew TTS using child's cloned voice.

        Child's voice timbre + correct Hebrew pronunciation.
        Returns GCS path to the generated audio.
        """
        if not avatar.has_voice_clone:
            logger.warning(
                "No voice clone available, using default narrator",
                extra={"avatar_id": str(avatar.id)},
            )
            return None

        from app.services.olorin.dubbing.voice_training import (
            voice_training_service,
        )

        audio_bytes = await voice_training_service.synthesize_speech(
            text=hebrew_text,
            voice_id=avatar.elevenlabs_voice_id,
            language="he",
        )

        from app.services.olorin.storage_service import storage_service

        output_path = (
            f"voices/{avatar.user_id}/{avatar.id}/"
            f"tts_{hash(hebrew_text) & 0xFFFFFFFF:08x}.mp3"
        )
        await storage_service.upload_bytes(
            audio_bytes, output_path, content_type="audio/mpeg"
        )

        return output_path

    async def _extract_audio(self, video_gcs_path: str) -> str:
        """Extract audio track from video selfie via FFmpeg."""
        audio_path = video_gcs_path.replace(".mp4", "_audio.mp3")
        await media_processing_service.extract_audio(
            video_gcs_path, audio_path
        )
        return audio_path

    async def _create_voice_clone(
        self, audio_path: str, name: str
    ) -> str:
        """Create a voice clone on ElevenLabs from audio sample."""
        from app.services.olorin.dubbing.voice_training import (
            voice_training_service,
        )
        from app.services.olorin.storage_service import storage_service

        audio_bytes = await storage_service.download_bytes(audio_path)

        voice_id = await voice_training_service.clone_voice(
            audio_data=audio_bytes,
            voice_name=name,
        )
        return voice_id


child_voice_service = ChildVoiceService()
