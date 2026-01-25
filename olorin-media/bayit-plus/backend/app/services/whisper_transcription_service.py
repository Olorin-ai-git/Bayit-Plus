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
        Handles large files by splitting them into chunks under 25MB.

        Args:
            audio_path: Path to audio file (mp3, wav, m4a, etc.)
            language: Optional language code (if None, auto-detects)

        Returns:
            Tuple of (transcript text, detected language code)

        Raises:
            Exception: If transcription fails
        """
        try:
            import os
            from pathlib import Path

            logger.info(f"📝 Transcribing audio file: {audio_path}")

            # Check if file exists
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            # Check file size
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            logger.info(f"   Original file size: {file_size_mb:.2f} MB")

            # Get file format info
            import subprocess
            try:
                probe_cmd = ["ffprobe", "-v", "error", "-show_format", "-show_streams", audio_path]
                probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
                logger.info(f"   File format info: {probe_result.stdout[:200]}...")
            except Exception as e:
                logger.warning(f"   Could not probe file format: {e}")

            # Whisper API has 25MB limit
            MAX_SIZE_MB = 24  # Use 24MB to be safe

            if file_size_mb > MAX_SIZE_MB:
                logger.info(
                    f"   File exceeds {MAX_SIZE_MB}MB limit, splitting into chunks..."
                )
                return await self._transcribe_large_file(audio_path, language)

            # Convert to wav format for better compatibility
            import subprocess
            import tempfile

            logger.info("   Converting audio to WAV format for better API compatibility...")

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                temp_wav_path = temp_wav.name

            try:
                # Convert to WAV using ffmpeg (16kHz mono for optimal Whisper performance)
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i", audio_path,
                    "-acodec", "pcm_s16le",  # 16-bit PCM
                    "-ar", "16000",           # 16kHz sample rate
                    "-ac", "1",               # Mono
                    "-y",                     # Overwrite
                    temp_wav_path
                ]

                result = subprocess.run(
                    ffmpeg_cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True
                )

                wav_size_mb = os.path.getsize(temp_wav_path) / (1024 * 1024)
                logger.info(f"   Converted to WAV: {wav_size_mb:.2f} MB")

                # If converted file is still too large, use chunking
                if wav_size_mb > MAX_SIZE_MB:
                    logger.info(f"   WAV file still exceeds {MAX_SIZE_MB}MB, using chunking...")
                    return await self._transcribe_large_file(temp_wav_path, language)

                # Transcribe the WAV file
                logger.info(f"   Sending WAV file to Whisper API...")
                logger.info(f"   WAV file path: {temp_wav_path}")

                try:
                    with open(temp_wav_path, "rb") as audio_file:
                        logger.info(f"   File opened, size: {os.path.getsize(temp_wav_path)} bytes")

                        if language:
                            lang_code = WHISPER_LANGUAGE_CODES.get(language, language)
                            logger.info(f"   Requesting transcription with language: {lang_code}")
                            transcript = await self.client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                language=lang_code,
                                response_format="verbose_json",
                            )
                        else:
                            logger.info(f"   Requesting transcription with auto-detection")
                            # Auto-detect language
                            transcript = await self.client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                response_format="verbose_json",
                            )

                        logger.info(f"   Transcription successful!")

                except Exception as api_error:
                    logger.error(f"   Whisper API error details:")
                    logger.error(f"     Error type: {type(api_error).__name__}")
                    logger.error(f"     Error message: {str(api_error)}")
                    if hasattr(api_error, 'response'):
                        logger.error(f"     Response: {api_error.response}")
                    raise
            finally:
                # Clean up temp WAV file
                if os.path.exists(temp_wav_path):
                    os.remove(temp_wav_path)

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

    async def _transcribe_large_file(
        self, audio_path: str, language: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Transcribe large audio files by splitting into chunks using ffmpeg.

        Args:
            audio_path: Path to audio file
            language: Optional language code

        Returns:
            Tuple of (combined transcript text, detected language code)
        """
        try:
            import os
            import subprocess
            import tempfile
            from pathlib import Path

            logger.info("   Splitting audio file using ffmpeg...")

            # Get audio duration using ffprobe
            duration_cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ]
            result = subprocess.run(duration_cmd, capture_output=True, text=True, check=True)
            total_duration = float(result.stdout.strip())

            # Split into 10-minute chunks (600 seconds)
            chunk_duration = 600  # 10 minutes
            num_chunks = int((total_duration + chunk_duration - 1) / chunk_duration)

            logger.info(f"   Audio duration: {total_duration:.1f}s")
            logger.info(f"   Splitting into {num_chunks} chunks of {chunk_duration}s each")

            # Transcribe each chunk
            transcripts = []
            detected_lang = None

            with tempfile.TemporaryDirectory() as temp_dir:
                for chunk_idx in range(num_chunks):
                    start_time = chunk_idx * chunk_duration
                    chunk_path = os.path.join(temp_dir, f"chunk_{chunk_idx}.mp3")

                    logger.info(f"   Creating chunk {chunk_idx + 1}/{num_chunks} (starting at {start_time}s)...")

                    # Use ffmpeg to extract chunk
                    ffmpeg_cmd = [
                        "ffmpeg",
                        "-i",
                        audio_path,
                        "-ss",
                        str(start_time),
                        "-t",
                        str(chunk_duration),
                        "-acodec",
                        "libmp3lame",
                        "-ab",
                        "128k",
                        "-y",  # Overwrite output file
                        chunk_path,
                    ]

                    subprocess.run(
                        ffmpeg_cmd,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=True
                    )

                    # Verify chunk was created and has reasonable size
                    if not os.path.exists(chunk_path):
                        logger.error(f"   Failed to create chunk {chunk_idx}")
                        continue

                    chunk_size_mb = os.path.getsize(chunk_path) / (1024 * 1024)
                    logger.info(f"   Chunk {chunk_idx + 1} size: {chunk_size_mb:.2f} MB")

                    # Transcribe chunk
                    logger.info(f"   Transcribing chunk {chunk_idx + 1}/{num_chunks}...")

                    with open(chunk_path, "rb") as chunk_file:
                        if language or detected_lang:
                            lang_code = WHISPER_LANGUAGE_CODES.get(
                                language or detected_lang, language or detected_lang
                            )
                            result = await self.client.audio.transcriptions.create(
                                model="whisper-1",
                                file=chunk_file,
                                language=lang_code,
                                response_format="verbose_json",
                            )
                        else:
                            result = await self.client.audio.transcriptions.create(
                                model="whisper-1",
                                file=chunk_file,
                                response_format="verbose_json",
                            )

                    transcripts.append(result.text)

                    # Use detected language from first chunk for subsequent chunks
                    if not detected_lang:
                        detected_lang = result.language
                        logger.info(f"   Detected language: {detected_lang}")

            # Combine all transcripts
            combined_text = " ".join(transcripts)
            logger.info(
                f"✅ Transcribed large file: {len(combined_text)} characters total"
            )

            return combined_text, detected_lang

        except subprocess.CalledProcessError as e:
            logger.error(f"❌ FFmpeg error: {e.stderr if e.stderr else str(e)}")
            raise
        except Exception as e:
            logger.error(f"❌ Large file transcription error: {str(e)}")
            raise

    def verify_service_availability(self) -> bool:
        """Verify OpenAI API is available."""
        try:
            # Simple check: API key is configured
            return bool(settings.OPENAI_API_KEY)
        except Exception as e:
            logger.error(f"Whisper service unavailable: {str(e)}")
            return False
