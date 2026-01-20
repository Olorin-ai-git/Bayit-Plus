"""
Fix Segal-Barko with the correct Apple Podcasts RSS feed.
"""
import asyncio
from datetime import datetime

from app.core.database import close_mongo_connection, connect_to_mongo
from app.services.apple_podcasts_converter import convert_apple_podcasts_to_rss
from pymongo import MongoClient


async def fix_segal_barko():
    """Fix Segal-Barko with the correct Apple Podcasts URL"""
    apple_url = "https://podcasts.apple.com/us/podcast/%D7%A1%D7%92-%D7%9C-%D7%95%D7%91%D7%A8%D7%A7%D7%95-%D7%A2%D7%9D-%D7%90%D7%A8%D7%90%D7%9C-%D7%A1%D7%92-%D7%9C-%D7%95%D7%90%D7%99%D7%99%D7%9C-%D7%91%D7%A8%D7%A7%D7%95%D7%91%D7%99%D7%A5-103fm/id1759347234"

    await connect_to_mongo()
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    print("\n" + "=" * 80)
    print("🔧 Fixing Segal-Barko with Correct RSS Feed")
    print("=" * 80 + "\n")

    print("📱 Converting Apple URL to RSS...")
    conversion = await convert_apple_podcasts_to_rss(apple_url)

    if not conversion:
        print("❌ Failed to convert Apple URL")
        client.close()
        await close_mongo_connection()
        return

    rss_url = conversion["rss_url"]
    print(f"✅ Found RSS Feed:\n   {rss_url}\n")

    # Find and update the podcast
    podcast = db.podcasts.find_one({"title": 'סג"ל וברקו - הפודקאסט'})

    if not podcast:
        print("❌ Podcast not found")
        client.close()
        await close_mongo_connection()
        return

    # Clear old episodes from this specific podcast only
    print(
        f"🧹 This will clear {db.podcast_episodes.count_documents({'podcast_id': str(podcast['_id'])})} episodes from '{PODCAST_NAME}'"
    )
    print("⚠️  Are you sure you want to continue? (yes/no): ", end="")
    response = input().strip().lower()
    if response != "yes":
        print("✗ Operation cancelled")
        client.close()
        await close_mongo_connection()
        return

    delete_result = db.podcast_episodes.delete_many({"podcast_id": str(podcast["_id"])})
    print(f"   ✓ Deleted {delete_result.deleted_count} old episodes\n")

    # Update podcast with correct RSS feed
    print("📝 Updating podcast with correct RSS feed...")
    result = db.podcasts.update_one(
        {"_id": podcast["_id"]},
        {
            "$set": {
                "rss_feed": rss_url,
                "episode_count": 0,
                "latest_episode_date": None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if result.modified_count > 0:
        print("✅ Segal-Barko Updated Successfully!\n")
        print("📻 Podcast Details:")
        print(f'   Title: סג"ל וברקו - הפודקאסט')
        print(f"   RSS Feed: {rss_url}")
        print(f"\n💡 Next Steps:")
        print("   1. Restart the server")
        print("   2. Server will automatically fetch latest 3 episodes")
        print("   3. Episodes will be displayed with correct content\n")
    else:
        print("⚠️ Update failed")

    client.close()
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(fix_segal_barko())
