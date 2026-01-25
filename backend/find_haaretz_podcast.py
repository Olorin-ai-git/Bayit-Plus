"""
Find Haaretz podcast in database.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def find_haaretz():
    """Find Haaretz podcast."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    print("Searching for Haaretz podcasts...")
    print()

    # Search for podcasts with "הארץ" (Haaretz) in title
    episodes = await PodcastEpisode.find(
        {"podcast_title": {"$regex": "הארץ"}}
    ).limit(10).to_list()

    if episodes:
        print(f"Found {len(episodes)} episodes from Haaretz podcasts:")
        print()
        podcasts = {}
        for ep in episodes:
            if ep.podcast_title not in podcasts:
                podcasts[ep.podcast_title] = []
            podcasts[ep.podcast_title].append(ep)

        for podcast_title, eps in podcasts.items():
            print(f"Podcast: {podcast_title}")
            print(f"  Episodes: {len(eps)}")
            print(f"  Latest: {eps[0].title}")
            print(f"  ID: {eps[0].id}")
            print()
    else:
        print("No Haaretz podcasts found. Searching for all Hebrew podcasts...")
        print()

        # Get any Hebrew podcast
        hebrew_episodes = await PodcastEpisode.find(
            {"original_language": "he"}
        ).limit(10).to_list()

        if hebrew_episodes:
            print(f"Found {len(hebrew_episodes)} Hebrew podcast episodes:")
            print()
            for ep in hebrew_episodes:
                print(f"Title: {ep.title}")
                print(f"Podcast: {ep.podcast_title}")
                print(f"ID: {ep.id}")
                print()

    client.close()

if __name__ == "__main__":
    asyncio.run(find_haaretz())
