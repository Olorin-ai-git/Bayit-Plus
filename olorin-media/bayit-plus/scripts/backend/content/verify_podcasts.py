"""
Verify Israeli tech podcasts were added successfully.

Usage:
    cd backend
    poetry run python ../scripts/backend/content/verify_podcasts.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast, PodcastEpisode


async def verify_podcasts():
    """Verify the Israeli tech podcasts."""
    await connect_to_mongo()

    print("\n" + "=" * 80)
    print("🔍 Verifying Israeli Tech Podcasts")
    print("=" * 80 + "\n")

    podcast_names = ["חיות כיס", "בזמן שעבדתם", "Raymond Tec News"]

    for name in podcast_names:
        podcast = await Podcast.find_one(Podcast.title == name)

        if not podcast:
            print(f"❌ Podcast not found: {name}")
            continue

        # Count episodes
        episode_count = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == str(podcast.id)
        ).count()

        print(f"✅ {name}")
        print(f"   ID: {podcast.id}")
        print(f"   RSS Feed: {getattr(podcast, 'rss_feed', 'N/A')}")
        print(f"   Language: {getattr(podcast, 'language', 'N/A')}")
        print(f"   Category: {getattr(podcast, 'category', 'N/A')}")
        print(f"   Episodes: {episode_count}")
        print(f"   Active: {getattr(podcast, 'is_active', True)}")
        print()

    await close_mongo_connection()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(verify_podcasts())
