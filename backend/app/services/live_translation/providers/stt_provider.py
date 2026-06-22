"""STT provider initialization and configuration."""
import logging
from typing import Optional

from app.core.config import settings
from ..constants import (
    GOOGLE_AVAILABLE,
    OPENAI_AVAILABLE,
    ELEVENLABS_AVAILABLE,
    LANGUAGE_CODES,
)

logger = logging.getLogger(__name__)


class STTProviderManager:
    """Manages STT provider initialization."""

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize STT provider manager.

        Args:
            provider: STT provider - "google", "whisper", or "elevenlabs".
                     If None, uses SPEECH_TO_TEXT_PROVIDER from config.
        """
        self.provider = provider or settings.SPEECH_TO_TEXT_PROVIDER
        self.speech_client = None
        self.whisper_service = None
        self.elevenlabs_service = None
        self._init_provider()

    def _init_provider(self) -> None:
        """Initialize the speech-to-text provider."""
        if self.provider == "google":
            if not GOOGLE_AVAILABLE:
                raise ImportError(
                    "Google Cloud libraries not installed. "
                    "Install: pip install google-cloud-speech google-cloud-translate"
                )

            logger.info(" Initializing Google Cloud Speech client...")
            from google.cloud import speech_v1p1beta1 as speech

            self.speech_client = speech.SpeechClient()
            logger.info("[OK] Google Cloud Speech-to-Text initialized")

        elif self.provider == "whisper":
            if not OPENAI_AVAILABLE:
                raise ImportError(
                    "OpenAI library not installed. Install: pip install openai"
                )

            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")

            logger.info(" Initializing OpenAI Whisper service...")
            from app.services.whisper_transcription_service import (
                WhisperTranscriptionService,
            )

            self.whisper_service = WhisperTranscriptionService()
            logger.info("[OK] OpenAI Whisper initialized")

        elif self.provider == "elevenlabs":
            if not ELEVENLABS_AVAILABLE:
                raise ImportError(
                    "ElevenLabs realtime service not available. "
                    "Install: pip install websockets"
                )

            if not settings.ELEVENLABS_API_KEY:
                raise ValueError("ELEVENLABS_API_KEY not configured")

            logger.info(" Initializing ElevenLabs Scribe v2 realtime service...")
            from app.services.elevenlabs_realtime_service import (
                ElevenLabsRealtimeService,
            )

            self.elevenlabs_service = ElevenLabsRealtimeService()
            logger.info("[OK] ElevenLabs Scribe v2 initialized (~150ms latency)")

        else:
            raise ValueError(
                f"Invalid STT provider: {self.provider}. "
                "Must be 'google', 'whisper', or 'elevenlabs'"
            )

    def get_recognition_config(self, source_lang: str = "he"):
        """
        Get streaming recognition configuration for Google Speech.

        Args:
            source_lang: Source language code

        Returns:
            Google Speech StreamingRecognitionConfig
        """
        from google.cloud import speech_v1p1beta1 as speech

        lang_code = LANGUAGE_CODES.get(source_lang, f"{source_lang}-IL")

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=settings.olorin.subtitle.audio_sample_rate,
            language_code=lang_code,
            enable_automatic_punctuation=True,
            model="latest_long",
            use_enhanced=True,
        )

        return speech.StreamingRecognitionConfig(config=config, interim_results=False)

    def verify_availability(self) -> bool:
        """
        Verify STT provider is available.

        Returns:
            True if provider is available
        """
        try:
            if self.provider == "google" and self.speech_client:
                self.speech_client.list_models(parent="global")
                return True
            elif self.provider == "whisper" and self.whisper_service:
                return self.whisper_service.verify_service_availability()
            elif self.provider == "elevenlabs" and self.elevenlabs_service:
                return self.elevenlabs_service.verify_service_availability()
        except Exception as e:
            logger.error(f"STT provider ({self.provider}) unavailable: {str(e)}")
        return False
