"""
Live Translation Service
Real-time speech-to-text and translation for live streaming subtitles
Supports both Google Cloud Speech-to-Text and OpenAI Whisper
"""
import logging
import time
from typing import AsyncIterator, Dict, Any, Optional
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import translate_v2 as translate
from app.core.config import settings

logger = logging.getLogger(__name__)

# Language code mapping for Google Speech-to-Text
LANGUAGE_CODES = {
    "he": "he-IL", "en": "en-US", "ar": "ar-IL",
    "es": "es-ES", "ru": "ru-RU", "fr": "fr-FR"
}


class LiveTranslationService:
    """Service for real-time audio transcription and translation."""

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize transcription service with specified provider.

        Args:
            provider: "google" or "whisper". If None, uses SPEECH_TO_TEXT_PROVIDER from config.
        """
        self.provider = provider or settings.SPEECH_TO_TEXT_PROVIDER
        self.speech_client = None
        self.translate_client = None
        self.whisper_service = None

        try:
            if self.provider == "google":
                self.speech_client = speech.SpeechClient()
                self.translate_client = translate.Client()
                logger.info("✅ LiveTranslationService initialized with Google Cloud Speech-to-Text")
            elif self.provider == "whisper":
                from app.services.whisper_transcription_service import WhisperTranscriptionService
                self.whisper_service = WhisperTranscriptionService()
                self.translate_client = translate.Client()  # Still use Google Translate
                logger.info("✅ LiveTranslationService initialized with OpenAI Whisper")
            else:
                raise ValueError(f"Invalid speech provider: {self.provider}. Must be 'google' or 'whisper'")
        except Exception as e:
            logger.error(f"❌ Failed to initialize {self.provider} service: {str(e)}")
            raise

    def get_recognition_config(self, source_lang: str = "he") -> speech.StreamingRecognitionConfig:
        """Get streaming recognition configuration."""
        lang_code = LANGUAGE_CODES.get(source_lang, f"{source_lang}-IL")

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=lang_code,
            enable_automatic_punctuation=True,
            model="latest_long",
            use_enhanced=True,
        )

        return speech.StreamingRecognitionConfig(config=config, interim_results=False)

    async def transcribe_audio_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str = "he"
    ) -> AsyncIterator[str]:
        """
        Transcribe audio stream to text in real-time.
        Uses configured provider (Google Cloud or OpenAI Whisper).
        """
        try:
            if self.provider == "google":
                # Google Cloud Speech-to-Text (true streaming)
                streaming_config = self.get_recognition_config(source_lang)

                async def request_generator():
                    yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)
                    async for audio_chunk in audio_stream:
                        yield speech.StreamingRecognizeRequest(audio_content=audio_chunk)

                responses = self.speech_client.streaming_recognize(request_generator())

                for response in responses:
                    if response.results and response.results[0].is_final:
                        if response.results[0].alternatives:
                            transcript = response.results[0].alternatives[0].transcript
                            logger.debug(f"Google transcribed: {transcript}")
                            yield transcript

            elif self.provider == "whisper":
                # OpenAI Whisper (buffered streaming)
                async for transcript in self.whisper_service.transcribe_audio_stream(
                    audio_stream,
                    source_lang=source_lang
                ):
                    logger.debug(f"Whisper transcribed: {transcript}")
                    yield transcript

        except Exception as e:
            logger.error(f"Transcription error ({self.provider}): {str(e)}")
            raise

    async def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text using Google Cloud Translate."""
        try:
            result = self.translate_client.translate(
                text, source_language=source_lang, target_language=target_lang
            )
            translated = result['translatedText']
            logger.debug(f"Translated: {text} → {translated}")
            return translated
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return text

    async def process_live_audio_to_subtitles(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str,
        target_lang: str,
        start_timestamp: float = 0.0
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Complete pipeline: Audio → Transcription → Translation → Subtitle cues.

        Yields subtitle cues with format:
        {"text": "...", "original_text": "...", "timestamp": 123.45, ...}
        """
        session_start = time.time()

        try:
            async for transcript in self.transcribe_audio_stream(audio_stream, source_lang):
                if not transcript.strip():
                    continue

                # Translate (skip if same language)
                translated = transcript if source_lang == target_lang else \
                    await self.translate_text(transcript, source_lang, target_lang)

                # Calculate timestamp
                current_time = time.time() - session_start + start_timestamp

                yield {
                    "text": translated,
                    "original_text": transcript,
                    "timestamp": current_time,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "confidence": 0.95
                }

        except Exception as e:
            logger.error(f"Live subtitle pipeline error: {str(e)}")
            raise

    def verify_service_availability(self) -> Dict[str, Any]:
        """Verify transcription and translation services are available."""
        status = {
            "speech_to_text": False,
            "translate": False,
            "provider": self.provider
        }

        try:
            if self.provider == "google":
                self.speech_client.list_models(parent="global")
                status["speech_to_text"] = True
            elif self.provider == "whisper":
                status["speech_to_text"] = self.whisper_service.verify_service_availability()
        except Exception as e:
            logger.error(f"Speech-to-Text ({self.provider}) unavailable: {str(e)}")

        try:
            self.translate_client.translate("test", target_language="en")
            status["translate"] = True
        except Exception as e:
            logger.error(f"Translate unavailable: {str(e)}")

        return status
