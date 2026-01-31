"""Podcast translation service - main orchestrator."""
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from app.core.config import settings
from app.core.storage import StorageService
from app.models.content import PodcastEpisode
from app.services.audio_processing_service import AudioProcessingService
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.whisper_transcription_service import WhisperTranscriptionService

from .constants import LANGUAGE_AUTO_MAP, SOURCE_LANG_MAP, get_voice_id
from .pipeline import (
    AudioProcessor,
    download_audio,
    generate_tts,
    remove_commercials,
    transcribe_audio,
    translate_text,
    upload_translated_audio,
)
from .stage_manager import StageManager
from .webhook_handler import WebhookHandler

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
        self.audio_processor_service = audio_processor or AudioProcessingService(
            temp_dir=settings.TEMP_AUDIO_DIR
        )
        self.tts_service = tts_service or ElevenLabsTTSStreamingService()
        self.stt_service = stt_service or WhisperTranscriptionService()
        self.storage = storage or StorageService()
        self.temp_dir = Path(settings.TEMP_AUDIO_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        self.stage_manager = StageManager()
        self.webhook_handler = WebhookHandler()
        self.audio_processor = AudioProcessor(self.audio_processor_service)

    async def translate_episode(
        self,
        episode: PodcastEpisode,
        target_lang_code: Optional[str] = None,
        force: bool = False,
        max_duration_seconds: Optional[int] = None,
        gender: str = "female",
    ) -> Dict[str, str]:
        """Complete translation pipeline for a podcast episode."""
        try:
            # Atomic status update
            now = datetime.utcnow()
            result = await PodcastEpisode.find_one(
                {"_id": episode.id, "translation_status": {"$in": ["pending", "failed"]}}
            ).update(
                {
                    "$set": {
                        "translation_status": "processing",
                        "translation_started_at": now,
                        "translation_progress": 0.0,
                        "webhook_notifications_sent": [],
                        "updated_at": now,
                    }
                }
            )
            if not result and not force:
                raise ValueError(f"Episode {episode.id} already being processed")

            # Get stages
            episode = await PodcastEpisode.get(episode.id)
            stages = {} if force else (episode.translation_stages or {})
            if force:
                await PodcastEpisode.find_one({"_id": episode.id}).update(
                    {"$set": {"translation_stages": {}, "translation_progress": 0.0}}
                )
            await self.webhook_handler.send_webhook(
                episode.id, "translation.started",
                {"episode_id": str(episode.id), "started_at": now.isoformat()}
            )

            # Stage 1: Download
            if "downloaded" in stages and Path(stages["downloaded"].get("audio_path", "")).exists():
                original_path = stages["downloaded"]["audio_path"]
            else:
                await self.stage_manager.start_stage(episode.id, "downloaded")
                original_path = await download_audio(episode.audio_url, self.temp_dir)
                if max_duration_seconds:
                    trimmed_path = str(Path(original_path).parent / f"trimmed_{Path(original_path).name}")
                    await self.audio_processor.trim_audio(original_path, trimmed_path, max_duration_seconds)
                    original_path = trimmed_path
                await self.stage_manager.complete_stage(episode.id, "downloaded", {"audio_path": original_path})

            # Stage 1.5: Separate vocals
            vocals_path, background_path = (
                (stages["vocals_separated"]["vocals_path"], stages["vocals_separated"]["background_path"])
                if "vocals_separated" in stages and Path(stages["vocals_separated"].get("vocals_path", "")).exists()
                else await self._run_separation(episode.id, original_path)
            )
            # Stage 2: Transcribe
            transcript, detected_lang = (
                (stages["transcribed"]["transcript"], stages["transcribed"]["detected_lang"])
                if "transcribed" in stages
                else await self._run_transcription(episode.id, vocals_path)
            )
            if not episode.original_language:
                await PodcastEpisode.find_one({"_id": episode.id}).update({"$set": {"original_language": detected_lang}})
            # Stage 2.5: Remove commercials
            clean_transcript = (
                stages["commercials_removed"]["clean_transcript"]
                if "commercials_removed" in stages
                else transcript if len(transcript) > 40000
                else await self._run_commercial_removal(episode.id, transcript)
            )
            # Stage 3: Determine target language
            target_lang_code = target_lang_code or LANGUAGE_AUTO_MAP.get(detected_lang.lower(), "he")
            source_lang_code = SOURCE_LANG_MAP.get(detected_lang.lower(), "en")
            # Stage 4: Translate
            translated_text = (
                stages["translated"]["translated_text"]
                if "translated" in stages and stages["translated"].get("target_lang") == target_lang_code
                else await self._run_translation(episode.id, clean_transcript, source_lang_code, target_lang_code)
            )

            # Stage 5: Generate TTS
            tts_path = str(self.temp_dir / str(episode.id) / f"translated_vocals_{target_lang_code}.mp3")
            if "tts_generated" in stages and Path(stages["tts_generated"].get("tts_path", "")).exists():
                tts_path = stages["tts_generated"]["tts_path"]
            else:
                await self.stage_manager.start_stage(episode.id, "tts_generated")
                tts_path = await generate_tts(translated_text, target_lang_code, tts_path, gender, self.tts_service)
                await self.stage_manager.complete_stage(episode.id, "tts_generated", {"tts_path": tts_path})

            # Stage 5.5: Mix audio
            mixed_path = str(self.temp_dir / str(episode.id) / f"translated_mixed_{target_lang_code}.mp3")
            if "mixed" in stages and Path(stages["mixed"].get("mixed_path", "")).exists():
                mixed_path = stages["mixed"]["mixed_path"]
            else:
                await self.stage_manager.start_stage(episode.id, "mixed")
                mixed_path = await self.audio_processor.mix_audio(tts_path, background_path, mixed_path)
                await self.stage_manager.complete_stage(episode.id, "mixed", {"mixed_path": mixed_path})

            # Stage 6: Upload
            await self.stage_manager.start_stage(episode.id, "uploaded")
            translated_url = await upload_translated_audio(mixed_path, str(episode.id), target_lang_code, self.storage)
            await self.stage_manager.complete_stage(episode.id, "uploaded", {"url": translated_url})

            # Stage 7: Update database
            translation_data = {
                "language": target_lang_code,
                "audio_url": translated_url,
                "transcript": clean_transcript,
                "translated_text": translated_text,
                "voice_id": get_voice_id(target_lang_code, gender),
                "duration": str(await self.audio_processor.get_audio_duration(mixed_path)),
                "created_at": datetime.utcnow(),
                "file_size": Path(mixed_path).stat().st_size,
            }
            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {
                    "$set": {
                        f"translations.{target_lang_code}": translation_data,
                        "translation_status": "completed",
                        "translation_progress": 100.0,
                        "updated_at": datetime.utcnow(),
                        "translation_stages": {},
                    }
                }
            )

            # Stage 8: Cleanup
            await self.audio_processor_service.cleanup_temp_files(str(episode.id))

            # Send completed webhook
            await self.webhook_handler.send_webhook(
                episode.id, "translation.completed",
                {"episode_id": str(episode.id), "audio_url": translated_url}
            )

            return {target_lang_code: translated_url}

        except Exception as e:
            logger.error(f"Translation failed for episode {episode.id}: {e}")
            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {"$set": {"translation_status": "failed"}, "$inc": {"retry_count": 1}}
            )
            await self.webhook_handler.send_webhook(
                episode.id, "translation.failed", {"error": str(e)}
            )
            raise

    async def _run_separation(self, episode_id, original_path):
        """Helper: Run vocals separation stage."""
        await self.stage_manager.start_stage(episode_id, "vocals_separated")
        output_dir = str(self.temp_dir / str(episode_id) / "separated")
        vocals, bg = await self.audio_processor.separate_vocals(original_path, output_dir)
        await self.stage_manager.complete_stage(episode_id, "vocals_separated", {"vocals_path": vocals, "background_path": bg})
        return vocals, bg

    async def _run_transcription(self, episode_id, vocals_path):
        """Helper: Run transcription stage."""
        await self.stage_manager.start_stage(episode_id, "transcribed")
        text, lang = await transcribe_audio(vocals_path, self.stt_service)
        await self.stage_manager.complete_stage(episode_id, "transcribed", {"transcript": text, "detected_lang": lang})
        return text, lang

    async def _run_commercial_removal(self, episode_id, transcript):
        """Helper: Run commercial removal stage."""
        await self.stage_manager.start_stage(episode_id, "commercials_removed")
        clean, commercials = await remove_commercials(transcript)
        await self.stage_manager.complete_stage(episode_id, "commercials_removed", {"clean_transcript": clean, "removed_commercials": commercials})
        return clean

    async def _run_translation(self, episode_id, clean_transcript, source_lang, target_lang):
        """Helper: Run translation stage."""
        await self.stage_manager.start_stage(episode_id, "translated")
        translated = await translate_text(clean_transcript, source_lang, target_lang)
        await self.stage_manager.complete_stage(episode_id, "translated", {"translated_text": translated, "target_lang": target_lang})
        return translated
