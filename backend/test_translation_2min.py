"""
Test 2-minute podcast translation with the refactored Whisper-based service
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.services.podcast_translation_service import PodcastTranslationService
from app.core.config import settings

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_2min_translation():
    """Test 2-minute translation using the refactored service"""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get Tucker Carlson episode
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("TESTING 2-MINUTE TRANSLATION WITH REFACTORED SERVICE")
    logger.info("=" * 80)
    logger.info(f"Episode: {episode.title}")
    logger.info(f"Original URL: {episode.audio_url}")
    logger.info("Pipeline: Download → Trim (2min) → Whisper STT → Translate → TTS → Upload")
    logger.info("=" * 80)
    logger.info("")

    # Create translation service
    translation_service = PodcastTranslationService()

    try:
        # Run translation with 2-minute limit
        result = await translation_service.translate_episode(
            episode=episode,
            force=True,  # Force new translation
            max_duration_seconds=120,  # 2 minutes
            gender="female"  # Rachel voice
        )

        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ 2-MINUTE TRANSLATION COMPLETE!")
        logger.info("=" * 80)
        logger.info(f"Result: {result}")
        logger.info("")

        # Refresh episode to see updated data
        episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

        # Show translation data
        for lang_code, url in result.items():
            if lang_code in episode.translations:
                trans = episode.translations[lang_code]
                logger.info(f"Language: {lang_code}")
                logger.info(f"Audio URL: {url}")
                logger.info(f"Transcript length: {len(trans.transcript)} characters")
                logger.info(f"Translation length: {len(trans.translated_text)} characters")
                logger.info(f"Voice ID: {trans.voice_id}")
                logger.info("")
                logger.info("First 200 characters of transcript:")
                logger.info(trans.transcript[:200] + "...")
                logger.info("")
                logger.info("First 200 characters of translation:")
                logger.info(trans.translated_text[:200] + "...")
                logger.info("")

        logger.info("=" * 80)
        logger.info("TEST COMPLETE - Listen to the audio to verify quality!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Translation failed: {e}", exc_info=True)
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_2min_translation())
