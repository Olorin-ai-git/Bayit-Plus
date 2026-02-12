"""
V2V Scoring Helpers.

Pronunciation scoring, TTS generation, and ElevenLabs V2V voice skinning
utilities used by V2VTransformService.
"""

import json
import time
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


async def score_pronunciation(
    transcript: str, target_phrase: str,
) -> float:
    """Score pronunciation of transcript against target phrase."""
    from app.services.phonetic_mirror.pronunciation_scorer import (
        pronunciation_scorer,
    )

    result = pronunciation_scorer.score_pronunciation(
        transcript=transcript,
        target_phrase=target_phrase,
        detected_language="he",
    )
    return result.overall_score


async def generate_perfect_tts(text_he: str) -> bytes:
    """Generate perfect Hebrew pronunciation via ElevenLabs TTS."""
    from app.services.phonetic_mirror.mirror_helpers import (
        generate_corrected_audio,
    )
    from app.services.olorin.storage_service import storage_service

    gcs_path = await generate_corrected_audio(
        avatar_id="system_tts", target_phrase=text_he,
    )
    if gcs_path:
        return await storage_service.download_bytes(gcs_path)
    raise ValueError("Failed to generate TTS for target phrase")


async def apply_v2v(
    perfect_audio: bytes, voice_id: str,
) -> bytes:
    """Apply ElevenLabs V2V to skin TTS with child's voice."""
    timeout = settings.ELEVENLABS_V2V_TIMEOUT
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{settings.ELEVENLABS_API_URL}/v1/speech-to-speech/{voice_id}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
            },
            files={"audio": ("tts.wav", perfect_audio, "audio/wav")},
            data={
                "model_id": settings.ELEVENLABS_V2V_MODEL,
                "voice_settings": json.dumps({
                    "similarity_boost": settings.ELEVENLABS_V2V_SIMILARITY_BOOST,
                    "stability": settings.ELEVENLABS_V2V_STABILITY,
                }),
            },
        )
        response.raise_for_status()
        return response.content


async def upload_v2v_audio(
    avatar_id: str,
    audio_data: bytes,
    perfect_audio: bytes,
    v2v_audio: Optional[bytes],
    upload_raw: bool,
) -> tuple:
    """Upload input, TTS, and V2V audio to GCS. Returns (input, tts, v2v) paths."""
    from app.services.olorin.storage_service import storage_service

    timestamp = int(time.time())
    input_path = f"zeh-ani/v2v/{avatar_id}/{timestamp}_input.wav"
    tts_path = f"zeh-ani/v2v/{avatar_id}/{timestamp}_tts.wav"
    v2v_path = f"zeh-ani/v2v/{avatar_id}/{timestamp}_v2v.wav"

    if upload_raw:
        await storage_service.upload_bytes(
            audio_data, input_path, content_type="audio/wav",
        )
    await storage_service.upload_bytes(
        perfect_audio, tts_path, content_type="audio/wav",
    )
    if v2v_audio:
        await storage_service.upload_bytes(
            v2v_audio, v2v_path, content_type="audio/wav",
        )

    return input_path, tts_path, v2v_path
