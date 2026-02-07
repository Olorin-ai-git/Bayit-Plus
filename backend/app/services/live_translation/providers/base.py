"""Abstract base classes for STT and Translation providers."""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class STTProvider(ABC):
    """Abstract STT provider interface."""

    @abstractmethod
    async def transcribe(
        self, audio_stream: AsyncIterator[bytes], source_lang: str
    ) -> AsyncIterator[str]:
        """
        Transcribe audio to text.

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code

        Yields:
            Transcribed text chunks
        """

    @abstractmethod
    def verify_availability(self) -> bool:
        """
        Verify provider is available.

        Returns:
            True if provider is available and functional
        """


class TranslationProvider(ABC):
    """Abstract translation provider interface."""

    @abstractmethod
    async def translate(
        self, text: str, source_lang: str, target_lang: str, timeout: float
    ) -> str:
        """
        Translate text.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            timeout: Timeout in seconds

        Returns:
            Translated text
        """

    @abstractmethod
    def verify_availability(self) -> bool:
        """
        Verify provider is available.

        Returns:
            True if provider is available and functional
        """
