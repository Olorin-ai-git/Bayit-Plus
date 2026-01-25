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
                    "-i",
                    audio_path,
                    "-acodec",
                    "flac",
                    "-ar",
                    "16000",  # 16kHz sample rate
                    "-ac",
                    "1",  # Mono
                    "-y",
                    flac_path,
                ]

                subprocess.run(
                    ffmpeg_cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )

                flac_size_mb = os.path.getsize(flac_path) / (1024 * 1024)
                logger.info(f"   Converted to FLAC: {flac_size_mb:.2f} MB")

                # Check audio duration using FFprobe
                try:
                    duration_cmd = [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "default=noprint_wrappers=1:nokey=1",
                        flac_path,
                    ]
                    duration_output = subprocess.check_output(duration_cmd, text=True)
                    duration_seconds = float(duration_output.strip())
                    logger.info(f"   Audio duration: {duration_seconds:.1f} seconds")
                except Exception as e:
                    logger.warning(
                        f"   Could not determine duration: {e}, assuming long audio"
                    )
                    duration_seconds = 120  # Assume >1min if can't determine

                # For files >1 minute or >10MB, use long-running recognition
                # Google's sync API has a 1-minute limit regardless of file size
                if flac_size_mb > 10 or duration_seconds > 60:
                    logger.info(
                        "   File duration >1 min or size >10MB, using long audio transcription..."
                    )
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
                logger.info(
                    f"   Sending to Google Speech API (language: {lang_code})..."
                )
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

    async def transcribe_with_speaker_diarization(
        self,
        audio_path: str,
        language: Optional[str] = None,
        min_speakers: int = 1,
        max_speakers: int = 6,
    ) -> dict:
        """
        Transcribe audio with speaker diarization using Google Cloud Speech-to-Text.

        Args:
            audio_path: Path to audio file (vocals only recommended)
            language: Optional language code (e.g., "en-US", "he-IL")
            min_speakers: Minimum number of speakers to detect
            max_speakers: Maximum number of speakers to detect

        Returns:
            Dictionary with:
            {
                "transcript": "full transcript text",
                "language": "detected language code",
                "speakers": [
                    {
                        "speaker_id": "SPEAKER_00",
                        "text": "segment text",
                        "start_time": 0.0,
                        "end_time": 5.2
                    },
                    ...
                ]
            }
        """
        try:
            logger.info(f"📝 Transcribing with speaker diarization: {audio_path}")
            logger.info(f"   Detecting {min_speakers}-{max_speakers} speakers")

            # Convert to FLAC
            with tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as temp_flac:
                flac_path = temp_flac.name

            try:
                # Convert to FLAC
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i",
                    audio_path,
                    "-acodec",
                    "flac",
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-y",
                    flac_path,
                ]
                subprocess.run(
                    ffmpeg_cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )

                # Check duration
                duration_cmd = [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    flac_path,
                ]
                duration_output = subprocess.check_output(duration_cmd, text=True)
                duration_seconds = float(duration_output.strip())

                logger.info(f"   Audio duration: {duration_seconds:.1f} seconds")

                # Use long-running recognition for speaker diarization
                return await self._transcribe_long_audio_with_diarization(
                    flac_path, language, min_speakers, max_speakers
                )

            finally:
                if os.path.exists(flac_path):
                    os.remove(flac_path)

        except Exception as e:
            logger.error(f"❌ Speaker diarization error: {str(e)}")
            raise

    async def _transcribe_long_audio_with_diarization(
        self,
        audio_path: str,
        language: Optional[str] = None,
        min_speakers: int = 1,
        max_speakers: int = 6,
    ) -> dict:
        """
        Transcribe with speaker diarization using GCS and long-running recognition.

        Args:
            audio_path: Path to FLAC audio file
            language: Optional language code
            min_speakers: Minimum number of speakers
            max_speakers: Maximum number of speakers

        Returns:
            Dictionary with transcript, language, and speaker segments
        """
        import time

        from google.cloud import storage

        try:
            # Upload to GCS
            logger.info("   Uploading to Google Cloud Storage...")

            storage_client = storage.Client()
            bucket_name = settings.GCS_BUCKET_NAME

            filename = f"transcription-temp/{os.path.basename(audio_path)}-{int(time.time())}.flac"

            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(filename)
            blob.upload_from_filename(audio_path)
            gcs_uri = f"gs://{bucket_name}/{filename}"

            logger.info(f"   Uploaded to: {gcs_uri}")

            # Configure with speaker diarization
            lang_code = language or "en-US"
            if language == "en":
                lang_code = "en-US"
            elif language == "he":
                lang_code = "he-IL"

            audio = speech.RecognitionAudio(uri=gcs_uri)

            # Enable speaker diarization
            diarization_config = speech.SpeakerDiarizationConfig(
                enable_speaker_diarization=True,
                min_speaker_count=min_speakers,
                max_speaker_count=max_speakers,
            )

            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
                sample_rate_hertz=16000,
                language_code=lang_code,
                enable_automatic_punctuation=True,
                enable_word_time_offsets=True,  # Required for speaker segments
                diarization_config=diarization_config,
                model="default",
            )

            # Start long-running operation
            logger.info("   Starting transcription with speaker diarization...")
            operation = self.client.long_running_recognize(config=config, audio=audio)

            # Wait for completion
            logger.info("   Waiting for completion...")
            response = operation.result(timeout=1800)

            # Extract transcript and speaker segments
            full_transcript = []
            speaker_segments = []
            current_speaker = None
            current_text = []
            current_start = None
            current_end = None

            for result in response.results:
                if not result.alternatives:
                    continue

                alternative = result.alternatives[0]

                # Build full transcript
                full_transcript.append(alternative.transcript)

                # Extract speaker-labeled words
                for word_info in alternative.words:
                    word = word_info.word
                    speaker_tag = word_info.speaker_tag
                    start_time = word_info.start_time.total_seconds()
                    end_time = word_info.end_time.total_seconds()

                    speaker_id = f"SPEAKER_{speaker_tag:02d}"

                    # If speaker changed, save previous segment
                    if current_speaker and current_speaker != speaker_id:
                        speaker_segments.append(
                            {
                                "speaker_id": current_speaker,
                                "text": " ".join(current_text),
                                "start_time": current_start,
                                "end_time": current_end,
                            }
                        )
                        current_text = []
                        current_start = None

                    # Update current segment
                    current_speaker = speaker_id
                    current_text.append(word)
                    if current_start is None:
                        current_start = start_time
                    current_end = end_time

            # Save last segment
            if current_speaker and current_text:
                speaker_segments.append(
                    {
                        "speaker_id": current_speaker,
                        "text": " ".join(current_text),
                        "start_time": current_start,
                        "end_time": current_end,
                    }
                )

            transcript = " ".join(full_transcript)

            # Log results
            speakers = set(seg["speaker_id"] for seg in speaker_segments)
            logger.info(f"✅ Detected {len(speakers)} speaker(s): {sorted(speakers)}")
            for speaker in sorted(speakers):
                speaker_segs = [s for s in speaker_segments if s["speaker_id"] == speaker]
                total_time = sum(s["end_time"] - s["start_time"] for s in speaker_segs)
                logger.info(
                    f"   {speaker}: {len(speaker_segs)} segments, {total_time:.1f}s total"
                )

            # Clean up GCS file
            try:
                blob.delete()
                logger.info("   Cleaned up GCS temporary file")
            except Exception as cleanup_error:
                logger.warning(f"   Failed to delete temp GCS file: {cleanup_error}")

            return {
                "transcript": transcript,
                "language": lang_code,
                "speakers": speaker_segments,
            }

        except Exception as e:
            logger.error(f"❌ Speaker diarization error: {str(e)}")
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
        import time

        from google.cloud import storage

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
            response = operation.result(
                timeout=1800
            )  # 30 minute timeout (for long podcast episodes)

            # Combine all results
            transcript_parts = []
            for result in response.results:
                if result.alternatives:
                    transcript_parts.append(result.alternatives[0].transcript)

            transcript = " ".join(transcript_parts)

            logger.info(
                f"✅ Long audio transcription complete: {len(transcript)} characters"
            )

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
