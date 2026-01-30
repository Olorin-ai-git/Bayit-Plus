"""Catch-up session and cache management."""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.summary_builder import (
    build_summary_from_transcript,
    fetch_epg_context,
)
from app.services.catchup.transcript_service import (
    ChannelTranscriptService,
    get_transcript_service,
)

logger = get_logger(__name__)


class CatchUpSessionManager:
    """Manages catch-up summary generation, caching, and session state."""

    def __init__(
        self,
        transcript_service: Optional[ChannelTranscriptService] = None,
        recap_service=None,
        epg_service=None,
    ):
        """Initialize with optional service dependencies."""
        self._transcript_service = transcript_service or get_transcript_service()
        self._recap_service = recap_service
        self._epg_service = epg_service
        self._summary_cache: Dict[str, Tuple[dict, datetime]] = {}
        self._lock = asyncio.Lock()
        logger.info("Catch-up session manager initialized", extra={
            "has_recap_service": recap_service is not None,
            "has_epg_service": epg_service is not None,
        })

    def _build_cache_key(
        self, channel_id: str, language: str,
        window_start: datetime, window_end: datetime,
    ) -> str:
        """Build quantized cache key for summary lookup."""
        q_secs = settings.olorin.catchup.window_quantization_seconds
        q_start = (int(window_start.timestamp()) // q_secs) * q_secs
        q_end = (int(window_end.timestamp()) // q_secs) * q_secs
        return f"catchup:{channel_id}:{language}:{q_start}:{q_end}"

    async def _cleanup_expired_cache(self) -> None:
        """Remove expired entries from summary cache."""
        async with self._lock:
            now = datetime.now(timezone.utc)
            ttl_seconds = settings.olorin.catchup.cache_ttl_seconds
            expired_keys = [
                key for key, (_, cached_at) in self._summary_cache.items()
                if (now - cached_at).total_seconds() > ttl_seconds
            ]
            for key in expired_keys:
                del self._summary_cache[key]
            if expired_keys:
                logger.info(
                    "Cleaned up expired cache entries",
                    extra={
                        "expired_count": len(expired_keys),
                        "remaining_count": len(self._summary_cache),
                    },
                )

    async def generate_summary(
        self, channel_id: str, user_id: str,
        target_language: str, window_minutes: Optional[int] = None,
    ) -> dict:
        """Generate catch-up summary for channel."""
        await self._cleanup_expired_cache()
        if window_minutes is None:
            window_minutes = settings.olorin.catchup.default_window_minutes

        window_end = datetime.now(timezone.utc)
        window_start = window_end - timedelta(minutes=window_minutes)
        cache_key = self._build_cache_key(
            channel_id, target_language, window_start, window_end,
        )
        async with self._lock:
            if cache_key in self._summary_cache:
                cached_summary, cached_at = self._summary_cache[cache_key]
                age = (datetime.now(timezone.utc) - cached_at).total_seconds()
                if age <= settings.olorin.catchup.cache_ttl_seconds:
                    logger.info(
                        "Returning cached summary",
                        extra={"channel_id": channel_id, "user_id": user_id},
                    )
                    return {**cached_summary, "cached": True}

        logger.info(
            "Generating new catch-up summary",
            extra={
                "channel_id": channel_id,
                "user_id": user_id,
                "window_minutes": window_minutes,
            },
        )

        segments = await self._transcript_service.get_transcript(
            channel_id, window_start, window_end,
        )
        if not segments:
            logger.warning(
                "No transcript segments available",
                extra={"channel_id": channel_id, "window_minutes": window_minutes},
            )
            return {
                "summary": "No transcript data available for this time period.",
                "key_points": [],
                "program_info": None,
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "cached": False,
                "language": target_language,
            }

        epg_context = await fetch_epg_context(
            self._epg_service, channel_id, window_start, window_end,
        )
        summary_data = await self._generate_summary_data(
            segments, epg_context, channel_id, target_language,
        )

        result = {
            "summary": summary_data["summary"],
            "key_points": summary_data["key_points"],
            "program_info": epg_context,
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "cached": False,
            "language": target_language,
        }

        async with self._lock:
            self._summary_cache[cache_key] = (result, datetime.now(timezone.utc))

        logger.info("Generated and cached catch-up summary", extra={
            "channel_id": channel_id,
            "segment_count": len(segments),
            "has_epg_context": epg_context is not None,
        })
        return result

    async def _generate_summary_data(
        self, segments, epg_context, channel_id: str, target_language: str,
    ) -> dict:
        """Generate summary via recap service or transcript fallback."""
        if self._recap_service:
            try:
                transcript_text = " ".join(s.text for s in segments)
                prompt = "Summarize the following live channel content"
                if epg_context:
                    prompt += f" from program '{epg_context['title']}'"
                prompt += f":\n\n{transcript_text}"
                recap_result = await self._recap_service.generate_recap(
                    content=prompt,
                    language=target_language,
                    max_tokens=settings.olorin.catchup.max_summary_tokens,
                )
                return {
                    "summary": recap_result.get("summary", ""),
                    "key_points": recap_result.get("key_points", []),
                }
            except Exception as e:
                logger.error(
                    "Recap service failed, falling back to direct summarization",
                    extra={"channel_id": channel_id, "error": str(e)},
                )
        return await build_summary_from_transcript(segments, epg_context)

    async def check_catchup_available(self, channel_id: str) -> bool:
        """Check if catch-up is available for channel."""
        min_seconds = settings.olorin.catchup.min_data_seconds
        return await self._transcript_service.has_sufficient_data(
            channel_id, min_seconds,
        )


# Module-level singleton
_session_manager: Optional[CatchUpSessionManager] = None


def get_session_manager() -> CatchUpSessionManager:
    """Get singleton session manager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = CatchUpSessionManager()
    return _session_manager
