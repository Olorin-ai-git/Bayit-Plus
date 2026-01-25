"""Check current episode translation status"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def check_status():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")
    
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Status: {episode.translation_status}")
    print(f"Saved Stages: {list(episode.translation_stages.keys()) if episode.translation_stages else 'None (cleared after success)'}")
    
    if episode.translations:
        print("\nTranslations:")
        for lang, data in episode.translations.items():
            print(f"\n  Language: {lang}")
            print(f"    URL: {data.audio_url}")
            print(f"    Voice ID: {data.voice_id}")
            print(f"    Duration: {data.duration}")
            print(f"    Created: {data.created_at}")
    
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_status())
