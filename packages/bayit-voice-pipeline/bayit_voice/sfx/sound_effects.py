"""
ElevenLabs Sound Effects Service
Generates sound effects from text descriptions using ElevenLabs Sound Generation API.
"""

import asyncio
import logging
import time
from typing import Optional

import httpx

from bayit_voice.config import VoiceConfig

logger = logging.getLogger(__name__)

ELEVENLABS_SFX_URL = "https://api.elevenlabs.io/v1/sound-generation"

WIZARD_SFX_DESCRIPTIONS = {
    "conjuring": "magical sparkle whoosh with mystical energy swirling, fantasy wizard casting spell",
    "thinking": "gentle mystical hum with soft magical chimes, contemplative magical atmosphere",
    "clapping": "enthusiastic magical applause with fairy dust sparkles",
    "cheering": "triumphant magical fanfare with sparkles and celebration",
}

SFX_CACHE_TTL = 86400  # 24 hours


class ElevenLabsSFXService:
    """Sound Effects service with in-memory caching and configurable generation."""

    def __init__(self, config: VoiceConfig):
        """Initialize with voice configuration via dependency injection."""
        if not config.elevenlabs_api_key:
            raise ValueError("ElevenLabs API key not configured")

        self.config = config
        self._cache: dict[str, tuple[bytes, float]] = {}
        self._cache_lock = asyncio.Lock()

        logger.info("ElevenLabsSFXService initialized")

    async def generate_sfx(
        self,
        text: str,
        duration_seconds: Optional[float] = None,
        prompt_influence: float = 0.3,
    ) -> bytes:
        """
        Generate a sound effect from a text description.

        Args:
            text: Description of the desired sound effect
            duration_seconds: Optional duration (0.5-22 seconds, auto if None)
            prompt_influence: How much the text influences generation (0-1)

        Returns:
            MP3 audio bytes
        """
        cache_key = f"{text}:{duration_seconds}:{prompt_influence}"
        cached = await self._get_cached(cache_key)
        if cached:
            logger.debug(f"SFX cache hit for: {text[:50]}")
            return cached

        logger.info(f"Generating SFX: {text[:50]}...")

        payload: dict = {
            "text": text,
            "prompt_influence": prompt_influence,
        }

        if duration_seconds is not None:
            if not 0.5 <= duration_seconds <= 22:
                raise ValueError("duration_seconds must be between 0.5 and 22")
            payload["duration_seconds"] = duration_seconds

        headers = {
            "xi-api-key": self.config.elevenlabs_api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(ELEVENLABS_SFX_URL, json=payload, headers=headers)
            response.raise_for_status()

            audio_bytes = response.content
            logger.info(f"SFX generated successfully, size: {len(audio_bytes)} bytes")

            await self._set_cached(cache_key, audio_bytes)
            return audio_bytes

    async def get_wizard_sfx(self, gesture: str) -> bytes:
        """Get a pre-defined sound effect for a wizard gesture."""
        if gesture not in WIZARD_SFX_DESCRIPTIONS:
            raise ValueError(
                f"Unknown gesture: {gesture}. "
                f"Available: {list(WIZARD_SFX_DESCRIPTIONS.keys())}"
            )

        description = WIZARD_SFX_DESCRIPTIONS[gesture]

        duration_map = {
            "conjuring": 3.0,
            "thinking": 2.0,
            "clapping": 2.5,
            "cheering": 2.0,
        }

        return await self.generate_sfx(
            text=description,
            duration_seconds=duration_map.get(gesture),
            prompt_influence=0.5,
        )

    async def _get_cached(self, key: str) -> Optional[bytes]:
        """Get cached SFX if not expired."""
        async with self._cache_lock:
            if key in self._cache:
                audio_bytes, timestamp = self._cache[key]
                if time.time() - timestamp < SFX_CACHE_TTL:
                    return audio_bytes
                del self._cache[key]
            return None

    async def _set_cached(self, key: str, audio_bytes: bytes) -> None:
        """Cache SFX with timestamp."""
        async with self._cache_lock:
            self._cache[key] = (audio_bytes, time.time())

    def clear_cache(self) -> None:
        """Clear the SFX cache."""
        self._cache.clear()
        logger.info("SFX cache cleared")
