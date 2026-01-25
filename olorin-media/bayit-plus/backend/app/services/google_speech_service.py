"""
Google Cloud Speech-to-Text Service
Alternative to OpenAI Whisper for audio transcription
"""

import logging
import os
import subprocess
import tempfile
from typing import Optional, Tuple

from google.cloud import speech_v1 as speech
from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleSpeechService:
    """Google Cloud Speech-to-Text transcription service"""

    def __init__(self):
        """Initialize Google Speech client"""
        self.client = speech.SpeechClient()

    async def transcribe_audio_file(
        self, audio_path: str, language: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Transcribe an audio file using Google Cloud Speech-to-Text.

        Args:
            audio_path: Path to audio file
            language: Optional language code (e.g., "en-US", "he-IL")

        Returns:
            Tuple of (transcript text, detected language code)
        """
        try:
            logger.info(f"📝 Transcribing audio file with Google Speech: {audio_path}")

            # Check if file exists
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            # Get file size
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            logger.info(f"   File size: {file_size_mb:.2f} MB")

            # Convert to FLAC for best Google Speech results
            logger.info("   Converting to FLAC format...")
            with tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as temp_flac:
                flac_path = temp_flac.name

            try:
                # Convert to FLAC (16kHz mono for optimal performance)
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i", audio_path,
                    "-acodec", "flac",
                    "-ar", "16000",  # 16kHz sample rate
                    "-ac", "1",      # Mono
                    "-y",
                    flac_path
                ]

                subprocess.run(
                    ffmpeg_cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True
                )

                flac_size_mb = os.path.getsize(flac_path) / (1024 * 1024)
                logger.info(f"   Converted to FLAC: {flac_size_mb:.2f} MB")

                # Check audio duration using FFprobe
                try:
                    duration_cmd = [
                        "ffprobe",
                        "-v", "error",
                        "-show_entries", "format=duration",
                        "-of", "default=noprint_wrappers=1:nokey=1",
                        flac_path
                    ]
                    duration_output = subprocess.check_output(duration_cmd, text=True)
                    duration_seconds = float(duration_output.strip())
                    logger.info(f"   Audio duration: {duration_seconds:.1f} seconds")
                except Exception as e:
                    logger.warning(f"   Could not determine duration: {e}, assuming long audio")
                    duration_seconds = 120  # Assume >1min if can't determine

                # For files >1 minute or >10MB, use long-running recognition
                # Google's sync API has a 1-minute limit regardless of file size
                if flac_size_mb > 10 or duration_seconds > 60:
                    logger.info("   File duration >1 min or size >10MB, using long audio transcription...")
                    return await self._transcribe_long_audio(flac_path, language)

                # For small files, use synchronous recognition
                logger.info("   Using synchronous transcription...")

                # Read audio file
                with open(flac_path, "rb") as audio_file:
                    content = audio_file.read()

                # Configure recognition
                audio = speech.RecognitionAudio(content=content)

                # Set language (default to English if not specified)
                lang_code = language or "en-US"
                if language == "en":
                    lang_code = "en-US"
                elif language == "he":
                    lang_code = "he-IL"

                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
                    sample_rate_hertz=16000,
                    language_code=lang_code,
                    enable_automatic_punctuation=True,
                    model="default",  # Use latest model
                )

                # Perform transcription
                logger.info(f"   Sending to Google Speech API (language: {lang_code})...")
                response = self.client.recognize(config=config, audio=audio)

                # Combine all results
                transcript_parts = []
                for result in response.results:
                    if result.alternatives:
                        transcript_parts.append(result.alternatives[0].transcript)

                transcript = " ".join(transcript_parts)

                logger.info(f"✅ Transcription complete: {len(transcript)} characters")

                return transcript, lang_code

            finally:
                # Clean up temp FLAC file
                if os.path.exists(flac_path):
                    os.remove(flac_path)

        except Exception as e:
            logger.error(f"❌ Google Speech transcription error: {str(e)}")
            raise

    async def _transcribe_long_audio(
        self, audio_path: str, language: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Transcribe long audio files using Google Cloud Storage.

        For files >10MB, we need to upload to GCS and use long-running recognition.

        Args:
            audio_path: Path to audio file (should be FLAC)
            language: Optional language code

        Returns:
            Tuple of (transcript text, detected language code)
        """
        from google.cloud import storage
        import time

        try:
            # Upload to GCS
            logger.info("   Uploading to Google Cloud Storage...")

            storage_client = storage.Client()
            bucket_name = settings.GCS_BUCKET_NAME

            # Generate unique filename
            filename = f"transcription-temp/{os.path.basename(audio_path)}-{int(time.time())}.flac"

            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(filename)

            blob.upload_from_filename(audio_path)
            gcs_uri = f"gs://{bucket_name}/{filename}"

            logger.info(f"   Uploaded to: {gcs_uri}")

            # Configure long-running recognition
            lang_code = language or "en-US"
            if language == "en":
                lang_code = "en-US"
            elif language == "he":
                lang_code = "he-IL"

            audio = speech.RecognitionAudio(uri=gcs_uri)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
                sample_rate_hertz=16000,
                language_code=lang_code,
                enable_automatic_punctuation=True,
                model="default",
            )

            # Start long-running operation
            logger.info("   Starting long-running transcription...")
            operation = self.client.long_running_recognize(config=config, audio=audio)

            # Wait for completion
            logger.info("   Waiting for transcription to complete...")
            response = operation.result(timeout=1800)  # 30 minute timeout (for long podcast episodes)

            # Combine all results
            transcript_parts = []
            for result in response.results:
                if result.alternatives:
                    transcript_parts.append(result.alternatives[0].transcript)

            transcript = " ".join(transcript_parts)

            logger.info(f"✅ Long audio transcription complete: {len(transcript)} characters")

            # Clean up GCS file
            try:
                blob.delete()
                logger.info("   Cleaned up GCS temporary file")
            except Exception as cleanup_error:
                logger.warning(f"   Failed to delete temp GCS file: {cleanup_error}")

            return transcript, lang_code

        except Exception as e:
            logger.error(f"❌ Long audio transcription error: {str(e)}")
            raise
