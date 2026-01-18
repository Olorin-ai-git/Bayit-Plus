"""
ElevenLabs Sound Effects Service
Generates sound effects from text descriptions using ElevenLabs Sound Generation API.

Uses the /v1/sound-generation endpoint to create custom SFX for wizard animations.
"""

import asyncio
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ElevenLabs Sound Generation API endpoint
ELEVENLABS_SFX_URL = "https://api.elevenlabs.io/v1/sound-generation"

# Pre-defined sound effect descriptions for wizard gestures
WIZARD_SFX_DESCRIPTIONS = {
    "conjuring": "magical sparkle whoosh with mystical energy swirling, fantasy wizard casting spell",
    "thinking": "gentle mystical hum with soft magical chimes, contemplative magical atmosphere",
    "clapping": "enthusiastic magical applause with fairy dust sparkles",
    "cheering": "triumphant magical fanfare with sparkles and celebration",
}

# Cache duration in seconds (24 hours - SFX don't change often)
SFX_CACHE_TTL = 86400


class ElevenLabsSFXService:
    """
    Sound Effects service using ElevenLabs Sound Generation API.

    Features:
    - Generate custom SFX from text descriptions
    - Pre-defined wizard gesture sounds
    - In-memory caching with TTL
    - Configurable duration and prompt influence
    """

    def __init__(self):
        """Initialize the ElevenLabs SFX service."""
        if not settings.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured")

        self.api_key = settings.ELEVENLABS_API_KEY
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

        Raises:
            httpx.HTTPStatusError: If API request fails
            ValueError: If parameters are invalid
        """
        # Check cache first
        cache_key = f"{text}:{duration_seconds}:{prompt_influence}"
        cached = await self._get_cached(cache_key)
        if cached:
            logger.debug(f"SFX cache hit for: {text[:50]}")
            return cached

        logger.info(f"Generating SFX: {text[:50]}...")

        # Build request payload
        payload: dict = {
            "text": text,
            "prompt_influence": prompt_influence,
        }

        if duration_seconds is not None:
            if not 0.5 <= duration_seconds <= 22:
                raise ValueError("duration_seconds must be between 0.5 and 22")
            payload["duration_seconds"] = duration_seconds

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ELEVENLABS_SFX_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

            audio_bytes = response.content
            logger.info(f"SFX generated successfully, size: {len(audio_bytes)} bytes")

            # Cache the result
            await self._set_cached(cache_key, audio_bytes)

            return audio_bytes

    async def get_wizard_sfx(self, gesture: str) -> bytes:
        """
        Get a pre-defined sound effect for a wizard gesture.

        Args:
            gesture: One of 'conjuring', 'thinking', 'clapping', 'cheering'

        Returns:
            MP3 audio bytes

        Raises:
            ValueError: If gesture is not recognized
        """
        if gesture not in WIZARD_SFX_DESCRIPTIONS:
            raise ValueError(
                f"Unknown gesture: {gesture}. "
                f"Available: {list(WIZARD_SFX_DESCRIPTIONS.keys())}"
            )

        description = WIZARD_SFX_DESCRIPTIONS[gesture]

        # Use appropriate duration for each gesture
        duration_map = {
            "conjuring": 3.0,  # Looping animation, moderate length
            "thinking": 2.0,   # Ambient thinking sound
            "clapping": 2.5,   # Applause sound
            "cheering": 2.0,   # Celebration sound
        }

        return await self.generate_sfx(
            text=description,
            duration_seconds=duration_map.get(gesture),
            prompt_influence=0.5,  # Higher influence for more accurate results
        )

    async def _get_cached(self, key: str) -> Optional[bytes]:
        """Get cached SFX if not expired."""
        async with self._cache_lock:
            if key in self._cache:
                audio_bytes, timestamp = self._cache[key]
                import time
                if time.time() - timestamp < SFX_CACHE_TTL:
                    return audio_bytes
                # Expired, remove from cache
                del self._cache[key]
            return None

    async def _set_cached(self, key: str, audio_bytes: bytes) -> None:
        """Cache SFX with timestamp."""
        async with self._cache_lock:
            import time
            self._cache[key] = (audio_bytes, time.time())

    def clear_cache(self) -> None:
        """Clear the SFX cache."""
        self._cache.clear()
        logger.info("SFX cache cleared")


# Singleton instance
_sfx_service: Optional[ElevenLabsSFXService] = None


def get_sfx_service() -> ElevenLabsSFXService:
    """Get or create the singleton SFX service instance."""
    global _sfx_service
    if _sfx_service is None:
        _sfx_service = ElevenLabsSFXService()
    return _sfx_service
