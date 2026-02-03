"""
ElevenLabs HTTP TTS Service

Simple HTTP-based TTS using ElevenLabs REST API for batch audio generation.
Use this for VOD audio generation where streaming is not needed.
"""

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1"


class ElevenLabsHTTPTTSService:
    """
    HTTP-based TTS service using ElevenLabs REST API.

    For batch audio generation where streaming is not required.
    Returns complete audio bytes for each text input.
    """

    def __init__(self):
        """Initialize with settings."""
        self.api_key = settings.ELEVENLABS_API_KEY
        self.default_voice_id = settings.ELEVENLABS_DEFAULT_VOICE_ID

        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured in settings")

        logger.info("ElevenLabsHTTPTTSService initialized")

    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_multilingual_v2",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        output_format: str = "mp3_44100_128",
    ) -> bytes:
        """
        Generate speech audio from text using ElevenLabs API.

        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID (uses default if not specified)
            model_id: Model to use (default: eleven_multilingual_v2)
            stability: Voice stability (0-1)
            similarity_boost: Similarity boost (0-1)
            style: Style intensity (0-1)
            output_format: Audio format (default: mp3_44100_128)

        Returns:
            Audio data as bytes
        """
        voice = voice_id or self.default_voice_id
        url = f"{ELEVENLABS_API_BASE}/text-to-speech/{voice}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "use_speaker_boost": True,
            },
        }

        # Add output format to URL if not default
        if output_format != "mp3_44100_128":
            url = f"{url}?output_format={output_format}"

        logger.info(
            "Generating TTS audio",
            extra={
                "text_length": len(text),
                "voice_id": voice,
                "model_id": model_id,
            },
        )

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code != 200:
                error_text = response.text
                logger.error(
                    "ElevenLabs API error",
                    extra={
                        "status_code": response.status_code,
                        "error": error_text[:500],
                    },
                )
                raise Exception(f"ElevenLabs API error: {response.status_code} - {error_text[:200]}")

            audio_data = response.content
            logger.info(
                "TTS audio generated",
                extra={
                    "text_length": len(text),
                    "audio_size_bytes": len(audio_data),
                },
            )
            return audio_data

    async def get_voices(self) -> list:
        """Get list of available voices."""
        url = f"{ELEVENLABS_API_BASE}/voices"
        headers = {"xi-api-key": self.api_key}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)

            if response.status_code != 200:
                raise Exception(f"Failed to get voices: {response.status_code}")

            return response.json().get("voices", [])

    async def get_user_info(self) -> dict:
        """Get user subscription info including character usage."""
        url = f"{ELEVENLABS_API_BASE}/user/subscription"
        headers = {"xi-api-key": self.api_key}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)

            if response.status_code != 200:
                raise Exception(f"Failed to get user info: {response.status_code}")

            return response.json()
