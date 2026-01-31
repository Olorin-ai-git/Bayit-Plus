"""Live translation service - main orchestrator."""
import logging
from typing import Any, AsyncIterator, Dict, Optional

from .providers.stt_provider import STTProviderManager
from .providers.translation_provider import TranslationProviderManager
from .transcription import TranscriptionPipeline
from .translation import TranslationService
from .pipeline import LiveSubtitlePipeline

logger = logging.getLogger(__name__)


class LiveTranslationService:
    """Service for real-time audio transcription and translation."""

    def __init__(
        self, provider: Optional[str] = None, translation_provider: Optional[str] = None
    ):
        """
        Initialize service with providers.

        Args:
            provider: STT provider - "google", "whisper", or "elevenlabs".
                     If None, uses SPEECH_TO_TEXT_PROVIDER from config.
            translation_provider: Translation provider - "google", "openai", or "claude".
                                 If None, uses LIVE_TRANSLATION_PROVIDER from config.
        """
        logger.info(
            f"🔧 Initializing LiveTranslationService with STT: {provider or 'default'}, "
            f"Translation: {translation_provider or 'default'}"
        )

        try:
            # Initialize components
            self.stt_manager = STTProviderManager(provider)
            self.translation_manager = TranslationProviderManager(translation_provider)
            self.transcription = TranscriptionPipeline(self.stt_manager)
            self.translation = TranslationService(self.translation_manager)
            self.pipeline = LiveSubtitlePipeline(self.transcription, self.translation)

            logger.info(
                f"✅ LiveTranslationService initialized: "
                f"STT={self.stt_manager.provider}, "
                f"Translation={self.translation_manager.provider}"
            )

        except ImportError as e:
            logger.error(f"❌ Import error - missing dependencies: {str(e)}")
            self._log_install_help()
            raise

        except Exception as e:
            logger.error(f"❌ Failed to initialize services: {type(e).__name__}: {str(e)}")
            self._log_config_help(e)
            raise

    def _log_install_help(self) -> None:
        """Log installation help based on provider configuration."""
        providers = {self.stt_manager.provider, self.translation_manager.provider}
        if "google" in providers:
            logger.error("💡 Install: pip install google-cloud-speech google-cloud-translate")
        if {"whisper", "openai"} & providers:
            logger.error("💡 Install: pip install openai")
        if "elevenlabs" in providers:
            logger.error("💡 Install: pip install websockets")
        if "claude" in providers:
            logger.error("💡 Install: pip install anthropic")

    def _log_config_help(self, error: Exception) -> None:
        """Log configuration help based on error."""
        error_str = str(error).lower()
        if "credentials" in error_str or "authentication" in error_str:
            logger.error("💡 Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        elif "openai_api_key" in error_str:
            logger.error("💡 Set OPENAI_API_KEY environment variable or add to .env")
        elif "elevenlabs_api_key" in error_str:
            logger.error("💡 Set ELEVENLABS_API_KEY environment variable or add to .env")
        elif "anthropic_api_key" in error_str:
            logger.error("💡 Set ANTHROPIC_API_KEY environment variable or add to .env")

    # Public API - delegate to components
    async def transcribe_audio_stream(
        self, audio_stream: AsyncIterator[bytes], source_lang: str
    ):
        """
        Transcribe audio to text.

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code

        Yields:
            Transcribed text chunks (or tuples for ElevenLabs)
        """
        return self.transcription.transcribe(audio_stream, source_lang)

    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        timeout_seconds: float | None = None,
        enable_fallback: bool = True,
        channel_id: Optional[str] = None,
        cache_ttl_seconds: int = 300,
    ) -> str:
        """
        Translate text.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            timeout_seconds: Timeout for translation
            enable_fallback: Enable provider fallback
            channel_id: Optional channel ID for caching
            cache_ttl_seconds: Cache TTL in seconds

        Returns:
            Translated text
        """
        return await self.translation.translate(
            text,
            source_lang,
            target_lang,
            timeout_seconds,
            enable_fallback,
            channel_id,
            cache_ttl_seconds,
        )

    async def process_live_audio_to_subtitles(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str,
        target_lang: str,
        channel_id: Optional[str] = None,
        start_timestamp: float = 0.0,
        enable_predictive_subtitles: bool = True,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Process live audio to translated subtitles.

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code
            target_lang: Target language code
            channel_id: Optional channel ID for caching
            start_timestamp: Starting timestamp for subtitles
            enable_predictive_subtitles: Enable partial subtitle emission

        Yields:
            Subtitle cue dictionaries
        """
        return self.pipeline.process(
            audio_stream,
            source_lang,
            target_lang,
            channel_id,
            start_timestamp,
            enable_predictive_subtitles,
        )

    def verify_service_availability(self) -> Dict[str, Any]:
        """
        Verify transcription and translation services are available.

        Returns:
            Status dictionary with availability flags
        """
        status = {
            "speech_to_text": False,
            "translate": False,
            "stt_provider": self.stt_manager.provider,
            "translation_provider": self.translation_manager.provider,
        }

        # Check STT provider
        status["speech_to_text"] = self.stt_manager.verify_availability()

        # Check translation provider
        status["translate"] = self.translation_manager.verify_availability()

        return status
