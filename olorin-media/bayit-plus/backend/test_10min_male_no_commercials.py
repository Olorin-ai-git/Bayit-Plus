"""
Test 10-minute translation to get past ALL commercials (Spanish + English ads)
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

async def test_10min():
    """Test 10-minute translation to skip ALL commercials"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("10-MINUTE TRANSLATION - SKIP ALL COMMERCIALS")
    logger.info("=" * 80)
    logger.info(f"Episode: {episode.title}")
    logger.info("Duration: 10 minutes (to ensure we get actual podcast content)")
    logger.info("Voice: MALE (Tucker Carlson)")
    logger.info("Commercial removal: ENABLED")
    logger.info("=" * 80)
    logger.info("")

    translation_service = PodcastTranslationService()

    try:
        # Run translation with 10-minute limit
        result = await translation_service.translate_episode(
            episode=episode,
            force=True,
            max_duration_seconds=600,  # 10 minutes - should get past all ads
            gender="male"
        )

        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ 10-MINUTE TRANSLATION COMPLETE!")
        logger.info("=" * 80)

        # Refresh episode
        episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

        # Show what was transcribed and removed
        if "commercials_removed" in episode.translation_stages:
            stage = episode.translation_stages["commercials_removed"]
            original_len = stage.get("original_length", 0)
            cleaned_len = stage.get("cleaned_length", 0)
            removed = stage.get("removed_commercials", [])

            logger.info("")
            logger.info("COMMERCIAL REMOVAL STATISTICS:")
            logger.info(f"  Original transcript: {original_len} characters")
            logger.info(f"  After removal: {cleaned_len} characters")
            logger.info(f"  Removed: {original_len - cleaned_len} characters ({len(removed)} segments)")
            logger.info("")

            if removed:
                logger.info("REMOVED COMMERCIAL SEGMENTS:")
                for i, commercial in enumerate(removed, 1):
                    preview = commercial[:150] + "..." if len(commercial) > 150 else commercial
                    logger.info(f"  {i}. {preview}")
                logger.info("")

        # Show translation
        for lang_code, url in result.items():
            if lang_code in episode.translations:
                trans = episode.translations[lang_code]
                logger.info(f"Audio URL: {url}")
                logger.info(f"Transcript length: {len(trans.transcript)} characters")
                logger.info(f"Translation length: {len(trans.translated_text)} characters")
                logger.info("")
                logger.info("First 500 characters of English transcript:")
                logger.info(trans.transcript[:500])
                logger.info("")
                logger.info("First 500 characters of Hebrew translation:")
                logger.info(trans.translated_text[:500])
                logger.info("")

        logger.info("=" * 80)
        logger.info("✅ Test complete - verify audio is Hebrew with Tucker Carlson content!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Translation failed: {e}", exc_info=True)
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_10min())
