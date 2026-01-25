"""
Clear cached translation data to force fresh generation
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def clear_cache():
    """Clear translation stages and existing Hebrew translation"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("Clearing cached translation data...")
    print(f"Episode: {episode.title}")

    # Clear translation stages and Hebrew translation
    await PodcastEpisode.find_one({"_id": episode.id}).update({
        "$unset": {
            "translation_stages": "",
            "translations.he": "",
        },
        "$set": {
            "translation_status": "pending",
            "retry_count": 0,
        }
    })

    print("✅ Cache cleared - ready for fresh translation with native Hebrew voice")
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_cache())
