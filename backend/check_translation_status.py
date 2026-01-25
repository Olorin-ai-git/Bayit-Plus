"""
Check the translation status of the Haaretz episode.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def check_status():
    """Check translation status."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode_id = "69729fac9d27d77a468d90b0"
    episode = await PodcastEpisode.get(episode_id)

    if not episode:
        print(f"Episode {episode_id} not found")
        client.close()
        return

    print("=" * 60)
    print("HAARETZ EPISODE TRANSLATION STATUS")
    print("=" * 60)
    print(f"Episode: {episode.title}")
    print(f"Status: {episode.translation_status}")
    print(f"Available Languages: {episode.available_languages}")
    print(f"Retry Count: {episode.retry_count}")
    print(f"Updated At: {episode.updated_at}")
    print("=" * 60)

    client.close()

if __name__ == "__main__":
    asyncio.run(check_status())
