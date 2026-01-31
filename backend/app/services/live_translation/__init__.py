"""Live translation package - backward compatible exports."""
from .service import LiveTranslationService
from .constants import (
    GOOGLE_AVAILABLE,
    OPENAI_AVAILABLE,
    ELEVENLABS_AVAILABLE,
    ANTHROPIC_AVAILABLE,
    LANGUAGE_CODES,
    LANGUAGE_NAMES,
)
from .text_processing import (
    chunk_text_for_subtitles,
    deduplicate_transcript,
)

__all__ = [
    "LiveTranslationService",
    "GOOGLE_AVAILABLE",
    "OPENAI_AVAILABLE",
    "ELEVENLABS_AVAILABLE",
    "ANTHROPIC_AVAILABLE",
    "LANGUAGE_CODES",
    "LANGUAGE_NAMES",
    "chunk_text_for_subtitles",
    "deduplicate_transcript",
]
