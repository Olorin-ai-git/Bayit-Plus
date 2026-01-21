"""
Add Apple Podcasts feed to a podcast by converting the URL to RSS.

Usage:
    poetry run python add_apple_podcasts_feed.py "https://podcasts.apple.com/us/podcast/title/id1643491580"

Or specify podcast title:
    poetry run python add_apple_podcasts_feed.py "https://podcasts.apple.com/us/podcast/title/id1643491580" "Podcast Title"
"""
import asyncio
import sys
from datetime import datetime

from app.core.database import close_mongo_connection, connect_to_mongo
from app.services.apple_podcasts_converter import convert_apple_podcasts_to_rss
from pymongo import MongoClient


async def add_apple_podcasts_feed(apple_url: str, podcast_title: str = None):
    """
    Add Apple Podcasts feed to a podcast in the database.

    Args:
        apple_url: Apple Podcasts URL
        podcast_title: Optional podcast title to search for
    """
    # Connect to database
    await connect_to_mongo()

    print("\n" + "=" * 80)
    print("🍎 Apple Podcasts RSS Feed Converter")
    print("=" * 80 + "\n")

    # Convert Apple URL to RSS
    print(f"Converting Apple Podcasts URL...")
    result = await convert_apple_podcasts_to_rss(apple_url)

    if not result:
        print("\n❌ Failed to convert Apple Podcasts URL to RSS feed")
        await close_mongo_connection()
        return

    rss_url = result["rss_url"]

    # Connect to MongoDB
    client = MongoClient("mongodb://localhost:27017")
    db = client["bayit_plus"]

    # Find podcast
    if podcast_title:
        # Search by title
        podcast = db.podcasts.find_one({"title": podcast_title})
        if not podcast:
            print(f"❌ Podcast not found: {podcast_title}")
            client.close()
            await close_mongo_connection()
            return
    else:
        print("\n📚 Searching for podcast in database...")
        # Try to find by searching all podcasts
        podcasts = list(db.podcasts.find({"rss_feed": None}).limit(5))
        if not podcasts:
            print("❌ No podcasts without RSS feed found")
            print(
                "   Specify podcast title: python add_apple_podcasts_feed.py <url> <title>"
            )
            client.close()
            await close_mongo_connection()
            return

        print(f"Found {len(podcasts)} podcasts without RSS feeds:")
        for i, p in enumerate(podcasts, 1):
            print(f"   {i}. {p['title']}")

        podcast = podcasts[0]
        print(f"\nUsing first podcast: {podcast['title']}")

    # Update podcast with RSS feed
    print(f"\n📝 Updating podcast: {podcast['title']}")
    print(f"   RSS Feed: {rss_url}")

    result = db.podcasts.update_one(
        {"_id": podcast["_id"]},
        {
            "$set": {
                "rss_feed": rss_url,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if result.modified_count > 0:
        print(f"\n✅ Successfully added RSS feed to podcast!")
        print(f"\n📻 Podcast Details:")
        print(f"   Title: {podcast['title']}")
        print(f"   Author: {podcast.get('author', 'Unknown')}")
        print(f"   RSS Feed: {rss_url}")
        print(f"\n💡 Tip: Restart the server to auto-sync episodes from RSS")
    else:
        print(f"\n⚠️ Podcast already has an RSS feed or update failed")

    client.close()
    await close_mongo_connection()

    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: poetry run python add_apple_podcasts_feed.py <apple_url> [podcast_title]"
        )
        print("\nExample:")
        print(
            '  poetry run python add_apple_podcasts_feed.py "https://podcasts.apple.com/us/podcast/בן-וינוף-בקיצור-103fm/id1643491580"'
        )
        print(
            '  poetry run python add_apple_podcasts_feed.py "https://podcasts.apple.com/us/podcast/בן-וינוף-בקיצור-103fm/id1643491580" "Podcast Title"'
        )
        sys.exit(1)

    apple_url = sys.argv[1]
    podcast_title = sys.argv[2] if len(sys.argv) > 2 else None

    asyncio.run(add_apple_podcasts_feed(apple_url, podcast_title))
