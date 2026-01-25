"""
Debug script to test podcast translation pipeline step by step
"""
import asyncio
import logging
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_translation_pipeline():
    """Test each step of the translation pipeline"""
    from app.core.config import settings
    from app.models.content import PodcastEpisode
    from app.services.podcast_translation_service import PodcastTranslationService

    # Initialize database
    logger.info("Initializing database connection...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get the episode
    logger.info("Fetching Tucker Carlson episode...")
    episode = await PodcastEpisode.get('697439f1e0501bc53693246c')

    if not episode:
        logger.error("Episode not found!")
        return

    logger.info(f"Episode: {episode.title}")
    logger.info(f"Audio URL: {episode.audio_url}")
    logger.info(f"Current status: {episode.translation_status}")
    logger.info(f"Retry count: {episode.retry_count}")

    # Reset status to pending
    logger.info("Resetting episode status to pending...")
    await PodcastEpisode.find_one({"_id": episode.id}).update({
        "$set": {
            "translation_status": "pending",
            "retry_count": 0
        }
    })

    # Refresh episode data
    episode = await PodcastEpisode.get('697439f1e0501bc53693246c')

    # Initialize translation service
    logger.info("Initializing translation service...")
    translation_service = PodcastTranslationService()

    # Attempt translation
    logger.info("=" * 80)
    logger.info("STARTING TRANSLATION PIPELINE")
    logger.info("=" * 80)

    try:
        result = await translation_service.translate_episode(episode, force=True)
        logger.info(f"✅ Translation completed successfully!")
        logger.info(f"Result: {result}")

    except Exception as e:
        logger.error(f"❌ Translation failed: {e}")
        logger.exception("Full traceback:")

    finally:
        # Check final status
        final_episode = await PodcastEpisode.get('697439f1e0501bc53693246c')
        logger.info("=" * 80)
        logger.info("FINAL STATUS")
        logger.info("=" * 80)
        logger.info(f"Translation status: {final_episode.translation_status}")
        logger.info(f"Retry count: {final_episode.retry_count}")
        logger.info(f"Available languages: {final_episode.available_languages}")
        if final_episode.translations:
            logger.info(f"Translations: {list(final_episode.translations.keys())}")

        client.close()

if __name__ == "__main__":
    asyncio.run(test_translation_pipeline())
