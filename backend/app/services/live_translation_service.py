"""
Live Translation Service
Real-time speech-to-text and translation for live streaming subtitles
"""
import logging
import time
from typing import AsyncIterator, Dict, Any
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import translate_v2 as translate

logger = logging.getLogger(__name__)

# Language code mapping for Google Speech-to-Text
LANGUAGE_CODES = {
    "he": "he-IL", "en": "en-US", "ar": "ar-IL",
    "es": "es-ES", "ru": "ru-RU", "fr": "fr-FR"
}


class LiveTranslationService:
    """Service for real-time audio transcription and translation."""

    def __init__(self):
        """Initialize Google Cloud clients."""
        try:
            self.speech_client = speech.SpeechClient()
            self.translate_client = translate.Client()
            logger.info("✅ LiveTranslationService initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Cloud: {str(e)}")
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
        """Transcribe audio stream to text in real-time."""
        try:
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
                        logger.debug(f"Transcribed: {transcript}")
                        yield transcript

        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
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

    def verify_service_availability(self) -> Dict[str, bool]:
        """Verify Google Cloud services are available."""
        status = {"speech_to_text": False, "translate": False}

        try:
            self.speech_client.list_models(parent="global")
            status["speech_to_text"] = True
        except Exception as e:
            logger.error(f"Speech-to-Text unavailable: {str(e)}")

        try:
            self.translate_client.translate("test", target_language="en")
            status["translate"] = True
        except Exception as e:
            logger.error(f"Translate unavailable: {str(e)}")

        return status
