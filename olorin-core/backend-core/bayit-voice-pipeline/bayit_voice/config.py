"""
Configuration protocol for Bayit voice services.
Defines interface for voice configuration to enable dependency injection.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class VoiceConfig(Protocol):
    """Protocol for voice service configuration."""

    @property
    def elevenlabs_api_key(self) -> str:
        """ElevenLabs API key for authentication."""
        ...

    @property
    def elevenlabs_default_voice_id(self) -> str:
        """Default ElevenLabs voice ID for TTS."""
        ...


class SimpleVoiceConfig:
    """Simple implementation of VoiceConfig for testing or direct usage."""

    def __init__(self, api_key: str, default_voice_id: str):
        """
        Initialize voice configuration.

        Args:
            api_key: ElevenLabs API key (required)
            default_voice_id: Default voice ID (required, e.g., ElevenLabs Rachel voice)
        """
        if not api_key:
            raise ValueError("elevenlabs_api_key is required")
        if not default_voice_id:
            raise ValueError("elevenlabs_default_voice_id is required")
        self._api_key = api_key
        self._default_voice_id = default_voice_id

    @property
    def elevenlabs_api_key(self) -> str:
        return self._api_key

    @property
    def elevenlabs_default_voice_id(self) -> str:
        return self._default_voice_id
