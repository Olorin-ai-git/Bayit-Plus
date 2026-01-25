"""
Test translation with stage resumption
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.services.podcast_translation_service import PodcastTranslationService
from app.core.config import settings

async def test_translation():
    # Initialize database
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Reset episode to pending
    await PodcastEpisode.find_one({"_id": "697439f1e0501bc53693246c"}).update({
        "$set": {
            "translation_status": "pending",
            "retry_count": 0
        }
    })

    # Get episode
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("Tucker Carlson - Hebrew Translation (Stage Resumption)")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Current stages: {list(episode.translation_stages.keys()) if episode.translation_stages else 'None'}")
    print()

    # Run translation
    service = PodcastTranslationService()
    result = await service.translate_episode(episode)

    print()
    print("=" * 80)
    print("TRANSLATION COMPLETED!")
    print("=" * 80)
    print(f"Result: {result}")

    client.close()

if __name__ == "__main__":
    asyncio.run(test_translation())
