"""SCORM media generator — TTS audio and lip-sync video."""

from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_service
from app.services.vod_interaction.character_animator import (
    character_animator_service,
)

logger = get_logger(__name__)


async def _call_elevenlabs_tts(
    text: str, voice_id: str
) -> Optional[bytes]:
    """Call ElevenLabs TTS API and return audio bytes."""
    elevenlabs_url = (
        settings.ELEVENLABS_API_URL or "https://api.elevenlabs.io"
    ).rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=60.0) as http:
            resp = await http.post(
                f"{elevenlabs_url}/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            )
            if resp.status_code == 200:
                return resp.content
            logger.warning(
                "ElevenLabs TTS failed",
                extra={
                    "voice_id": voice_id,
                    "status": resp.status_code,
                },
            )
    except Exception:
        logger.exception(
            "ElevenLabs TTS error", extra={"voice_id": voice_id}
        )
    return None


async def generate_tts_audio(
    text: str,
    voice_id: str,
    export_id: str,
    filename: str,
) -> Optional[str]:
    """
    Generate TTS audio for a character response.

    Returns GCS URL of uploaded audio, or None on failure.
    """
    audio_bytes = await _call_elevenlabs_tts(text, voice_id)
    if not audio_bytes:
        return None

    gcs_path = (
        f"{settings.SCORM_EXPORT_GCS_PREFIX}/{export_id}/audio/{filename}"
    )
    gcs_url = await storage_service.upload_bytes(
        audio_bytes, gcs_path, "audio/mpeg"
    )
    logger.info(
        "SCORM TTS audio generated",
        extra={"export_id": export_id, "filename": filename},
    )
    return gcs_url


async def generate_lipsync_video(
    text: str,
    voice_id: str,
    face_url: str,
    export_id: str,
    filename: str,
) -> Optional[str]:
    """
    Generate lip-sync video for a character response.

    Uses the existing character animator service (Aurora/Creatify).
    Returns GCS URL of video, or None on failure.
    """
    if not face_url:
        logger.info(
            "No face URL for lip-sync, skipping",
            extra={"export_id": export_id, "filename": filename},
        )
        return None

    try:
        result = await character_animator_service.animate_character_response(
            character_name=filename.replace(".mp4", ""),
            dialogue_text=text,
            voice_id=voice_id,
            image_url=face_url,
        )
        if result and result.video_url:
            logger.info(
                "SCORM lip-sync video generated",
                extra={
                    "export_id": export_id,
                    "filename": filename,
                },
            )
            return result.video_url
    except Exception:
        logger.exception(
            "Lip-sync generation failed",
            extra={"export_id": export_id, "filename": filename},
        )
    return None
