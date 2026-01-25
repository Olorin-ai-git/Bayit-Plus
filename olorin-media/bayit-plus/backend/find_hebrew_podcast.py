"""
Find Hebrew podcasts to translate to English
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode, Podcast
from app.core.config import settings

async def find_hebrew_podcasts():
    """Find Hebrew podcasts"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode, Podcast])

    print("=" * 80)
    print("SEARCHING FOR HEBREW PODCASTS")
    print("=" * 80)
    print()

    # Search for podcasts with Hebrew titles
    podcasts = await Podcast.find(
        {"$or": [
            {"title": {"$regex": "השבוע", "$options": "i"}},
            {"title": {"$regex": "עכשיו", "$options": "i"}},
            {"title": {"$regex": "חדשות", "$options": "i"}},
            {"language": "he"},
            {"language": "hebrew"}
        ]}
    ).limit(10).to_list()

    print(f"Found {len(podcasts)} Hebrew podcasts:")
    print()

    for podcast in podcasts:
        print(f"Title: {podcast.title}")
        print(f"  ID: {podcast.id}")
        print(f"  Language: {podcast.language if hasattr(podcast, 'language') else 'N/A'}")
        print(f"  Description: {podcast.description[:100] if podcast.description else 'N/A'}...")
        print()

    if podcasts:
        print("=" * 80)
        print("SEARCHING FOR EPISODES FROM FIRST PODCAST")
        print("=" * 80)
        print()

        first_podcast = podcasts[0]
        print(f"Podcast: {first_podcast.title}")
        print()

        # Get episodes for this podcast
        episodes = await PodcastEpisode.find(
            {"podcast_id": str(first_podcast.id)}
        ).sort("-published_at").limit(5).to_list()

        print(f"Found {len(episodes)} recent episodes:")
        print()

        for ep in episodes:
            print(f"Title: {ep.title}")
            print(f"  Episode ID: {ep.id}")
            print(f"  Published: {ep.published_at}")
            print(f"  Duration: {ep.duration if hasattr(ep, 'duration') else 'N/A'}")
            print(f"  Audio URL: {ep.audio_url[:80] if ep.audio_url else 'N/A'}...")
            print()

    client.close()

if __name__ == "__main__":
    asyncio.run(find_hebrew_podcasts())
