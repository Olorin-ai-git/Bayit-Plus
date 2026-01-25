"""
Resume Tucker Carlson translation from saved checkpoint
"""
import asyncio
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

async def resume_translation():
    """Resume translation from last saved checkpoint"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Reset to pending so it can be picked up
    await PodcastEpisode.find_one({"_id": "697439f1e0501bc53693246c"}).update({
        "$set": {"translation_status": "pending"}
    })

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("Tucker Carlson - Resuming Translation")
    logger.info("=" * 80)
    logger.info(f"Saved stages: {list(episode.translation_stages.keys())}")
    logger.info("Will automatically resume from last checkpoint...")
    logger.info("")

    service = PodcastTranslationService()
    result = await service.translate_episode(episode)

    logger.info("")
    logger.info("=" * 80)
    logger.info("✅ TRANSLATION COMPLETED SUCCESSFULLY!")
    logger.info("=" * 80)
    logger.info(f"Result: {result}")

    client.close()

if __name__ == "__main__":
    asyncio.run(resume_translation())
