"""Catch-up session and cache management."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.transcript_service import (
    ChannelTranscriptService,
    TranscriptSegment,
    get_transcript_service,
)

logger = get_logger(__name__)


class CatchUpSessionManager:
    """Manages catch-up summary generation, caching, and session state."""

    def __init__(
        self,
        transcript_service: Optional[ChannelTranscriptService] = None,
        recap_service=None,  # Optional[RecapAgentService]
        epg_service=None,  # Optional EPGService
    ):
        """Initialize session manager with optional service dependencies.

        Args:
            transcript_service: Channel transcript service (uses singleton if None)
            recap_service: Optional recap agent service for AI summaries
            epg_service: Optional EPG service for program context
        """
        self._transcript_service = transcript_service or get_transcript_service()
        self._recap_service = recap_service
        self._epg_service = epg_service
        self._summary_cache: Dict[str, Tuple[dict, datetime]] = {}
        self._lock = asyncio.Lock()
        logger.info(
            "Catch-up session manager initialized",
            extra={
                "has_recap_service": recap_service is not None,
                "has_epg_service": epg_service is not None,
            },
        )

    def _build_cache_key(
        self, channel_id: str, language: str, window_start: datetime, window_end: datetime
    ) -> str:
        """Build quantized cache key for summary lookup.

        Quantizes timestamps to configured intervals for cache efficiency.

        Args:
            channel_id: Channel identifier
            language: Target language code
            window_start: Start of time window
            window_end: End of time window

        Returns:
            Cache key string
        """
        quantization_seconds = settings.olorin.catchup.window_quantization_seconds

        # Quantize timestamps to nearest interval
        start_timestamp = int(window_start.timestamp())
        end_timestamp = int(window_end.timestamp())
        quantized_start = (start_timestamp // quantization_seconds) * quantization_seconds
        quantized_end = (end_timestamp // quantization_seconds) * quantization_seconds

        cache_key = f"catchup:{channel_id}:{language}:{quantized_start}:{quantized_end}"
        logger.debug(
            "Built cache key",
            extra={
                "channel_id": channel_id,
                "language": language,
                "quantized_start": quantized_start,
                "quantized_end": quantized_end,
                "cache_key": cache_key,
            },
        )
        return cache_key

    async def _cleanup_expired_cache(self) -> None:
        """Remove expired entries from summary cache."""
        async with self._lock:
            now = datetime.utcnow()
            ttl_seconds = settings.olorin.catchup.cache_ttl_seconds
            expired_keys = []

            for key, (_, cached_at) in self._summary_cache.items():
                age_seconds = (now - cached_at).total_seconds()
                if age_seconds > ttl_seconds:
                    expired_keys.append(key)

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

    async def _fetch_epg_context(
        self, channel_id: str, window_start: datetime, window_end: datetime
    ) -> Optional[dict]:
        """Fetch EPG program context for time window.

        Args:
            channel_id: Channel identifier
            window_start: Start of time window
            window_end: End of time window

        Returns:
            EPG program info dict or None if unavailable
        """
        if not self._epg_service:
            logger.debug("EPG service not available, skipping program context")
            return None

        try:
            # Query EPG service for programs in window
            programs = await self._epg_service.get_programs(
                channel_id=channel_id,
                start_time=window_start,
                end_time=window_end,
            )

            if not programs:
                logger.debug(
                    "No EPG programs found for window",
                    extra={"channel_id": channel_id},
                )
                return None

            # Use primary program (longest duration in window)
            primary_program = max(programs, key=lambda p: p.get("duration", 0))
            epg_context = {
                "title": primary_program.get("title", ""),
                "description": primary_program.get("description", ""),
                "time_slot": f"{window_start.strftime('%H:%M')} - {window_end.strftime('%H:%M')}",
                "genre": primary_program.get("genre", ""),
            }

            logger.debug(
                "Retrieved EPG context",
                extra={
                    "channel_id": channel_id,
                    "program_title": epg_context["title"],
                },
            )
            return epg_context

        except Exception as e:
            logger.warning(
                "Failed to fetch EPG context, continuing without program info",
                extra={"channel_id": channel_id, "error": str(e)},
            )
            return None

    async def _build_summary_from_transcript(
        self, segments: List[TranscriptSegment], epg_context: Optional[dict]
    ) -> dict:
        """Build summary directly from transcript segments.

        Fallback when recap service unavailable.

        Args:
            segments: List of transcript segments
            epg_context: Optional EPG program context

        Returns:
            Summary dict with text and key points
        """
        if not segments:
            return {
                "summary": "No transcript data available for this time period.",
                "key_points": [],
            }

        # Concatenate transcript text
        full_text = " ".join(segment.text for segment in segments)

        # Simple extraction of key points (first sentence of each segment)
        key_points = []
        for segment in segments:
            sentences = segment.text.split(". ")
            if sentences:
                key_points.append(sentences[0].strip())

        # Limit key points
        max_key_points = 5
        if len(key_points) > max_key_points:
            key_points = key_points[:max_key_points]

        summary_text = full_text[:500]  # First 500 characters
        if len(full_text) > 500:
            summary_text += "..."

        if epg_context:
            summary_text = f"[{epg_context['title']}] {summary_text}"

        return {
            "summary": summary_text,
            "key_points": key_points,
        }

    async def generate_summary(
        self,
        channel_id: str,
        user_id: str,
        target_language: str,
        window_minutes: Optional[int] = None,
    ) -> dict:
        """Generate catch-up summary for channel.

        Args:
            channel_id: Channel identifier
            user_id: User requesting summary
            target_language: Target language code
            window_minutes: Optional window duration (uses config default if None)

        Returns:
            Summary dict with summary text, key_points, program_info, window times, cached flag, language
        """
        # Cleanup expired cache entries
        await self._cleanup_expired_cache()

        # Determine time window
        if window_minutes is None:
            window_minutes = settings.olorin.catchup.default_window_minutes

        window_end = datetime.utcnow()
        window_start = window_end - timedelta(minutes=window_minutes)

        # Check cache
        cache_key = self._build_cache_key(
            channel_id, target_language, window_start, window_end
        )

        async with self._lock:
            if cache_key in self._summary_cache:
                cached_summary, cached_at = self._summary_cache[cache_key]
                age_seconds = (datetime.utcnow() - cached_at).total_seconds()

                if age_seconds <= settings.olorin.catchup.cache_ttl_seconds:
                    logger.info(
                        "Returning cached summary",
                        extra={
                            "channel_id": channel_id,
                            "user_id": user_id,
                            "cache_age_seconds": age_seconds,
                        },
                    )
                    return {**cached_summary, "cached": True}

        # Cache miss - generate new summary
        logger.info(
            "Generating new catch-up summary",
            extra={
                "channel_id": channel_id,
                "user_id": user_id,
                "window_minutes": window_minutes,
                "target_language": target_language,
            },
        )

        # Fetch transcript segments
        segments = await self._transcript_service.get_transcript(
            channel_id, window_start, window_end
        )

        if not segments:
            logger.warning(
                "No transcript segments available for window",
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

        # Fetch EPG context (graceful degradation if unavailable)
        epg_context = await self._fetch_epg_context(
            channel_id, window_start, window_end
        )

        # Build prompt combining transcript + EPG
        transcript_text = " ".join(segment.text for segment in segments)

        # Generate summary
        if self._recap_service:
            try:
                # Use AI recap service
                prompt = f"Summarize the following live channel content"
                if epg_context:
                    prompt += f" from program '{epg_context['title']}'"
                prompt += f":\n\n{transcript_text}"

                recap_result = await self._recap_service.generate_recap(
                    content=prompt,
                    language=target_language,
                    max_tokens=settings.olorin.catchup.max_summary_tokens,
                )

                summary_data = {
                    "summary": recap_result.get("summary", ""),
                    "key_points": recap_result.get("key_points", []),
                }

            except Exception as e:
                logger.error(
                    "Recap service failed, falling back to direct summarization",
                    extra={"channel_id": channel_id, "error": str(e)},
                )
                summary_data = await self._build_summary_from_transcript(
                    segments, epg_context
                )
        else:
            # Fallback: direct summarization
            summary_data = await self._build_summary_from_transcript(
                segments, epg_context
            )

        # Build result
        result = {
            "summary": summary_data["summary"],
            "key_points": summary_data["key_points"],
            "program_info": epg_context,
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "cached": False,
            "language": target_language,
        }

        # Cache result
        async with self._lock:
            self._summary_cache[cache_key] = (result, datetime.utcnow())

        logger.info(
            "Generated and cached catch-up summary",
            extra={
                "channel_id": channel_id,
                "user_id": user_id,
                "segment_count": len(segments),
                "has_epg_context": epg_context is not None,
            },
        )

        return result

    async def check_catchup_available(self, channel_id: str) -> bool:
        """Check if catch-up is available for channel.

        Args:
            channel_id: Channel identifier

        Returns:
            True if sufficient transcript data exists
        """
        min_seconds = 60  # Minimum 1 minute of data
        available = await self._transcript_service.has_sufficient_data(
            channel_id, min_seconds
        )

        logger.debug(
            "Checked catch-up availability",
            extra={"channel_id": channel_id, "available": available},
        )
        return available


# Module-level singleton
_session_manager: Optional[CatchUpSessionManager] = None


def get_session_manager() -> CatchUpSessionManager:
    """Get singleton session manager instance.

    Returns:
        Catch-up session manager singleton
    """
    global _session_manager
    if _session_manager is None:
        _session_manager = CatchUpSessionManager()
    return _session_manager
