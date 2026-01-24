"""
OpenAI Whisper Transcription Service
Real-time speech-to-text using OpenAI Whisper API
"""

import io
import logging
import struct
import wave
from typing import AsyncIterator, Optional

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Language code mapping for OpenAI Whisper
# Whisper uses ISO 639-1 codes (2-letter)
WHISPER_LANGUAGE_CODES = {
    "he": "he",  # Hebrew
    "en": "en",  # English
    "ar": "ar",  # Arabic
    "es": "es",  # Spanish
    "ru": "ru",  # Russian
    "fr": "fr",  # French
}


class WhisperTranscriptionService:
    """Service for real-time audio transcription using OpenAI Whisper."""

    def __init__(self):
        """Initialize OpenAI client."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("✅ WhisperTranscriptionService initialized")

    def _pcm_to_wav(
        self, pcm_data: bytes, sample_rate: int = 16000, channels: int = 1
    ) -> bytes:
        """
        Convert raw PCM audio data to WAV format.

        Args:
            pcm_data: Raw PCM audio bytes (16-bit signed integers)
            sample_rate: Sample rate in Hz (default: 16000)
            channels: Number of audio channels (default: 1 for mono)

        Returns:
            WAV-formatted audio bytes
        """
        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(2)  # 2 bytes = 16 bits
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)

        return wav_buffer.getvalue()

    async def transcribe_audio_chunk(
        self, audio_data: bytes, source_lang: str = "he", format: str = "wav"
    ) -> Optional[str]:
        """
        Transcribe a single audio chunk using Whisper API.

        Args:
            audio_data: Raw audio bytes (LINEAR16, 16kHz recommended)
            source_lang: Source language code (he, en, ar, es, ru, fr)
            format: Audio format (wav, mp3, webm, etc.)

        Returns:
            Transcribed text or None if empty/failed
        """
        try:
            # Convert language code to Whisper format
            lang_code = WHISPER_LANGUAGE_CODES.get(source_lang, source_lang)

            # Convert raw PCM to WAV format with proper headers
            wav_data = self._pcm_to_wav(audio_data, sample_rate=16000, channels=1)

            # Create file-like object from WAV data
            audio_file = io.BytesIO(wav_data)
            audio_file.name = "audio.wav"

            # Call Whisper API
            transcript = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=lang_code,
                response_format="text",
            )

            if transcript and transcript.strip():
                logger.info(f"📝 Whisper transcribed: {transcript}")
                return transcript.strip()

            return None

        except Exception as e:
            logger.error(f"Whisper transcription error: {str(e)}")
            return None

    async def transcribe_audio_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        source_lang: str = "he",
        chunk_duration_ms: int = 5000,
    ) -> AsyncIterator[str]:
        """
        Transcribe streaming audio in real-time.

        Note: OpenAI Whisper API doesn't support true streaming, so we buffer
        audio chunks and transcribe them in intervals for near-real-time results.

        Args:
            audio_stream: Iterator yielding audio chunks
            source_lang: Source language code
            chunk_duration_ms: Buffer duration before transcribing (milliseconds)

        Yields:
            Transcribed text segments
        """
        try:
            audio_buffer = bytearray()
            # Assuming 16kHz, mono, 16-bit (2 bytes per sample)
            # 5 seconds = 5000ms = 16000 samples/sec * 5 sec * 2 bytes = 160,000 bytes
            buffer_size_bytes = (16000 * chunk_duration_ms // 1000) * 2

            async for audio_chunk in audio_stream:
                audio_buffer.extend(audio_chunk)

                # When buffer reaches target size, transcribe it
                if len(audio_buffer) >= buffer_size_bytes:
                    transcript = await self.transcribe_audio_chunk(
                        bytes(audio_buffer), source_lang=source_lang, format="wav"
                    )

                    if transcript:
                        yield transcript

                    # Clear buffer for next chunk
                    audio_buffer.clear()

            # Process remaining buffer
            if len(audio_buffer) > 0:
                transcript = await self.transcribe_audio_chunk(
                    bytes(audio_buffer), source_lang=source_lang, format="wav"
                )
                if transcript:
                    yield transcript

        except Exception as e:
            logger.error(f"Whisper stream transcription error: {str(e)}")
            raise

    async def transcribe_audio_file(
        self, audio_path: str, language: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Transcribe an audio file using Whisper API with automatic language detection.

        Args:
            audio_path: Path to audio file (mp3, wav, m4a, etc.)
            language: Optional language code (if None, auto-detects)

        Returns:
            Tuple of (transcript text, detected language code)

        Raises:
            Exception: If transcription fails
        """
        try:
            logger.info(f"📝 Transcribing audio file: {audio_path}")

            # Read audio file
            with open(audio_path, "rb") as audio_file:
                # Call Whisper API with auto-detection or specified language
                if language:
                    lang_code = WHISPER_LANGUAGE_CODES.get(language, language)
                    transcript = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=lang_code,
                        response_format="verbose_json",  # Get language info
                    )
                else:
                    # Auto-detect language
                    transcript = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",  # Get language info
                    )

            # Extract text and language from response
            text = transcript.text
            detected_lang = transcript.language

            logger.info(
                f"✅ Transcribed {len(text)} characters, detected language: {detected_lang}"
            )

            return text, detected_lang

        except Exception as e:
            logger.error(f"❌ Whisper file transcription error: {str(e)}")
            raise

    def verify_service_availability(self) -> bool:
        """Verify OpenAI API is available."""
        try:
            # Simple check: API key is configured
            return bool(settings.OPENAI_API_KEY)
        except Exception as e:
            logger.error(f"Whisper service unavailable: {str(e)}")
            return False
