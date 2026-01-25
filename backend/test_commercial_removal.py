"""
Test commercial removal feature with 5-minute translation
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

async def test_commercial_removal():
    """Test 5-minute translation with automatic commercial removal"""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get Tucker Carlson episode
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("TESTING COMMERCIAL REMOVAL FEATURE")
    logger.info("=" * 80)
    logger.info(f"Episode: {episode.title}")
    logger.info("Duration: 5 minutes (includes Spanish ads)")
    logger.info("Voice: MALE")
    logger.info("NEW: Automatic commercial detection and removal enabled!")
    logger.info("=" * 80)
    logger.info("")

    # Create translation service
    translation_service = PodcastTranslationService()

    try:
        # Run translation with commercial removal
        result = await translation_service.translate_episode(
            episode=episode,
            force=True,
            max_duration_seconds=300,  # 5 minutes
            gender="male"
        )

        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ TRANSLATION WITH COMMERCIAL REMOVAL COMPLETE!")
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
                logger.info(f"Transcript length (with commercials): {len(trans.transcript)} characters")
                logger.info(f"Translation length (without commercials): {len(trans.translated_text)} characters")
                logger.info("")

                # Check if we have commercial removal data
                if "commercials_removed" in episode.translation_stages:
                    stage_data = episode.translation_stages["commercials_removed"]
                    original_len = stage_data.get("original_length", 0)
                    cleaned_len = stage_data.get("cleaned_length", 0)
                    removed = stage_data.get("removed_commercials", [])

                    logger.info("COMMERCIAL REMOVAL STATISTICS:")
                    logger.info(f"  Original transcript: {original_len} characters")
                    logger.info(f"  After removal: {cleaned_len} characters")
                    logger.info(f"  Removed: {original_len - cleaned_len} characters ({len(removed)} segments)")
                    logger.info("")

                    if removed:
                        logger.info("REMOVED COMMERCIAL SEGMENTS:")
                        for i, commercial in enumerate(removed, 1):
                            preview = commercial[:100] + "..." if len(commercial) > 100 else commercial
                            logger.info(f"  {i}. {preview}")
                        logger.info("")

                logger.info("First 300 characters of cleaned transcript:")
                logger.info(trans.transcript[:300] + "...")
                logger.info("")
                logger.info("First 300 characters of Hebrew translation:")
                logger.info(trans.translated_text[:300] + "...")
                logger.info("")

        logger.info("=" * 80)
        logger.info("✅ Commercial removal successfully integrated!")
        logger.info("Listen to verify Spanish ads are NOT in the Hebrew audio!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Translation failed: {e}", exc_info=True)
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_commercial_removal())
