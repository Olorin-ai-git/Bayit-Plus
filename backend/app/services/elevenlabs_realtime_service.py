"""
BACKWARD-COMPATIBLE WRAPPER: Import from bayit_voice.stt instead
This file wraps the extracted bayit-voice-pipeline package for backward compatibility.
"""

import warnings

from app.core.config import settings
from bayit_voice import ElevenLabsRealtimeService as _ExtractedService


class _SettingsVoiceConfigAdapter:
    """Adapter to make Settings compatible with VoiceConfig protocol."""

    @property
    def elevenlabs_api_key(self) -> str:
        return settings.ELEVENLABS_API_KEY

    @property
    def elevenlabs_default_voice_id(self) -> str:
        return settings.ELEVENLABS_DEFAULT_VOICE_ID


class ElevenLabsRealtimeService(_ExtractedService):
    """
    Backward-compatible wrapper for ElevenLabsRealtimeService.

    DEPRECATED: Import directly from bayit_voice.stt.ElevenLabsRealtimeService instead.
    This wrapper will be removed in a future version.
    """

    def __init__(self):
        """Initialize with settings adapter for backward compatibility."""
        warnings.warn(
            "Importing ElevenLabsRealtimeService from app.services is deprecated. "
            "Use 'from bayit_voice.stt import ElevenLabsRealtimeService' instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(config=_SettingsVoiceConfigAdapter())
