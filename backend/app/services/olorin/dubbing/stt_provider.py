"""
STT Provider Abstraction for Realtime Dubbing

Abstract interface for speech-to-text providers with pluggable implementations.
"""

import logging
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class STTProvider(ABC):
    """
    Abstract base class for speech-to-text providers.

    Implementations should handle:
    - Connection management (connect/close)
    - Audio chunk streaming (send_audio_chunk)
    - Transcript receiving (receive_transcripts)
    """

    @abstractmethod
    async def connect(self, source_lang: str) -> None:
        """
        Establish connection to STT service.

        Args:
            source_lang: Source language code (e.g., 'he', 'en', 'es')
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close connection to STT service and cleanup resources."""
        pass

    @abstractmethod
    async def send_audio_chunk(self, audio_data: bytes) -> None:
        """
        Send audio chunk for transcription.

        Args:
            audio_data: Raw PCM audio bytes (16kHz, mono, 16-bit signed)
        """
        pass

    @abstractmethod
    async def receive_transcripts(self) -> AsyncIterator[Tuple[str, str]]:
        """
        Async iterator to receive transcripts.

        Yields:
            Tuple of (transcript_text, detected_language_code)
        """
        pass

    @property
    @abstractmethod
    def is_connected(self) -> bool:
        """Check if connected to STT service."""
        pass


class ElevenLabsSTTProvider(STTProvider):
    """
    ElevenLabs Scribe v2 STT provider implementation.

    Wraps ElevenLabsRealtimeService for the STTProvider interface.
    """

    def __init__(self):
        """Initialize the ElevenLabs STT provider."""
        self._service: Optional["ElevenLabsRealtimeService"] = None

    async def connect(self, source_lang: str) -> None:
        """Connect to ElevenLabs realtime STT."""
        from app.services.elevenlabs_realtime_service import \
            ElevenLabsRealtimeService

        self._service = ElevenLabsRealtimeService()
        await self._service.connect(source_lang=source_lang)
        logger.info(f"ElevenLabsSTTProvider connected for language: {source_lang}")

    async def close(self) -> None:
        """Close ElevenLabs connection."""
        if self._service:
            await self._service.close()
            self._service = None
            logger.info("ElevenLabsSTTProvider closed")

    async def send_audio_chunk(self, audio_data: bytes) -> None:
        """Send audio chunk to ElevenLabs."""
        if self._service:
            await self._service.send_audio_chunk(audio_data)

    async def receive_transcripts(self) -> AsyncIterator[Tuple[str, str]]:
        """Receive transcripts from ElevenLabs."""
        if self._service:
            async for transcript in self._service.receive_transcripts():
                yield transcript

    @property
    def is_connected(self) -> bool:
        """Check if connected to ElevenLabs."""
        return self._service is not None and self._service.is_connected


def get_stt_provider(provider_name: Optional[str] = None) -> STTProvider:
    """
    Factory function to get STT provider instance.

    Args:
        provider_name: Provider name (default: from config)
                       Supported: 'elevenlabs'

    Returns:
        STTProvider instance

    Raises:
        ValueError: If provider name is not supported
    """
    if provider_name is None:
        provider_name = settings.olorin.dubbing.stt_provider

    provider_name = provider_name.lower()

    if provider_name == "elevenlabs":
        return ElevenLabsSTTProvider()
    else:
        raise ValueError(
            f"Unsupported STT provider: {provider_name}. "
            f"Supported providers: elevenlabs"
        )
