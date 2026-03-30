"""
Unified Character Extractor

Tries TMDB-based extraction first. If no TMDB match is found,
falls back to transcript-based speaker extraction via ElevenLabs
Scribe + Claude analysis.
"""

import logging
from typing import List, Optional

from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.vod_interaction import ContentCharacter
from app.services.olorin.speaker_extraction import (
    extract_speakers_from_transcript,
)
from app.services.olorin.video_transcriber import (
    TranscriptionResult,
    transcribe_video,
)
from app.services.vod_interaction.character_extractor import (
    character_extractor_service,
)

logger = get_logger(__name__)


async def _try_tmdb_extraction(
    content: Content,
) -> Optional[List[ContentCharacter]]:
    """Attempt TMDB-based character extraction."""
    if not content.tmdb_id:
        return None

    characters = await character_extractor_service.extract_characters(content)
    if characters:
        logger.info(
            "TMDB extraction succeeded",
            extra={
                "content_id": str(content.id),
                "characters": len(characters),
            },
        )
        return characters
    return None


async def _try_transcript_extraction(
    video_url: str,
    video_title: Optional[str] = None,
) -> tuple[List[ContentCharacter], Optional[TranscriptionResult]]:
    """Transcribe video and extract speakers from transcript."""
    logger.info(
        "Falling back to transcript-based extraction",
        extra={"url": video_url[:80]},
    )
    transcription = await transcribe_video(video_url)

    if not transcription.full_text:
        logger.warning(
            "Transcription returned empty text",
            extra={"url": video_url[:80]},
        )
        return [], transcription

    characters = await extract_speakers_from_transcript(
        segments=transcription.segments,
        speakers_count=transcription.speakers_count,
        video_title=video_title,
    )
    return characters, transcription


async def extract_characters(
    content: Content,
    video_url: Optional[str] = None,
    video_title: Optional[str] = None,
) -> List[ContentCharacter]:
    """
    Extract characters — TMDB first, transcript fallback.

    1. If content has tmdb_id → use existing TMDB extractor
    2. If no TMDB match → transcribe video → Claude speaker analysis
    3. Stores transcript on content document for downstream use

    Args:
        content: Content document to extract characters for
        video_url: Video URL (required for transcript fallback)
        video_title: Optional title hint for speaker extraction

    Returns:
        List of ContentCharacter profiles
    """
    tmdb_chars = await _try_tmdb_extraction(content)
    if tmdb_chars:
        return tmdb_chars

    if not video_url:
        logger.warning(
            "No tmdb_id and no video_url — cannot extract characters",
            extra={"content_id": str(content.id)},
        )
        return []

    title = video_title or content.title or "Untitled"
    characters, transcription = await _try_transcript_extraction(
        video_url, title
    )

    if transcription and transcription.full_text:
        content.transcript = transcription.full_text
        content.transcript_segments = [
            {
                "speaker": seg.speaker,
                "text": seg.text,
                "start": seg.start,
                "end": seg.end,
            }
            for seg in transcription.segments
        ]
        await content.save()
        logger.info(
            "Transcript saved to content document",
            extra={
                "content_id": str(content.id),
                "segments": len(transcription.segments),
            },
        )

    return characters
