"""
Test the podcast sync functionality
"""
import asyncio

from app.core.database import close_mongo_connection, connect_to_mongo
from pymongo import MongoClient


async def test_sync():
    # Connect to database first
    await connect_to_mongo()

    from app.services.podcast_sync import sync_all_podcasts

    print("🧪 Testing Podcast Sync Service\n")

    # Run the sync
    results = await sync_all_podcasts(max_episodes=3)

    print("\n📊 Test Results:")
    print(f"   Total podcasts with RSS: {results['total_podcasts']}")
    print(f"   Podcasts with new episodes: {results['podcasts_synced']}")
    print(f"   Total episodes added: {results['total_episodes_added']}")

    # Check database
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Check Segal Barko podcast
    podcast = db.podcasts.find_one({"title": 'סג"ל וברקו - הפודקאסט'})
    if podcast:
        print(f"\n📻 Segal Barko Podcast:")
        print(f"   Title: {podcast['title']}")
        print(f"   RSS Feed: {podcast.get('rss_feed', 'None')}")
        print(f"   Episode Count: {podcast.get('episode_count', 0)}")

        # Check episodes
        episodes = list(
            db.podcast_episodes.find({"podcast_id": podcast["_id"]}).limit(3)
        )
        ep_count = db.podcast_episodes.count_documents({"podcast_id": podcast["_id"]})
        print(f"   Total Episodes in DB: {ep_count}")
        if episodes:
            print(f"\n   Latest Episodes:")
            for ep in episodes:
                print(f"   - {ep['title']}")
                print(f"     URL: {ep.get('audio_url', 'No URL')}")

    client.close()

    # Close database connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(test_sync())
