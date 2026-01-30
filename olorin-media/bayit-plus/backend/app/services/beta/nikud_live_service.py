"""
Live Nikud (Vocalization) Service

Real-time nikud pipeline for live Hebrew subtitles.
Wraps existing nikud_service.add_nikud() with Redis caching and structured logging.
Pipeline: Audio -> STT (ElevenLabs Scribe v2) -> add nikud via Claude -> emit vocalized cue.
"""

import hashlib
import time
from dataclasses import dataclass, field
from typing import Optional

import anthropic

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class NikudSubtitleCue:
    """A single nikud subtitle cue for real-time display."""

    text: str
    text_nikud: str
    timestamp: float
    display_duration_ms: int

    def to_dict(self) -> dict:
        """Serialize for WebSocket transmission."""
        return {
            "type": "nikud_subtitle",
            "data": {
                "text": self.text,
                "text_nikud": self.text_nikud,
                "timestamp": self.timestamp,
                "display_duration_ms": self.display_duration_ms,
            },
        }


class NikudLiveService:
    """
    Real-time nikud service for live Hebrew subtitles.

    Wraps existing nikud_service.add_nikud() with:
    - Redis caching layer (configurable TTL)
    - Structured logging (no print statements)
    - Configurable Claude model from LiveNikudConfig
    - Real-time cue emission for WebSocket transport
    """

    def __init__(self, redis_client=None):
        """
        Constructor injection for external dependencies.

        Args:
            redis_client: Optional Redis client for caching.
                          Falls back to in-memory cache if not provided.
        """
        self._redis = redis_client
        self._session_id: Optional[str] = None
        self._running = False
        self._config = settings.olorin.live_nikud
        self._in_memory_cache: dict[str, str] = {}
        self._cache_max_size = 10000

    @property
    def session_id(self) -> Optional[str]:
        """Get the session ID."""
        return self._session_id

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    async def start(self, session_id: str) -> None:
        """Start the nikud live service session."""
        self._session_id = session_id
        self._running = True
        logger.info(
            "NikudLiveService started",
            extra={"session_id": session_id},
        )

    async def stop(self) -> dict:
        """Stop the nikud live service session."""
        self._running = False
        session_id = self._session_id
        self._session_id = None
        logger.info(
            "NikudLiveService stopped",
            extra={"session_id": session_id},
        )
        return {"session_id": session_id, "status": "stopped"}

    async def add_nikud_realtime(self, hebrew_text: str) -> Optional[NikudSubtitleCue]:
        """
        Add nikud to Hebrew text for real-time subtitle display.

        Pipeline:
        1. Check Redis cache (if available) or in-memory cache
        2. If miss, call Claude API for nikud vocalization
        3. Cache result
        4. Return NikudSubtitleCue

        Args:
            hebrew_text: Raw Hebrew text from STT pipeline.

        Returns:
            NikudSubtitleCue or None if text is empty/invalid.
        """
        if not hebrew_text or not hebrew_text.strip():
            return None

        text = hebrew_text.strip()
        cache_key = self._get_cache_key(text)

        # Check cache
        cached_nikud = await self._get_cached(cache_key)
        if cached_nikud:
            logger.debug(
                "Nikud cache hit",
                extra={"session_id": self._session_id, "cache_key": cache_key[:8]},
            )
            return NikudSubtitleCue(
                text=text,
                text_nikud=cached_nikud,
                timestamp=time.time(),
                display_duration_ms=self._config.display_duration_ms,
            )

        # Cache miss - call Claude for nikud
        nikud_text = await self._vocalize_with_claude(text)
        if not nikud_text:
            return None

        # Cache result
        await self._set_cached(cache_key, nikud_text)

        return NikudSubtitleCue(
            text=text,
            text_nikud=nikud_text,
            timestamp=time.time(),
            display_duration_ms=self._config.display_duration_ms,
        )

    async def _vocalize_with_claude(self, text: str) -> Optional[str]:
        """
        Add nikud marks using Claude AI.

        Uses configurable model from LiveNikudConfig (not hardcoded).
        """
        prompt = (
            "הוסף ניקוד (תנועות) לטקסט העברי הבא. "
            "החזר רק את הטקסט עם הניקוד, ללא הסברים נוספים.\n\n"
            f"טקסט: {text}\n\n"
            "טקסט עם ניקוד:"
        )

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            response = await client.messages.create(
                model=self._config.claude_model,
                max_tokens=self._config.claude_max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )

            nikud_text = response.content[0].text.strip()

            logger.debug(
                "Nikud vocalization completed",
                extra={
                    "session_id": self._session_id,
                    "input_len": len(text),
                    "output_len": len(nikud_text),
                },
            )

            return nikud_text

        except Exception as e:
            logger.error(
                "Claude nikud vocalization failed",
                extra={
                    "session_id": self._session_id,
                    "error": str(e),
                    "text_len": len(text),
                },
            )
            return None

    def _get_cache_key(self, text: str) -> str:
        """Generate deterministic cache key for text."""
        return f"nikud:{hashlib.md5(text.encode()).hexdigest()}"

    async def _get_cached(self, cache_key: str) -> Optional[str]:
        """Get from Redis or in-memory cache."""
        if self._redis:
            try:
                result = await self._redis.get(cache_key)
                if result:
                    return result.decode() if isinstance(result, bytes) else result
            except Exception as e:
                logger.warning(
                    "Redis cache read error, falling back to in-memory",
                    extra={"error": str(e)},
                )

        return self._in_memory_cache.get(cache_key)

    async def _set_cached(self, cache_key: str, nikud_text: str) -> None:
        """Set in Redis and in-memory cache."""
        if self._redis:
            try:
                await self._redis.setex(
                    cache_key,
                    self._config.cache_ttl_seconds,
                    nikud_text,
                )
            except Exception as e:
                logger.warning(
                    "Redis cache write error",
                    extra={"error": str(e)},
                )

        if len(self._in_memory_cache) < self._cache_max_size:
            self._in_memory_cache[cache_key] = nikud_text
