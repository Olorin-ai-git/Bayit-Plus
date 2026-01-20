"""
BACKWARD-COMPATIBLE WRAPPER: Import from bayit_voice.sfx instead
This file wraps the extracted bayit-voice-pipeline package for backward compatibility.
"""

import warnings
from typing import Optional

from app.core.config import settings
from bayit_voice import ElevenLabsSFXService as _ExtractedService


class _SettingsVoiceConfigAdapter:
    """Adapter to make Settings compatible with VoiceConfig protocol."""

    @property
    def elevenlabs_api_key(self) -> str:
        return settings.ELEVENLABS_API_KEY

    @property
    def elevenlabs_default_voice_id(self) -> str:
        return settings.ELEVENLABS_DEFAULT_VOICE_ID


class ElevenLabsSFXService(_ExtractedService):
    """
    Backward-compatible wrapper for ElevenLabsSFXService.

    DEPRECATED: Import directly from bayit_voice.sfx.ElevenLabsSFXService instead.
    This wrapper will be removed in a future version.
    """

    def __init__(self):
        """Initialize with settings adapter for backward compatibility."""
        warnings.warn(
            "Importing ElevenLabsSFXService from app.services is deprecated. "
            "Use 'from bayit_voice.sfx import ElevenLabsSFXService' instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(config=_SettingsVoiceConfigAdapter())


# Singleton instance
_sfx_service: Optional[ElevenLabsSFXService] = None


def get_sfx_service() -> ElevenLabsSFXService:
    """Get or create the singleton SFX service instance."""
    global _sfx_service
    if _sfx_service is None:
        _sfx_service = ElevenLabsSFXService()
    return _sfx_service
