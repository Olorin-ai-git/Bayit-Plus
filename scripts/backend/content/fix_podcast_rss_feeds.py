"""
Fix RSS feeds for Israeli tech podcasts.

Usage:
    cd backend
    poetry run python ../scripts/backend/content/fix_podcast_rss_feeds.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast


PODCAST_RSS_FEEDS = {
    "חיות כיס": "https://www.omnycontent.com/d/playlist/23f697a0-7e6a-4e96-a223-a82c00962b12/dbe32976-5401-4c93-87ed-a919008d58ae/1ea69f94-8d46-4ff2-aaca-a919008d58b8/podcast.rss",
    "בזמן שעבדתם": "https://www.omnycontent.com/d/playlist/2ee97a4e-8795-4260-9648-accf00a38c6a/a5d4b51f-5b9e-43db-84da-ace100c04108/0ab18f83-1327-4f4e-9d7a-ace100c0411f/podcast.rss",
    "Raymond Tec News": "https://raymondtec.com/feed/podcast/",
}

PODCAST_LANGUAGES = {
    "חיות כיס": "he",
    "בזמן שעבדתם": "he",
    "Raymond Tec News": "en",
}


async def fix_podcasts():
    """Add RSS feeds and language to podcasts."""
    await connect_to_mongo()

    print("\n" + "=" * 80)
    print("🔧 Fixing Israeli Tech Podcasts RSS Feeds")
    print("=" * 80 + "\n")

    for name, rss_feed in PODCAST_RSS_FEEDS.items():
        podcast = await Podcast.find_one(Podcast.title == name)

        if not podcast:
            print(f"❌ Podcast not found: {name}")
            continue

        # Update RSS feed
        podcast.rss_feed = rss_feed
        await podcast.save()

        print(f"✅ Updated: {name}")
        print(f"   RSS Feed: {rss_feed}")
        print(f"   Culture ID: {podcast.culture_id}")
        print()

    await close_mongo_connection()
    print("=" * 80)
    print("✅ All podcasts updated successfully")
    print("=" * 80 + "\n")
    print("💡 Next step: Run bayit-sync-podcasts to sync episodes")
    print()


if __name__ == "__main__":
    asyncio.run(fix_podcasts())
