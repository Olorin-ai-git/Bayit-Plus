"""Catch-up summary building from transcript segments and EPG context."""

from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.catchup.transcript_service import TranscriptSegment

logger = get_logger(__name__)


async def fetch_epg_context(
    epg_service, channel_id: str, window_start: datetime, window_end: datetime
) -> Optional[dict]:
    """Fetch EPG program context for time window.

    Args:
        epg_service: EPG service instance
        channel_id: Channel identifier
        window_start: Start of time window
        window_end: End of time window

    Returns:
        EPG program info dict or None if unavailable
    """
    if not epg_service:
        logger.debug("EPG service not available, skipping program context")
        return None

    try:
        programs = await epg_service.get_programs(
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

        primary_program = max(programs, key=lambda p: p.get("duration", 0))
        epg_context = {
            "title": primary_program.get("title", ""),
            "description": primary_program.get("description", ""),
            "time_slot": (
                f"{window_start.strftime('%H:%M')} - {window_end.strftime('%H:%M')}"
            ),
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


async def build_summary_from_transcript(
    segments: List[TranscriptSegment], epg_context: Optional[dict]
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

    full_text = " ".join(segment.text for segment in segments)

    # Extract key points (first sentence of each segment)
    key_points = []
    for segment in segments:
        sentences = segment.text.split(". ")
        if sentences:
            key_points.append(sentences[0].strip())

    max_key_points = settings.olorin.catchup.max_summary_key_points
    if len(key_points) > max_key_points:
        key_points = key_points[:max_key_points]

    max_chars = settings.olorin.catchup.max_summary_chars
    summary_text = full_text[:max_chars]
    if len(full_text) > max_chars:
        summary_text += "..."

    if epg_context:
        summary_text = f"[{epg_context['title']}] {summary_text}"

    return {
        "summary": summary_text,
        "key_points": key_points,
    }
