"""
Podcast Translation Service
Orchestrates the complete podcast translation pipeline using Whisper STT on original audio.
Supports resuming from previously completed stages.

Pipeline: Download → Trim → Transcribe (Whisper) → Remove Commercials → Translate → TTS → Upload
Note: Vocal separation SKIPPED - degrades transcription quality
Note: Commercials automatically detected and removed before translation
"""

import asyncio
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse

import httpx
from anthropic import AsyncAnthropic

from app.core.config import settings
from app.core.storage import StorageService
from app.models.content import PodcastEpisode
from app.services.audio_processing_service import AudioProcessingService
from app.services.elevenlabs_tts_streaming_service import \
    ElevenLabsTTSStreamingService
from app.services.google_speech_service import GoogleSpeechService
from app.services.google_tts_service import GoogleTTSService
from app.services.olorin.dubbing.translation import TranslationProvider
from app.services.whisper_transcription_service import \
    WhisperTranscriptionService

logger = logging.getLogger(__name__)


class PodcastTranslationService:
    """Orchestrates podcast episode translation pipeline with stage resumption support."""

    def __init__(
        self,
        audio_processor: Optional[AudioProcessingService] = None,
        tts_service: Optional[ElevenLabsTTSStreamingService] = None,
        stt_service: Optional[WhisperTranscriptionService] = None,
        storage: Optional[StorageService] = None,
    ):
        """
        Initialize podcast translation service with dependency injection.

        Args:
            audio_processor: Audio processing service (for trimming only)
            tts_service: ElevenLabs TTS service for generating translated audio
            stt_service: OpenAI Whisper service for transcription (default, more accurate than Google Speech)
            storage: Storage service for GCS uploads

        Note: Translation provider is created on-demand during translation stage
        """
        self.audio_processor = audio_processor or AudioProcessingService(
            temp_dir=settings.TEMP_AUDIO_DIR
        )
        self.tts_service = tts_service or ElevenLabsTTSStreamingService()
        self.stt_service = stt_service or WhisperTranscriptionService()
        self.storage = storage or StorageService()
        self.temp_dir = Path(settings.TEMP_AUDIO_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def translate_episode(
        self,
        episode: PodcastEpisode,
        target_lang_code: Optional[str] = None,
        force: bool = False,
        max_duration_seconds: Optional[int] = None,
        gender: str = "female",
    ) -> Dict[str, str]:
        """
        Complete translation pipeline for a podcast episode.
        Automatically resumes from the last completed stage if previous attempt failed.

        Args:
            episode: Episode to translate
            target_lang_code: Target language code (e.g., 'en' for English, 'he' for Hebrew).
                             If not provided, will auto-detect: English→Hebrew, Hebrew→English
            force: Force translation from beginning even if stages completed
            max_duration_seconds: Optional limit on audio duration (for testing). If provided, only first N seconds will be translated.
            gender: Voice gender for TTS ('male' or 'female', default: 'female')

        Returns:
            Dictionary mapping language codes to translated audio URLs

        Raises:
            ValueError: If episode already being processed or invalid state
            RuntimeError: If translation pipeline fails
        """
        try:
            # Atomic status update to prevent duplicate processing
            result = await PodcastEpisode.find_one(
                {
                    "_id": episode.id,
                    "translation_status": {"$in": ["pending", "failed"]},
                }
            ).update(
                {
                    "$set": {
                        "translation_status": "processing",
                        "updated_at": datetime.utcnow(),
                    }
                }
            )

            if not result and not force:
                raise ValueError(
                    f"Episode {episode.id} already being processed or completed"
                )

            # Refresh episode to get latest data including translation_stages
            episode = await PodcastEpisode.get(episode.id)
            stages = episode.translation_stages if episode.translation_stages else {}

            # Clear stages if force flag is set
            if force:
                stages = {}
                await PodcastEpisode.find_one({"_id": episode.id}).update(
                    {"$set": {"translation_stages": {}}}
                )

            # Stage 1: Download original audio (or reuse)
            if (
                "downloaded" in stages
                and Path(stages["downloaded"].get("audio_path", "")).exists()
            ):
                logger.info(f"✅ Reusing downloaded audio from previous attempt")
                original_path = stages["downloaded"]["audio_path"]
            else:
                logger.info(f"Step 1/7: Downloading audio for episode {episode.id}")
                original_path = await self._download_audio(episode.audio_url)

                # Trim audio if max_duration_seconds is specified
                if max_duration_seconds:
                    logger.info(
                        f"Trimming audio to first {max_duration_seconds} seconds for testing"
                    )
                    trimmed_path = str(
                        Path(original_path).parent
                        / f"trimmed_{Path(original_path).name}"
                    )
                    await self._trim_audio(
                        original_path, trimmed_path, max_duration_seconds
                    )
                    original_path = trimmed_path
                    logger.info(
                        f"✅ Audio trimmed to {max_duration_seconds} seconds: {original_path}"
                    )

                await self._save_stage(
                    episode.id, "downloaded", {"audio_path": original_path}
                )

            # Stage 2: Transcribe original audio using Whisper (or reuse)
            # NOTE: Vocal separation SKIPPED - degrades transcription quality
            if "transcribed" in stages:
                logger.info(f"✅ Reusing transcript from previous attempt")
                transcript = stages["transcribed"]["transcript"]
                detected_lang = stages["transcribed"]["detected_lang"]
            else:
                logger.info(
                    f"Step 2/7: Transcribing original audio with Whisper for episode {episode.id}"
                )
                transcript, detected_lang = await self._transcribe_audio(original_path)
                await self._save_stage(
                    episode.id,
                    "transcribed",
                    {"transcript": transcript, "detected_lang": detected_lang},
                )

            # Update original language if detected
            if not episode.original_language:
                episode.original_language = detected_lang
                await PodcastEpisode.find_one({"_id": episode.id}).update(
                    {"$set": {"original_language": detected_lang}}
                )

            # Stage 2.5: Remove commercials from transcript (or reuse)
            # NOTE: Commercials are automatically detected and removed using AI
            if "commercials_removed" in stages:
                logger.info(
                    f"✅ Reusing commercial-free transcript from previous attempt"
                )
                clean_transcript = stages["commercials_removed"]["clean_transcript"]
                removed_commercials = stages["commercials_removed"][
                    "removed_commercials"
                ]
            else:
                logger.info(
                    f"Step 2.5/7: Detecting and removing commercials for episode {episode.id}"
                )
                clean_transcript, removed_commercials = await self._remove_commercials(
                    transcript
                )
                logger.info(
                    f"✅ Removed {len(removed_commercials)} commercial segment(s), "
                    f"kept {len(clean_transcript)} of {len(transcript)} characters"
                )
                await self._save_stage(
                    episode.id,
                    "commercials_removed",
                    {
                        "clean_transcript": clean_transcript,
                        "removed_commercials": removed_commercials,
                        "original_length": len(transcript),
                        "cleaned_length": len(clean_transcript),
                    },
                )

            # Use the cleaned transcript for translation
            transcript = clean_transcript

            # Stage 3: Determine target language
            # Map detected language to target language code
            # For English audio -> translate to Hebrew (he)
            # Determine target language (if not explicitly provided)
            if not target_lang_code:
                # Auto-detect based on source language
                # For English audio -> translate to Hebrew (he)
                # For Hebrew audio -> translate to English (en)
                # Whisper returns language names like "english", "hebrew"
                lang_map = {
                    "en": "he",
                    "en-US": "he",
                    "english": "he",
                    "he": "en",
                    "he-IL": "en",
                    "hebrew": "en",
                }
                target_lang_code = lang_map.get(detected_lang.lower(), "he")
                logger.info(
                    f"Auto-detected target language: {target_lang_code} (source: {detected_lang})"
                )
            else:
                logger.info(
                    f"Using explicitly provided target language: {target_lang_code} (source: {detected_lang})"
                )

            # Map to ISO codes for translation
            source_lang_map = {
                "english": "en",
                "hebrew": "he",
                "en": "en",
                "en-US": "en",
                "he": "he",
                "he-IL": "he",
            }
            source_lang_code = source_lang_map.get(detected_lang.lower(), "en")

            # Stage 4: Translate transcript (or reuse)
            if (
                "translated" in stages
                and stages["translated"].get("target_lang") == target_lang_code
            ):
                logger.info(f"✅ Reusing translation from previous attempt")
                translated_text = stages["translated"]["translated_text"]
            else:
                logger.info(
                    f"Step 3/7: Translating from {source_lang_code} to {target_lang_code} for episode {episode.id}"
                )
                # Create translation provider for target language
                translation_provider = TranslationProvider(
                    target_language=target_lang_code
                )
                await translation_provider.initialize()

                # Translate using Google Cloud Translate or Claude
                translated_text = await translation_provider.translate(
                    text=transcript, source_lang=source_lang_code
                )
                await self._save_stage(
                    episode.id,
                    "translated",
                    {
                        "translated_text": translated_text,
                        "target_lang": target_lang_code,
                    },
                )

            # Stage 5: Generate TTS for translated text (or reuse)
            translated_audio_path = str(
                self.temp_dir / str(episode.id) / f"translated_{target_lang_code}.mp3"
            )
            if (
                "tts_generated" in stages
                and Path(stages["tts_generated"].get("tts_path", "")).exists()
            ):
                logger.info(f"✅ Reusing TTS audio from previous attempt")
                translated_audio_path = stages["tts_generated"]["tts_path"]
            else:
                logger.info(f"Step 4/7: Generating TTS for episode {episode.id}")
                translated_audio_path = await self._generate_tts(
                    text=translated_text,
                    language=target_lang_code,
                    output_path=translated_audio_path,
                    gender=gender,
                )
                await self._save_stage(
                    episode.id, "tts_generated", {"tts_path": translated_audio_path}
                )

            # Stage 6: Upload to GCS
            # NOTE: Audio mixing SKIPPED - using TTS output directly (no background music)
            logger.info(
                f"Step 5/7: Uploading translated audio for episode {episode.id}"
            )
            translated_url = await self._upload_translated_audio(
                audio_path=translated_audio_path,
                episode_id=str(episode.id),
                language=target_lang_code,
            )

            # Stage 7: Atomic update of episode document
            logger.info(f"Step 6/7: Updating database for episode {episode.id}")
            translation_data = {
                "language": target_lang_code,
                "audio_url": translated_url,
                "transcript": transcript,
                "translated_text": translated_text,
                "voice_id": self._get_voice_id(target_lang_code, gender),
                "duration": str(
                    await self.audio_processor.get_audio_duration(translated_audio_path)
                ),
                "created_at": datetime.utcnow(),
                "file_size": Path(translated_audio_path).stat().st_size,
            }

            # Normalize detected language for storage
            detected_lang_short = detected_lang.replace("-US", "").replace("-IL", "")

            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {
                    "$set": {
                        f"translations.{target_lang_code}": translation_data,
                        "available_languages": [detected_lang_short, target_lang_code],
                        "original_language": detected_lang_short,
                        "translation_status": "completed",
                        "updated_at": datetime.utcnow(),
                        "retry_count": 0,
                        "translation_stages": {},  # Clear stages on success
                    }
                }
            )

            # Stage 7: Cleanup temporary files
            logger.info(
                f"Step 7/7: Cleaning up temporary files for episode {episode.id}"
            )
            await self.audio_processor.cleanup_temp_files(str(episode.id))

            logger.info(f"✅ Translation complete for episode {episode.id}")
            return {target_lang_code: translated_url}

        except Exception as e:
            logger.error(f"Translation failed for episode {episode.id}: {e}")

            # Increment retry count and update status (keep translation_stages for resumption)
            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {
                    "$set": {
                        "translation_status": "failed",
                        "updated_at": datetime.utcnow(),
                    },
                    "$inc": {"retry_count": 1},
                }
            )
            raise

    async def _save_stage(self, episode_id: str, stage_name: str, stage_data: dict):
        """Save completed stage data to database for resumption."""
        stage_data["timestamp"] = datetime.utcnow().isoformat()
        await PodcastEpisode.find_one({"_id": episode_id}).update(
            {"$set": {f"translation_stages.{stage_name}": stage_data}}
        )
        logger.info(f"✅ Stage '{stage_name}' completed and saved")

    async def _download_audio(self, url: str) -> str:
        """
        Download audio file with SSRF protection.

        Args:
            url: Audio file URL

        Returns:
            Path to downloaded file

        Raises:
            ValueError: If URL is not allowed or invalid
        """
        parsed = urlparse(url)

        # SSRF Protection: Validate URL against whitelist
        allowed_domains = settings.parsed_audio_domains
        if not allowed_domains:
            raise ValueError(
                "ALLOWED_AUDIO_DOMAINS not configured - cannot download audio"
            )

        if parsed.netloc not in allowed_domains:
            raise ValueError(f"Audio download from {parsed.netloc} not allowed")

        # Block internal IPs
        if parsed.hostname in ["localhost", "127.0.0.1"] or (
            parsed.hostname and parsed.hostname.startswith("192.168.")
        ):
            raise ValueError("Cannot download from internal IP addresses")

        # Download with timeout and size limit
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()

            # Verify content type
            content_type = response.headers.get("content-type", "")
            if not content_type.startswith(("audio/", "application/octet-stream")):
                raise ValueError(f"Invalid content type: {content_type}")

            # Check file size (max 500MB for podcasts)
            content_length = int(response.headers.get("content-length", 0))
            if content_length > 500 * 1024 * 1024:
                raise ValueError(f"Audio file too large: {content_length} bytes")

            # Save to temp directory
            filename = f"{uuid.uuid4()}.mp3"
            file_path = self.temp_dir / filename

            with open(file_path, "wb") as f:
                f.write(response.content)

            logger.info(f"Downloaded audio: {file_path} ({content_length} bytes)")
            return str(file_path)

    async def _transcribe_audio(self, audio_path: str) -> Tuple[str, str]:
        """
        Transcribe audio using OpenAI Whisper with automatic language detection.

        Args:
            audio_path: Path to audio file

        Returns:
            Tuple of (transcript text, detected language code)

        Note: Whisper is more accurate than Google Speech for podcast transcription
        """
        # Use OpenAI Whisper via WhisperTranscriptionService (default)
        logger.info(f"Transcribing audio using OpenAI Whisper: {audio_path}")
        text, language = await self.stt_service.transcribe_audio_file(audio_path)
        logger.info(
            f"Transcription complete: {len(text)} characters, language: {language}"
        )
        return text, language

    async def _remove_commercials(self, transcript: str) -> Tuple[str, list]:
        """
        Detect and remove commercial segments from podcast transcript using AI.

        Args:
            transcript: Full transcript text

        Returns:
            Tuple of (cleaned transcript without commercials, list of removed commercial texts)

        Note: Uses Claude API to intelligently identify and remove commercial breaks,
              advertisements, sponsor messages, and promotional content.
        """
        logger.info("Analyzing transcript for commercial segments...")

        # Initialize Claude client
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Prompt Claude to identify commercial segments
        prompt = f"""You are analyzing a podcast transcript to identify and remove commercial segments.

Please analyze the following transcript and identify ALL commercial segments including:
- Advertisements (e.g., Burlington, FanDuel, etc.)
- Sponsor messages
- Promotional content
- Product placements
- Any content that is clearly a commercial break

For each commercial segment you identify, provide the EXACT text from the transcript.

Then, provide the CLEANED transcript with all commercial segments removed.

Format your response as JSON with this structure:
{{
  "commercials": [
    {{"text": "exact commercial text here", "type": "advertisement"}},
    {{"text": "another commercial", "type": "sponsor message"}}
  ],
  "cleaned_transcript": "the full transcript with all commercials removed"
}}

Transcript to analyze:
{transcript}

Remember: Only identify actual commercials/ads. Do NOT remove:
- Host introductions
- Episode content
- Guest introductions
- Transition phrases

Respond ONLY with valid JSON, no other text."""

        try:
            # Call Claude API
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}],
            )

            # Extract response text
            response_text = response.content[0].text

            # Parse JSON response - extract JSON from response if embedded in text
            import json
            import re

            # Try to find JSON in the response (might be surrounded by explanation text)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                json_text = json_match.group(0)
            else:
                json_text = response_text

            result = json.loads(json_text)

            cleaned_transcript = result.get("cleaned_transcript", transcript)
            commercials = result.get("commercials", [])

            logger.info(f"✅ Detected {len(commercials)} commercial segment(s)")
            for i, comm in enumerate(commercials, 1):
                logger.info(
                    f"  Commercial {i}: {comm.get('type', 'unknown')} - {len(comm.get('text', ''))} chars"
                )

            return cleaned_transcript, [c.get("text", "") for c in commercials]

        except Exception as e:
            logger.warning(
                f"⚠️ Commercial detection failed: {e}. Proceeding with full transcript."
            )
            # If commercial detection fails, return original transcript
            return transcript, []

    async def _generate_tts(
        self, text: str, language: str, output_path: str, gender: str = "female"
    ) -> str:
        """
        Generate TTS audio for translated text using ElevenLabs.

        Args:
            text: Text to convert to speech
            language: Target language code ('he' or 'en')
            output_path: Path to save generated audio
            gender: Voice gender ('male' or 'female', default: 'female')

        Returns:
            Path to generated audio file
        """
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # CRITICAL: Use Google TTS for Hebrew (ElevenLabs doesn't support Hebrew properly)
        # ElevenLabs produces gibberish for Hebrew, sounds like Farsi/Breton, not Hebrew
        if language == "he":
            logger.info(
                f"Using Google Cloud TTS for Hebrew ({gender}) - {len(text)} characters"
            )
            return await self._generate_tts_google(text, language, gender, output_path)

        # Use ElevenLabs for other languages
        voice_id = self._get_voice_id(language, gender)
        logger.info(
            f"Generating TTS with voice {voice_id} ({gender}) for {len(text)} characters (language: {language})"
        )

        # Use ElevenLabs multilingual v2 model
        model_id = "eleven_multilingual_v2"

        # Connect with multilingual model and language code
        await self.tts_service.connect(
            voice_id=voice_id,
            model_id=model_id,
            output_format="mp3_44100_128",
            language_code=language,
        )
        logger.info(
            f"Connected to ElevenLabs TTS (model: {model_id}, voice: {voice_id}, language: {language})"
        )

        # Create async text stream from full text
        async def text_stream():
            # Split text into chunks for streaming (optimal chunk size for ElevenLabs)
            chunk_size = 500  # Characters per chunk
            for i in range(0, len(text), chunk_size):
                chunk = text[i : i + chunk_size]
                yield chunk
                await asyncio.sleep(0.1)  # Small delay between chunks

        # Collect audio chunks
        audio_chunks = []
        logger.info("Starting to collect TTS audio chunks...")
        chunk_count = 0

        # Stream text and collect audio (connection already established above)
        async def send_text():
            text_count = 0
            try:
                async for text_chunk in text_stream():
                    if not self.tts_service._running:
                        break
                    await self.tts_service.send_text_chunk(text_chunk)
                    text_count += 1
                await self.tts_service.finish_stream()
                logger.info(f"Sent {text_count} text chunks to TTS")
            except Exception as e:
                logger.error(f"Error sending text to TTS: {e}")

        # Start sending task and receive audio concurrently
        sender_task = asyncio.create_task(send_text())

        try:
            async for audio_chunk in self.tts_service.receive_audio():
                audio_chunks.append(audio_chunk)
                chunk_count += 1
                if chunk_count % 100 == 0:
                    logger.info(f"Received {chunk_count} audio chunks...")

            await sender_task
        finally:
            if not sender_task.done():
                sender_task.cancel()
                try:
                    await sender_task
                except asyncio.CancelledError:
                    pass
            await self.tts_service.close()

        logger.info(
            f"Received all {len(audio_chunks)} audio chunks, writing to file..."
        )

        # Write all audio chunks to file
        with open(output_path, "wb") as f:
            for chunk in audio_chunks:
                f.write(chunk)

        logger.info(
            f"TTS audio generated: {output_path} ({len(audio_chunks)} chunks, {Path(output_path).stat().st_size} bytes)"
        )
        return output_path

    async def _generate_tts_google(
        self, text: str, language: str, gender: str, output_path: str
    ) -> str:
        """
        Generate TTS using Google Cloud TTS (for Hebrew and other languages ElevenLabs doesn't support).

        Args:
            text: Text to convert to speech
            language: Language code ('he' for Hebrew)
            gender: Voice gender ('male' or 'female')
            output_path: Path to save generated audio

        Returns:
            Path to generated audio file
        """
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # Get Google TTS voice name based on language and gender
        if language == "he":
            # Hebrew voices
            if gender == "male":
                voice_name = "he-IL-Wavenet-B"  # Male Wavenet (highest quality)
            else:
                voice_name = "he-IL-Wavenet-A"  # Female Wavenet
        else:
            # For other languages, let Google auto-select
            voice_name = None

        logger.info(
            f"Generating Google TTS: {len(text)} chars, language: {language}, voice: {voice_name}"
        )

        # Create Google TTS service
        google_tts = GoogleTTSService()

        # Generate audio
        audio_bytes = await google_tts.generate_audio(
            text=text,
            language_code=f"{language}-IL" if language == "he" else language,
            voice_name=voice_name,
            gender=gender.upper(),
        )

        # Write to file
        Path(output_path).write_bytes(audio_bytes)

        logger.info(
            f"✅ Google TTS audio generated: {output_path} ({len(audio_bytes)} bytes)"
        )

        return output_path

    def _get_voice_id(self, language: str, gender: str = "female") -> str:
        """
        Get appropriate ElevenLabs voice ID for language and gender.

        Args:
            language: Language code ('he' or 'en')
            gender: Voice gender ('male' or 'female', default: 'female')

        Returns:
            ElevenLabs voice ID
        """
        if gender == "male":
            if language == "he":
                return settings.ELEVENLABS_HEBREW_MALE_VOICE_ID
            return settings.ELEVENLABS_ENGLISH_MALE_VOICE_ID
        else:
            if language == "he":
                return settings.ELEVENLABS_HEBREW_VOICE_ID
            return settings.ELEVENLABS_ENGLISH_VOICE_ID

    async def _trim_audio(
        self, input_path: str, output_path: str, duration_seconds: int
    ) -> None:
        """
        Trim audio file to specified duration using FFmpeg.

        Args:
            input_path: Path to input audio file
            output_path: Path to save trimmed audio
            duration_seconds: Duration to trim to in seconds
        """
        import subprocess

        logger.info(f"Trimming audio to {duration_seconds} seconds: {input_path}")

        # Use FFmpeg to trim audio
        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-t",
            str(duration_seconds),  # Duration in seconds
            "-c",
            "copy",  # Copy codec (fast, no re-encoding)
            "-y",  # Overwrite output file
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise RuntimeError(f"FFmpeg trim failed: {error_msg}")

        logger.info(f"✅ Audio trimmed successfully: {output_path}")

    async def _upload_translated_audio(
        self, audio_path: str, episode_id: str, language: str
    ) -> str:
        """
        Upload translated audio to Google Cloud Storage with cache-busting timestamp.

        Args:
            audio_path: Path to audio file
            episode_id: Episode ID for GCS path
            language: Language code for GCS path

        Returns:
            Public URL to uploaded audio with cache-busting query parameter
        """
        # Use timestamped path to avoid CDN caching old versions
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        gcs_path = f"podcasts/translations/{episode_id}/{language}_{timestamp}.mp3"
        url = await self.storage.upload_file(audio_path, gcs_path)
        logger.info(f"Uploaded translated audio to: {url}")
        return url
