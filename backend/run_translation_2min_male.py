"""
Translate only the first 2 minutes of Tucker Carlson episode using MALE voice (for testing Hebrew male voice)
"""
import asyncio
import os
import shutil
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.services.podcast_translation_service import PodcastTranslationService
from app.core.config import settings
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def translate_2_minutes_male():
    """Translate only first 2 minutes for testing MALE voice"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Reset to pending but KEEP existing stages (reuse milestones)
    await PodcastEpisode.find_one({"_id": "697439f1e0501bc53693246c"}).update({
        "$set": {
            "translation_status": "pending",
            "retry_count": 0
        },
        # Keep translation_stages to reuse downloaded, vocals_separated, transcribed, translated
        # Only regenerate TTS with male voice
        "$unset": {
            "translations": "",
            "translation_stages.tts_generated": ""  # Clear only TTS stage to regenerate with male voice
        }
    })

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("Tucker Carlson - 2 Minute Test Translation (MALE VOICE)")
    logger.info("=" * 80)
    logger.info("Duration: First 2 minutes only (120 seconds)")
    logger.info(f"Hebrew Male Voice: Olorin ({settings.ELEVENLABS_HEBREW_MALE_VOICE_ID})")
    logger.info("Model: eleven_multilingual_v2")
    logger.info("=" * 80)
    logger.info("")

    service = PodcastTranslationService()

    # Keep existing temp files to reuse previous stages
    logger.info("Reusing existing stages (downloaded, vocals_separated, transcribed, translated)")
    logger.info("Only regenerating TTS with MALE voice")

    # Translate only first 2 minutes (120 seconds), DON'T force (reuse stages), use MALE voice
    result = await service.translate_episode(episode, force=False, max_duration_seconds=120, gender="male")

    logger.info("")
    logger.info("=" * 80)
    logger.info("✅ 2-MINUTE TEST TRANSLATION (MALE VOICE) COMPLETED!")
    logger.info("=" * 80)
    logger.info(f"Result: {result}")
    logger.info("")
    logger.info("Listen to the Hebrew translation to verify MALE voice quality:")
    logger.info(f"URL: {result.get('he', 'Not available')}")
    logger.info("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(translate_2_minutes_male())
