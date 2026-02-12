"""
Voice Note Service.

Processes grandparent voice notes: validates duration, encrypts audio,
uploads to GCS, and transcribes via Whisper with language detection.
"""

import base64
from io import BytesIO

from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.grandparent_bridge import (
    GrandparentVoiceNote,
    NewsClip,
    NewsClipStatus,
)

logger = get_logger(__name__)


class VoiceNoteService:
    """Processes and stores encrypted grandparent voice notes."""

    def _get_fernet(self) -> Fernet:
        """Derive Fernet encryption key from application secret."""
        key_bytes = settings.SECRET_KEY[:32].encode().ljust(32, b"=")
        fernet_key = base64.urlsafe_b64encode(key_bytes[:32])
        return Fernet(fernet_key)

    async def process_voice_note(
        self,
        audio_data: bytes,
        news_clip_id: str,
        user_id: str,
        profile_id: str,
    ) -> GrandparentVoiceNote:
        """
        Process an incoming grandparent voice note.

        Pipeline:
        1. Validate audio duration against configured maximum
        2. Encrypt audio data with Fernet (derived from app secret)
        3. Upload encrypted blob to GCS
        4. Transcribe original audio via Whisper
        5. Persist voice note document
        """
        clip = await NewsClip.get(news_clip_id)
        if not clip or clip.status != NewsClipStatus.READY:
            raise ValueError("News clip not found or not ready")

        estimated_duration = len(audio_data) / 32000.0
        max_duration = float(settings.GRANDPARENT_VOICE_NOTE_MAX_SECONDS)
        if estimated_duration > max_duration:
            raise ValueError(
                f"Voice note exceeds maximum duration of "
                f"{settings.GRANDPARENT_VOICE_NOTE_MAX_SECONDS}s"
            )

        fernet = self._get_fernet()
        encrypted_data = fernet.encrypt(audio_data)

        from app.services.olorin.storage_service import storage_service

        gcs_path = (
            f"grandparent_bridge/{user_id}/{news_clip_id}/"
            f"voice_note_{clip.id}.enc"
        )
        await storage_service.upload_bytes(
            encrypted_data,
            gcs_path,
            content_type="application/octet-stream",
        )

        transcript, detected_language = await self._transcribe_audio(
            audio_data
        )

        voice_note = GrandparentVoiceNote(
            user_id=user_id,
            profile_id=profile_id,
            news_clip_id=news_clip_id,
            encrypted_audio_gcs_path=gcs_path,
            duration=estimated_duration,
            transcript=transcript,
            detected_language=detected_language,
        )
        await voice_note.insert()

        logger.info(
            "Voice note processed",
            extra={
                "voice_note_id": str(voice_note.id),
                "news_clip_id": news_clip_id,
                "duration": estimated_duration,
                "detected_language": detected_language,
            },
        )

        return voice_note

    async def _transcribe_audio(
        self, audio_data: bytes
    ) -> tuple:
        """Transcribe audio via Whisper and detect language."""
        from app.services.whisper_transcription_service import (
            WhisperTranscriptionService,
        )

        whisper_service = WhisperTranscriptionService()

        audio_file = BytesIO(audio_data)
        audio_file.name = "voice_note.webm"

        transcript = await whisper_service.transcribe_audio_chunk(
            audio_chunk=audio_data,
            language=None,
        )

        detected_language = getattr(
            transcript, "detected_language", None
        )
        text = getattr(transcript, "text", str(transcript))

        return text, detected_language


voice_note_service = VoiceNoteService()
