"""
Podcast Translation Service
Orchestrates the complete podcast translation pipeline with vocal separation and mixing.
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

from app.core.config import settings
from app.core.storage import StorageService
from app.models.content import PodcastEpisode
from app.services.audio_processing_service import AudioProcessingService
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.translation_service import TranslationService
from app.services.whisper_transcription_service import WhisperTranscriptionService

logger = logging.getLogger(__name__)


class PodcastTranslationService:
    """Orchestrates podcast episode translation pipeline."""

    def __init__(
        self,
        audio_processor: Optional[AudioProcessingService] = None,
        translation_service: Optional[TranslationService] = None,
        tts_service: Optional[ElevenLabsTTSStreamingService] = None,
        stt_service: Optional[WhisperTranscriptionService] = None,
        storage: Optional[StorageService] = None,
    ):
        """
        Initialize podcast translation service with dependency injection.

        Args:
            audio_processor: Audio processing service for vocal separation and mixing
            translation_service: Translation service for text translation
            tts_service: ElevenLabs TTS service for generating translated audio
            stt_service: Whisper STT service for transcription
            storage: Storage service for GCS uploads
        """
        self.audio_processor = audio_processor or AudioProcessingService(
            temp_dir=settings.TEMP_AUDIO_DIR
        )
        self.translation_service = translation_service or TranslationService()
        self.tts_service = tts_service or ElevenLabsTTSStreamingService()
        self.stt_service = stt_service or WhisperTranscriptionService()
        self.storage = storage or StorageService()
        self.temp_dir = Path(settings.TEMP_AUDIO_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def translate_episode(
        self, episode: PodcastEpisode, force: bool = False
    ) -> Dict[str, str]:
        """
        Complete translation pipeline for a podcast episode.

        Args:
            episode: Episode to translate
            force: Force translation even if already completed

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

            # Step 1: Download original audio
            logger.info(f"Downloading audio for episode {episode.id}")
            original_path = await self._download_audio(episode.audio_url)

            # Step 2: Separate vocals from background
            logger.info(f"Separating vocals for episode {episode.id}")
            episode_temp_dir = str(self.temp_dir / str(episode.id))
            vocals_path, background_path = await self.audio_processor.separate_vocals(
                original_path, episode_temp_dir
            )

            # Step 3: Transcribe vocals using Whisper
            logger.info(f"Transcribing vocals for episode {episode.id}")
            transcript, detected_lang = await self._transcribe_audio(vocals_path)

            # Update original language if detected
            if not episode.original_language:
                episode.original_language = detected_lang

            # Step 4: Determine target language
            target_lang = "en" if detected_lang == "he" else "he"

            # Step 5: Translate transcript
            logger.info(
                f"Translating from {detected_lang} to {target_lang} for episode {episode.id}"
            )
            translated_text = await self.translation_service.translate(
                text=transcript, source_lang=detected_lang, target_lang=target_lang
            )

            # Step 6: Generate TTS for translated text
            logger.info(f"Generating TTS for episode {episode.id}")
            translated_vocals_path = await self._generate_tts(
                text=translated_text,
                language=target_lang,
                output_path=str(
                    self.temp_dir / str(episode.id) / f"vocals_{target_lang}.mp3"
                ),
            )

            # Step 7: Mix translated vocals with original background
            logger.info(f"Mixing audio for episode {episode.id}")
            final_audio_path = await self.audio_processor.mix_audio(
                vocals_path=translated_vocals_path,
                background_path=background_path,
                output_path=str(
                    self.temp_dir / str(episode.id) / f"final_{target_lang}.mp3"
                ),
            )

            # Step 8: Upload to GCS
            logger.info(f"Uploading translated audio for episode {episode.id}")
            translated_url = await self._upload_translated_audio(
                audio_path=final_audio_path,
                episode_id=str(episode.id),
                language=target_lang,
            )

            # Step 9: Atomic update of episode document
            translation_data = {
                "language": target_lang,
                "audio_url": translated_url,
                "transcript": transcript,
                "translated_text": translated_text,
                "voice_id": self._get_voice_id(target_lang),
                "duration": str(
                    await self.audio_processor.get_audio_duration(final_audio_path)
                ),
                "created_at": datetime.utcnow(),
                "file_size": Path(final_audio_path).stat().st_size,
            }

            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {
                    "$set": {
                        f"translations.{target_lang}": translation_data,
                        "available_languages": [detected_lang, target_lang],
                        "original_language": detected_lang,
                        "translation_status": "completed",
                        "updated_at": datetime.utcnow(),
                        "retry_count": 0,
                    }
                }
            )

            # Step 10: Cleanup temporary files
            await self.audio_processor.cleanup_temp_files(str(episode.id))

            logger.info(f"Translation complete for episode {episode.id}")
            return {target_lang: translated_url}

        except Exception as e:
            logger.error(f"Translation failed for episode {episode.id}: {e}")

            # Increment retry count and update status
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
        if not settings.ALLOWED_AUDIO_DOMAINS:
            raise ValueError(
                "ALLOWED_AUDIO_DOMAINS not configured - cannot download audio"
            )

        if parsed.netloc not in settings.ALLOWED_AUDIO_DOMAINS:
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
            filepath = self.temp_dir / filename

            with open(filepath, "wb") as f:
                f.write(response.content)

            return str(filepath)

    async def _transcribe_audio(self, audio_path: str) -> Tuple[str, str]:
        """
        Transcribe audio using Whisper with automatic language detection.

        Args:
            audio_path: Path to audio file

        Returns:
            Tuple of (transcript text, detected language code)
        """
        # Lazy import torch and whisper to avoid startup dependency
        import torch
        import whisper

        # Load Whisper model (large-v3 for best accuracy)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = whisper.load_model("large-v3", device=device)

        # Transcribe with auto-detection
        result = model.transcribe(
            audio_path,
            language=None,  # Auto-detect Hebrew or English
            task="transcribe",
            verbose=False,
            word_timestamps=True,
            fp16=torch.cuda.is_available(),
        )

        return result["text"], result["language"]

    async def _generate_tts(
        self, text: str, language: str, output_path: str
    ) -> str:
        """
        Generate TTS audio using ElevenLabs with optimal voice settings.

        Args:
            text: Text to synthesize
            language: Target language code
            output_path: Where to save audio file

        Returns:
            Path to generated audio file
        """
        voice_id = self._get_voice_id(language)

        # Professional voice settings for podcast quality
        voice_settings = {
            "stability": settings.ELEVENLABS_STABILITY,  # 0.75 from config
            "similarity_boost": settings.ELEVENLABS_SIMILARITY_BOOST,  # 0.85
            "style": settings.ELEVENLABS_STYLE,  # 0.4
            "use_speaker_boost": settings.ELEVENLABS_SPEAKER_BOOST,  # True
        }

        # Use multilingual v2 model
        model = settings.ELEVENLABS_MODEL  # "eleven_multilingual_v2"

        # Stream TTS with proper format specification
        async with self.tts_service.stream_text_to_speech(
            voice_id=voice_id,
            text=text,
            model=model,
            voice_settings=voice_settings,
            output_format="mp3_44100_128",  # 44.1kHz, 128kbps
        ) as stream:
            await stream.save(output_path)

        return output_path

    async def _upload_translated_audio(
        self, audio_path: str, episode_id: str, language: str
    ) -> str:
        """
        Upload translated audio to GCS.

        Args:
            audio_path: Path to audio file
            episode_id: Episode ID
            language: Language code

        Returns:
            GCS URL of uploaded file
        """
        gcs_path = f"podcasts/translations/{episode_id}/{language}.mp3"
        return await self.storage.upload_file(audio_path, gcs_path)

    def _get_voice_id(self, language: str) -> str:
        """
        Get appropriate ElevenLabs voice ID for language.

        Args:
            language: Language code

        Returns:
            Voice ID from configuration
        """
        if language == "he":
            return settings.ELEVENLABS_HEBREW_VOICE_ID
        elif language == "en":
            return settings.ELEVENLABS_ENGLISH_VOICE_ID
        else:
            return settings.ELEVENLABS_DEFAULT_VOICE_ID
