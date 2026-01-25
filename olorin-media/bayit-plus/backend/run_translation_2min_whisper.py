"""
Translate only the first 2 minutes using Whisper (no vocal separation)
Test to see if transcription quality improves
"""
import asyncio
import os
import shutil
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.services.whisper_transcription_service import WhisperTranscriptionService
from app.services.podcast_translation_service import PodcastTranslationService
from app.core.config import settings
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def translate_2_minutes_whisper():
    """Translate only first 2 minutes using Whisper STT (no vocal separation)"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Reset to pending, clear all stages to start fresh
    await PodcastEpisode.find_one({"_id": "697439f1e0501bc53693246c"}).update({
        "$set": {
            "translation_status": "pending",
            "translation_stages": {},
            "retry_count": 0
        },
        "$unset": {"translations": ""}
    })

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("Tucker Carlson - 2 Minute Test Translation (WHISPER NO VOCAL SEPARATION)")
    logger.info("=" * 80)
    logger.info("Duration: First 2 minutes only (120 seconds)")
    logger.info("Transcription: OpenAI Whisper (no vocal separation)")
    logger.info("TTS: ElevenLabs Rachel (female)")
    logger.info("=" * 80)
    logger.info("")

    # Create translation service with Whisper STT
    whisper_service = WhisperTranscriptionService()
    service = PodcastTranslationService(stt_service=whisper_service)

    # Clean up any existing temp files
    temp_dir = f"/tmp/podcast_audio/{episode.id}"
    if os.path.exists(temp_dir):
        logger.info(f"Cleaning up existing temp directory: {temp_dir}")
        shutil.rmtree(temp_dir)

    # Translate only first 2 minutes (120 seconds), force fresh start
    result = await service.translate_episode(episode, force=True, max_duration_seconds=120, gender="female")

    logger.info("")
    logger.info("=" * 80)
    logger.info("✅ 2-MINUTE TEST TRANSLATION (WHISPER) COMPLETED!")
    logger.info("=" * 80)
    logger.info(f"Result: {result}")
    logger.info("")
    logger.info("Now check the transcription quality:")
    logger.info("Run: poetry run python show_full_translation.py")
    logger.info("")
    logger.info("Listen to the Hebrew translation:")
    logger.info(f"URL: {result.get('he', 'Not available')}")
    logger.info("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(translate_2_minutes_whisper())
