"""
Live Translation Service
Real-time speech-to-text and translation for live streaming subtitles
Supports both Google Cloud Speech-to-Text and OpenAI Whisper
"""
import logging
import time
import asyncio
import queue
import threading
from typing import AsyncIterator, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Conditional imports based on provider
try:
    from google.cloud import speech_v1p1beta1 as speech
    from google.cloud import translate_v2 as translate
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("Google Cloud libraries not available")

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available")

# Language code mapping for Google Speech-to-Text
LANGUAGE_CODES = {
    "he": "he-IL", "en": "en-US", "ar": "ar-IL",
    "es": "es-ES", "ru": "ru-RU", "fr": "fr-FR",
    "de": "de-DE", "it": "it-IT", "pt": "pt-PT", "yi": "yi"
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
        self.openai_client = None

        logger.info(f"🔧 Initializing LiveTranslationService with provider: {self.provider}")

        try:
            if self.provider == "google":
                if not GOOGLE_AVAILABLE:
                    raise ImportError("Google Cloud libraries not installed. Install: pip install google-cloud-speech google-cloud-translate")

                logger.info("📡 Attempting to initialize Google Cloud Speech client...")
                self.speech_client = speech.SpeechClient()
                logger.info("📡 Attempting to initialize Google Cloud Translate client...")
                self.translate_client = translate.Client()
                logger.info("✅ LiveTranslationService initialized with Google Cloud Speech-to-Text")

            elif self.provider == "whisper":
                if not OPENAI_AVAILABLE:
                    raise ImportError("OpenAI library not installed. Install: pip install openai")

                if not settings.OPENAI_API_KEY:
                    raise ValueError("OPENAI_API_KEY not configured")

                logger.info("📡 Attempting to initialize OpenAI Whisper service...")
                from app.services.whisper_transcription_service import WhisperTranscriptionService
                self.whisper_service = WhisperTranscriptionService()

                logger.info("📡 Attempting to initialize OpenAI client for translation...")
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("✅ LiveTranslationService initialized with OpenAI Whisper + OpenAI Translation")

            else:
                raise ValueError(f"Invalid speech provider: {self.provider}. Must be 'google' or 'whisper'")

        except ImportError as e:
            logger.error(f"❌ Import error - missing dependencies for {self.provider}: {str(e)}")
            if self.provider == "google":
                logger.error("💡 Install required packages: pip install google-cloud-speech google-cloud-translate")
            elif self.provider == "whisper":
                logger.error("💡 Install required packages: pip install openai")
            raise

        except Exception as e:
            logger.error(f"❌ Failed to initialize {self.provider} service: {type(e).__name__}: {str(e)}")
            if "credentials" in str(e).lower() or "authentication" in str(e).lower():
                logger.error("💡 Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON file")
            elif "OPENAI_API_KEY" in str(e):
                logger.error("💡 Set OPENAI_API_KEY environment variable or add to .env file")
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
                # Google Cloud Speech-to-Text (streaming with async/sync bridge)
                streaming_config = self.get_recognition_config(source_lang)
                logger.info(f"🎤 Starting Google Speech-to-Text stream for language: {source_lang}")

                # Use thread-safe queues to bridge async audio stream with sync Google API
                audio_queue = queue.Queue()
                transcript_queue = queue.Queue()
                done_receiving = threading.Event()
                done_processing = threading.Event()

                async def audio_collector():
                    """Collect audio chunks from async stream into thread-safe queue."""
                    try:
                        chunk_count = 0
                        async for audio_chunk in audio_stream:
                            audio_queue.put(audio_chunk)
                            chunk_count += 1
                            if chunk_count % 100 == 0:
                                logger.debug(f"📦 Collected {chunk_count} audio chunks")
                    except Exception as e:
                        logger.error(f"❌ Error collecting audio: {str(e)}")
                    finally:
                        done_receiving.set()
                        logger.info(f"✅ Audio collection finished")

                def sync_recognition_worker():
                    """Run synchronous Google Speech API in separate thread."""
                    logger.info("🔊 Starting Google Speech recognition worker...")

                    def request_generator():
                        """Generate requests for Google Speech API."""
                        yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)

                        while not done_receiving.is_set() or not audio_queue.empty():
                            try:
                                # Use timeout to periodically check done flag
                                audio_chunk = audio_queue.get(timeout=0.1)
                                yield speech.StreamingRecognizeRequest(audio_content=audio_chunk)
                            except queue.Empty:
                                if done_receiving.is_set() and audio_queue.empty():
                                    break
                                continue

                    try:
                        responses = self.speech_client.streaming_recognize(request_generator())
                        for response in responses:
                            if response.results and response.results[0].is_final:
                                if response.results[0].alternatives:
                                    transcript = response.results[0].alternatives[0].transcript
                                    logger.info(f"📝 Google transcribed: {transcript}")
                                    # Put transcript into queue for async consumer
                                    transcript_queue.put(transcript)
                    except Exception as e:
                        logger.error(f"❌ Google Speech recognition error: {str(e)}")
                    finally:
                        done_processing.set()
                        logger.info("✅ Recognition worker finished")

                # Start audio collection task
                collector_task = asyncio.create_task(audio_collector())

                # Start recognition worker in thread pool
                loop = asyncio.get_event_loop()
                recognition_task = loop.run_in_executor(None, sync_recognition_worker)

                # Yield transcripts as they arrive
                try:
                    while not done_processing.is_set() or not transcript_queue.empty():
                        try:
                            # Check queue with timeout to avoid blocking
                            transcript = await loop.run_in_executor(
                                None, lambda: transcript_queue.get(timeout=0.5)
                            )
                            yield transcript
                        except queue.Empty:
                            # Check if we're done
                            if done_processing.is_set() and transcript_queue.empty():
                                break
                            continue
                        except Exception as e:
                            logger.error(f"❌ Error getting transcript: {str(e)}")
                            break
                except Exception as e:
                    logger.error(f"❌ Error yielding transcripts: {str(e)}")

                # Wait for both tasks to complete
                await collector_task
                await recognition_task
                logger.info("✅ Transcription stream completed")

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
        """Translate text using configured provider (Google or OpenAI)."""
        try:
            if self.provider == "google" and self.translate_client:
                # Google Cloud Translate (synchronous)
                result = self.translate_client.translate(
                    text, source_language=source_lang, target_language=target_lang
                )
                translated = result['translatedText']
                logger.debug(f"Google Translate: {text} → {translated}")
                return translated

            elif self.provider == "whisper" and self.openai_client:
                # OpenAI GPT-based translation (async)
                language_names = {
                    "he": "Hebrew",
                    "en": "English",
                    "ar": "Arabic",
                    "es": "Spanish",
                    "ru": "Russian",
                    "fr": "French",
                    "de": "German",
                    "it": "Italian",
                    "pt": "Portuguese",
                    "yi": "Yiddish"
                }

                source_name = language_names.get(source_lang, source_lang)
                target_name = language_names.get(target_lang, target_lang)

                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": f"You are a professional translator. Translate the following text from {source_name} to {target_name}. Return ONLY the translated text, nothing else."
                        },
                        {
                            "role": "user",
                            "content": text
                        }
                    ],
                    temperature=0.3,
                    max_tokens=500
                )

                translated = response.choices[0].message.content.strip()
                logger.debug(f"OpenAI Translate: {text} → {translated}")
                return translated

            else:
                logger.warning(f"No translation client available for provider: {self.provider}")
                return text

        except Exception as e:
            logger.error(f"Translation error ({self.provider}): {str(e)}")
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
            if self.provider == "google" and self.translate_client:
                self.translate_client.translate("test", target_language="en")
                status["translate"] = True
            elif self.provider == "whisper" and self.openai_client:
                # OpenAI client is already initialized, just check it exists
                status["translate"] = True
        except Exception as e:
            logger.error(f"Translate unavailable: {str(e)}")

        return status
