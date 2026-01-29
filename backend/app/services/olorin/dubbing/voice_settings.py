"""
Per-Session Voice Settings (P3-2) and Accent Selection (P3-3)

Configurable voice parameters per dubbing session.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class VoiceSettings:
    """
    Per-session voice customization parameters.

    Controls ElevenLabs TTS voice characteristics:
    - stability: Voice consistency (0.0 = variable, 1.0 = stable)
    - similarity_boost: How closely to match the voice (0.0-1.0)
    - style: Speaking style exaggeration (0.0 = neutral, 1.0 = exaggerated)
    - speaker_boost: Apply speaker boost for clarity
    """

    stability: float = 0.5
    similarity_boost: float = 0.75
    style: float = 0.0
    # Voice Tech #13: Default False for real-time (saves 30-80ms latency)
    speaker_boost: bool = False

    def to_elevenlabs_dict(self) -> Dict:
        """Convert to ElevenLabs API voice_settings format."""
        return {
            "stability": self.stability,
            "similarity_boost": self.similarity_boost,
            "style": self.style,
            "use_speaker_boost": self.speaker_boost,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "VoiceSettings":
        """Create from a dictionary (e.g., API request body)."""
        return cls(
            stability=data.get("stability", 0.5),
            similarity_boost=data.get("similarity_boost", 0.75),
            style=data.get("style", 0.0),
            speaker_boost=data.get("speaker_boost", False),
        )

    @classmethod
    def from_request(cls, request) -> "VoiceSettings":
        """Create from a VoiceSettingsRequest API model (Code Review #4)."""
        return cls(
            stability=request.stability,
            similarity_boost=request.similarity_boost,
            style=request.style,
            speaker_boost=request.speaker_boost,
        )


# P3-3: Accent selection mapping
# Maps language codes to accent variants with corresponding voice IDs
# Voice IDs loaded from config - these are logical mappings
ACCENT_VARIANTS: Dict[str, Dict[str, str]] = {
    "en": {
        "en-US": "American English",
        "en-GB": "British English",
        "en-AU": "Australian English",
        "en-IN": "Indian English",
    },
    "es": {
        "es-ES": "Castilian Spanish",
        "es-MX": "Mexican Spanish",
        "es-AR": "Argentine Spanish",
    },
    "he": {
        "he-IL": "Israeli Hebrew",
    },
}


def get_accent_label(language: str, accent_code: str) -> str:
    """Get the human-readable label for an accent variant."""
    variants = ACCENT_VARIANTS.get(language, {})
    return variants.get(accent_code, accent_code)


def list_accents(language: str) -> Dict[str, str]:
    """List available accent variants for a language."""
    return ACCENT_VARIANTS.get(language, {})
