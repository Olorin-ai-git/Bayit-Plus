"""
DEPRECATED: Use app.services.live_translation instead.

This file is maintained for backward compatibility only.
The live translation service has been refactored into a package structure
with files under 200 lines each.

Migration guide:
    OLD: from app.services.live_translation_service import LiveTranslationService
    NEW: from app.services.live_translation import LiveTranslationService
"""
import warnings

# Re-export everything from the new package
from app.services.live_translation import (
    LiveTranslationService,
    GOOGLE_AVAILABLE,
    OPENAI_AVAILABLE,
    ELEVENLABS_AVAILABLE,
    ANTHROPIC_AVAILABLE,
    LANGUAGE_CODES,
    LANGUAGE_NAMES,
    chunk_text_for_subtitles,
    deduplicate_transcript,
)

# Issue deprecation warning
warnings.warn(
    "Importing from 'app.services.live_translation_service' is deprecated. "
    "Use 'from app.services.live_translation import ...' instead. "
    "This compatibility layer will be removed in a future version.",
    DeprecationWarning,
    stacklevel=2,
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
