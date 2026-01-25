"""
Live Translation Service
Real-time speech-to-text and translation for live streaming subtitles
Supports Google Cloud, OpenAI Whisper, and ElevenLabs Scribe v2 for STT
Supports Google Translate, OpenAI, and Claude for translation
"""

import asyncio
import html
import logging
import os
import queue
import threading
import time
from typing import Any, AsyncIterator, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Set Google Cloud credentials from settings if not already in environment
if (
    not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    and settings.GOOGLE_APPLICATION_CREDENTIALS
):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = (
        settings.GOOGLE_APPLICATION_CREDENTIALS
    )
    logger.info(f"Set GOOGLE_APPLICATION_CREDENTIALS from settings")

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

try:
    from app.services.elevenlabs_realtime_service import \
        ElevenLabsRealtimeService

    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    logger.warning("ElevenLabs realtime service not available")

try:
    from anthropic import AsyncAnthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic library not available")

# Language code mapping for Google Speech-to-Text
LANGUAGE_CODES = {
    "he": "he-IL",
    "en": "en-US",
    "ar": "ar-IL",
    "es": "es-ES",
    "ru": "ru-RU",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "pt": "pt-PT",
    "yi": "yi",
}

# Maximum characters per subtitle line for readability
MAX_SUBTITLE_LENGTH = 80
# Preferred chunk length for splitting
PREFERRED_SUBTITLE_LENGTH = 60


def chunk_text_for_subtitles(
    text: str, max_length: int = MAX_SUBTITLE_LENGTH
) -> list[str]:
    """
    Split long text into smaller chunks suitable for subtitles.

    Splits at natural breakpoints (punctuation, then spaces) to maintain readability.
    Returns a list of text chunks, each under max_length characters.
    """
    if len(text) <= max_length:
        return [text]

    chunks = []
    remaining = text.strip()

    while remaining:
        if len(remaining) <= max_length:
            chunks.append(remaining)
            break

        # Find best split point within max_length
        split_point = max_length

        # Priority 1: Split at sentence-ending punctuation (. ! ?)
        for punct in [". ", "! ", "? ", "। ", "。", "؟ "]:
            pos = remaining.rfind(punct, 0, max_length)
            if pos > PREFERRED_SUBTITLE_LENGTH // 2:
                split_point = pos + len(punct)
                break
        else:
            # Priority 2: Split at comma or semicolon
            for punct in [", ", "; ", "، ", "、"]:
                pos = remaining.rfind(punct, 0, max_length)
                if pos > PREFERRED_SUBTITLE_LENGTH // 2:
                    split_point = pos + len(punct)
                    break
            else:
                # Priority 3: Split at space
                pos = remaining.rfind(" ", PREFERRED_SUBTITLE_LENGTH // 2, max_length)
                if pos > 0:
                    split_point = pos + 1
                # If no space found, just hard cut at max_length

        chunk = remaining[:split_point].strip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[split_point:].strip()

    return chunks


class LiveTranslationService:
    """Service for real-time audio transcription and translation."""

    def __init__(
        self, provider: Optional[str] = None, translation_provider: Optional[str] = None
    ):
        """
        Initialize transcription service with specified providers.

        Args:
            provider: STT provider - "google", "whisper", or "elevenlabs".
                     If None, uses SPEECH_TO_TEXT_PROVIDER from config.
            translation_provider: Translation provider - "google", "openai", or "claude".
                                 If None, uses LIVE_TRANSLATION_PROVIDER from config.
        """
        self.provider = provider or settings.SPEECH_TO_TEXT_PROVIDER
        self.translation_provider = (
            translation_provider or settings.LIVE_TRANSLATION_PROVIDER
        )

        # Service clients
        self.speech_client = None
        self.translate_client = None
        self.whisper_service = None
        self.openai_client = None
        self.elevenlabs_service = None
        self.anthropic_client = None

        logger.info(
            f"🔧 Initializing LiveTranslationService with STT: {self.provider}, "
            f"Translation: {self.translation_provider}"
        )

        try:
            # Initialize Speech-to-Text provider
            self._init_stt_provider()

            # Initialize Translation provider
            self._init_translation_provider()

        except ImportError as e:
            logger.error(f"❌ Import error - missing dependencies: {str(e)}")
            self._log_install_help()
            raise

        except Exception as e:
            logger.error(
                f"❌ Failed to initialize services: {type(e).__name__}: {str(e)}"
            )
            self._log_config_help(e)
            raise

    def _init_stt_provider(self) -> None:
        """Initialize the speech-to-text provider."""
        if self.provider == "google":
            if not GOOGLE_AVAILABLE:
                raise ImportError(
                    "Google Cloud libraries not installed. "
                    "Install: pip install google-cloud-speech google-cloud-translate"
                )

            logger.info("📡 Initializing Google Cloud Speech client...")
            self.speech_client = speech.SpeechClient()
            logger.info("✅ Google Cloud Speech-to-Text initialized")

        elif self.provider == "whisper":
            if not OPENAI_AVAILABLE:
                raise ImportError(
                    "OpenAI library not installed. Install: pip install openai"
                )

            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")

            logger.info("📡 Initializing OpenAI Whisper service...")
            from app.services.whisper_transcription_service import \
                WhisperTranscriptionService

            self.whisper_service = WhisperTranscriptionService()
            logger.info("✅ OpenAI Whisper initialized")

        elif self.provider == "elevenlabs":
            if not ELEVENLABS_AVAILABLE:
                raise ImportError(
                    "ElevenLabs realtime service not available. "
                    "Install: pip install websockets"
                )

            if not settings.ELEVENLABS_API_KEY:
                raise ValueError("ELEVENLABS_API_KEY not configured")

            logger.info("📡 Initializing ElevenLabs Scribe v2 realtime service...")
            self.elevenlabs_service = ElevenLabsRealtimeService()
            logger.info("✅ ElevenLabs Scribe v2 initialized (~150ms latency)")

        else:
            raise ValueError(
                f"Invalid STT provider: {self.provider}. "
                "Must be 'google', 'whisper', or 'elevenlabs'"
            )

    def _init_translation_provider(self) -> None:
        """Initialize the translation provider."""
        if self.translation_provider == "google":
            if not GOOGLE_AVAILABLE:
                raise ImportError(
                    "Google Cloud Translate not installed. "
                    "Install: pip install google-cloud-translate"
                )

            logger.info("📡 Initializing Google Cloud Translate client...")
            self.translate_client = translate.Client()
            logger.info("✅ Google Cloud Translate initialized")

        elif self.translation_provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError(
                    "OpenAI library not installed. Install: pip install openai"
                )

            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")

            logger.info("📡 Initializing OpenAI client for translation...")
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("✅ OpenAI translation initialized (GPT-4o-mini)")

        elif self.translation_provider == "claude":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError(
                    "Anthropic library not installed. Install: pip install anthropic"
                )

            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")

            logger.info("📡 Initializing Anthropic client for translation...")
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("✅ Claude translation initialized")

        else:
            raise ValueError(
                f"Invalid translation provider: {self.translation_provider}. "
                "Must be 'google', 'openai', or 'claude'"
            )

    def _log_install_help(self) -> None:
        """Log installation help based on provider configuration."""
        if self.provider == "google" or self.translation_provider == "google":
            logger.error(
                "💡 Install Google Cloud packages: "
                "pip install google-cloud-speech google-cloud-translate"
            )
        if self.provider == "whisper" or self.translation_provider == "openai":
            logger.error("💡 Install OpenAI package: pip install openai")
        if self.provider == "elevenlabs":
            logger.error("💡 Install websockets package: pip install websockets")
        if self.translation_provider == "claude":
            logger.error("💡 Install Anthropic package: pip install anthropic")

    def _log_config_help(self, error: Exception) -> None:
        """Log configuration help based on error."""
        error_str = str(error).lower()
        if "credentials" in error_str or "authentication" in error_str:
            logger.error(
                "💡 Set GOOGLE_APPLICATION_CREDENTIALS environment variable "
                "to your service account JSON file"
            )
        elif "openai_api_key" in error_str:
            logger.error(
                "💡 Set OPENAI_API_KEY environment variable or add to .env file"
            )
        elif "elevenlabs_api_key" in error_str:
            logger.error(
                "💡 Set ELEVENLABS_API_KEY environment variable or add to .env file"
            )
        elif "anthropic_api_key" in error_str:
            logger.error(
                "💡 Set ANTHROPIC_API_KEY environment variable or add to .env file"
            )

    def get_recognition_config(
        self, source_lang: str = "he"
    ) -> speech.StreamingRecognitionConfig:
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
        self, audio_stream: AsyncIterator[bytes], source_lang: str = "he"
    ) -> AsyncIterator[str]:
        """
        Transcribe audio stream to text in real-time.
        Uses configured STT provider (Google Cloud, OpenAI Whisper, or ElevenLabs).
        """
        try:
            if self.provider == "google":
                # Google Cloud Speech-to-Text (streaming with async/sync bridge)
                streaming_config = self.get_recognition_config(source_lang)
                logger.info(
                    f"🎤 Starting Google Speech-to-Text stream for language: {source_lang}"
                )

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
                        logger.info("✅ Audio collection finished")

                def sync_recognition_worker():
                    """Run synchronous Google Speech API in separate thread."""
                    logger.info("🔊 Starting Google Speech recognition worker...")

                    def request_generator():
                        """Generate requests for Google Speech API."""
                        yield speech.StreamingRecognizeRequest(
                            streaming_config=streaming_config
                        )

                        while not done_receiving.is_set() or not audio_queue.empty():
                            try:
                                # Use timeout to periodically check done flag
                                audio_chunk = audio_queue.get(timeout=0.1)
                                yield speech.StreamingRecognizeRequest(
                                    audio_content=audio_chunk
                                )
                            except queue.Empty:
                                if done_receiving.is_set() and audio_queue.empty():
                                    break
                                continue

                    try:
                        responses = self.speech_client.streaming_recognize(
                            request_generator()
                        )
                        for response in responses:
                            if response.results and response.results[0].is_final:
                                if response.results[0].alternatives:
                                    transcript = (
                                        response.results[0].alternatives[0].transcript
                                    )
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
                    audio_stream, source_lang=source_lang
                ):
                    logger.debug(f"Whisper transcribed: {transcript}")
                    yield transcript

            elif self.provider == "elevenlabs":
                # ElevenLabs Scribe v2 (true realtime WebSocket streaming)
                # Use Hebrew as primary language hint to avoid misdetection issues
                # (Arabic was being confused with Amharic in auto-detect mode)
                logger.info(
                    f"🎤 Starting ElevenLabs Scribe v2 realtime stream "
                    f"(Hebrew mode, ~150ms latency)"
                )
                async for (
                    transcript,
                    detected_lang,
                ) in self.elevenlabs_service.transcribe_audio_stream(
                    audio_stream,
                    source_lang="he",  # Use Hebrew hint - more reliable than auto-detect
                ):
                    logger.info(
                        f"📝 ElevenLabs transcribed [{detected_lang}]: {transcript}"
                    )
                    # Yield tuple with detected language for translation pipeline
                    yield (transcript, detected_lang)

        except Exception as e:
            logger.error(f"Transcription error ({self.provider}): {str(e)}")
            raise

    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        timeout_seconds: float = 0.250,
    ) -> str:
        """
        Translate text using configured translation provider.

        Supports: Google Cloud Translate, OpenAI GPT-4o-mini, or Claude.

        Args:
            text: Text to translate
            source_lang: Source language code (e.g., "he")
            target_lang: Target language code (e.g., "en")
            timeout_seconds: Timeout for translation (default 250ms for live dubbing)

        Returns:
            Translated text, or original text if translation times out or fails
        """
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
            "yi": "Yiddish",
        }

        source_name = language_names.get(source_lang, source_lang)
        target_name = language_names.get(target_lang, target_lang)

        try:
            if self.translation_provider == "google" and self.translate_client:
                # Google Cloud Translate (synchronous, fast - no timeout needed)
                result = self.translate_client.translate(
                    text, source_language=source_lang, target_language=target_lang
                )
                # Decode HTML entities (Google Translate returns &#39; for apostrophes, etc.)
                translated = html.unescape(result["translatedText"])
                logger.debug(f"Google Translate: {text} → {translated}")
                return translated

            elif self.translation_provider == "openai" and self.openai_client:
                # OpenAI GPT-4o-mini translation (async with timeout for live dubbing)
                try:
                    response = await asyncio.wait_for(
                        self.openai_client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {
                                    "role": "system",
                                    "content": (
                                        f"You are a professional translator. "
                                        f"Translate the following text from {source_name} to {target_name}. "
                                        f"Return ONLY the translated text, nothing else."
                                    ),
                                },
                                {"role": "user", "content": text},
                            ],
                            temperature=0.3,
                            max_tokens=500,
                        ),
                        timeout=timeout_seconds,
                    )

                    translated = response.choices[0].message.content.strip()
                    logger.debug(f"OpenAI Translate: {text} → {translated}")
                    return translated
                except asyncio.TimeoutError:
                    logger.warning(
                        f"OpenAI translation timeout after {timeout_seconds*1000:.0f}ms, returning original"
                    )
                    return text

            elif self.translation_provider == "claude" and self.anthropic_client:
                # Claude translation (async with timeout for live dubbing)
                try:
                    response = await asyncio.wait_for(
                        self.anthropic_client.messages.create(
                            model=settings.CLAUDE_MODEL,
                            max_tokens=500,
                            messages=[
                                {
                                    "role": "user",
                                    "content": (
                                        f"Translate the following text from {source_name} to {target_name}. "
                                        f"Return ONLY the translated text, nothing else.\n\n"
                                        f"Text to translate: {text}"
                                    ),
                                }
                            ],
                        ),
                        timeout=timeout_seconds,
                    )

                    translated = response.content[0].text.strip()
                    logger.debug(f"Claude Translate: {text} → {translated}")
                    return translated
                except asyncio.TimeoutError:
                    logger.warning(
                        f"Claude translation timeout after {timeout_seconds*1000:.0f}ms, returning original"
                    )
                    return text

            else:
                logger.warning(
                    f"No translation client available for provider: {self.translation_provider}"
                )
                return text

        except Exception as e:
            logger.error(f"Translation error ({self.translation_provider}): {str(e)}")
            return text

    async def process_live_audio_to_subtitles(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str,
        target_lang: str,
        start_timestamp: float = 0.0,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Complete pipeline: Audio → Transcription → Translation → Subtitle cues.

        For ElevenLabs provider, uses auto-detected language for translation.
        For other providers, uses the configured source_lang.

        Yields subtitle cues with format:
        {"text": "...", "original_text": "...", "timestamp": 123.45, ...}
        """
        session_start = time.time()

        try:
            async for result in self.transcribe_audio_stream(audio_stream, source_lang):
                # Handle different result formats:
                # - ElevenLabs: tuple of (transcript, detected_lang)
                # - Google/Whisper: just transcript string
                if isinstance(result, tuple):
                    transcript, detected_lang = result
                    # Use auto-detected language for translation
                    actual_source_lang = (
                        detected_lang if detected_lang != "auto" else source_lang
                    )
                else:
                    transcript = result
                    actual_source_lang = source_lang

                if not transcript.strip():
                    continue

                # Translate (skip if same language)
                if actual_source_lang == target_lang:
                    translated = transcript
                else:
                    translated = await self.translate_text(
                        transcript, actual_source_lang, target_lang
                    )
                    logger.info(
                        f"🌍 Translated [{actual_source_lang}→{target_lang}]: {translated[:50]}..."
                    )

                # Calculate base timestamp
                current_time = time.time() - session_start + start_timestamp

                # Chunk long transcripts for better subtitle readability
                # This prevents large blocks of text from appearing all at once
                translated_chunks = chunk_text_for_subtitles(translated)
                original_chunks = chunk_text_for_subtitles(transcript)

                # Yield each chunk as a separate subtitle cue with slight time offset
                for i, trans_chunk in enumerate(translated_chunks):
                    orig_chunk = original_chunks[i] if i < len(original_chunks) else ""
                    # Stagger chunks by 0.3 seconds each for natural reading
                    chunk_timestamp = current_time + (i * 0.3)

                    yield {
                        "text": trans_chunk,
                        "original_text": orig_chunk,
                        "timestamp": chunk_timestamp,
                        "source_lang": actual_source_lang,
                        "target_lang": target_lang,
                        "confidence": 0.95,
                        "chunk_index": i,
                        "total_chunks": len(translated_chunks),
                    }

        except Exception as e:
            logger.error(f"Live subtitle pipeline error: {str(e)}")
            raise

    def verify_service_availability(self) -> Dict[str, Any]:
        """Verify transcription and translation services are available."""
        status = {
            "speech_to_text": False,
            "translate": False,
            "stt_provider": self.provider,
            "translation_provider": self.translation_provider,
        }

        # Check STT provider
        try:
            if self.provider == "google":
                self.speech_client.list_models(parent="global")
                status["speech_to_text"] = True
            elif self.provider == "whisper":
                status["speech_to_text"] = (
                    self.whisper_service.verify_service_availability()
                )
            elif self.provider == "elevenlabs":
                status["speech_to_text"] = (
                    self.elevenlabs_service.verify_service_availability()
                )
        except Exception as e:
            logger.error(f"Speech-to-Text ({self.provider}) unavailable: {str(e)}")

        # Check translation provider
        try:
            if self.translation_provider == "google" and self.translate_client:
                self.translate_client.translate("test", target_language="en")
                status["translate"] = True
            elif self.translation_provider == "openai" and self.openai_client:
                # OpenAI client is already initialized, just check it exists
                status["translate"] = True
            elif self.translation_provider == "claude" and self.anthropic_client:
                # Anthropic client is already initialized, just check it exists
                status["translate"] = True
        except Exception as e:
            logger.error(
                f"Translate ({self.translation_provider}) unavailable: {str(e)}"
            )

        return status
