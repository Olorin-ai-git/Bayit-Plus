"""
Add popular Israeli Tech/News podcasts to Bayit+.

This script adds the following podcasts:
- חיות כיס (Hayot Kiss) - Tech/Economics podcast
- בזמן שעבדתם (While you were working) - Tech news podcast
- Raymond Tec News - Tech news podcast

Usage:
    cd backend
    poetry run python ../scripts/backend/content/add_israeli_tech_podcasts.py
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.services.apple_podcasts_converter import convert_apple_podcasts_to_rss
from app.models.content import Podcast


ISRAELI_TECH_PODCASTS = [
    {
        "name": "חיות כיס",
        "english_name": "Hayot Kiss",
        "apple_url": "https://podcasts.apple.com/us/podcast/חיות-כיס-hayot-kiss/id1198989209",
        "description": "Stories about economics in human words. Hosted by Shaul Amsterdamski, Tslil Avraham, and Alon Amitzi.",
        "language": "he",
        "category": "tech_news",
    },
    {
        "name": "בזמן שעבדתם",
        "english_name": "While You Were Working",
        "apple_url": "https://podcasts.apple.com/il/podcast/בזמן-שעבדתם/id1519225032",
        "description": "Tech and media news you missed while working. Hosted by Danny Feld and Dror Globerman.",
        "language": "he",
        "category": "tech_news",
    },
    {
        "name": "Raymond Tec News",
        "english_name": "Raymond Tec News",
        "apple_url": "https://podcasts.apple.com/us/podcast/raymond-tec-news/id1446230890",
        "description": "Weekly tech news in 15-20 minutes.",
        "language": "en",
        "category": "tech_news",
    },
]


async def add_podcast_from_apple(podcast_info: dict) -> bool:
    """
    Add a podcast from Apple Podcasts URL.

    Args:
        podcast_info: Dictionary with podcast information

    Returns:
        True if added successfully, False otherwise
    """
    name = podcast_info["name"]
    apple_url = podcast_info["apple_url"]

    print(f"\n{'=' * 80}")
    print(f"Adding: {name} ({podcast_info['english_name']})")
    print(f"{'=' * 80}")

    # Check if podcast already exists
    existing = await Podcast.find_one(Podcast.title == name)
    if existing:
        print(f"  ⚠️  Podcast already exists in database")
        print(f"      ID: {existing.id}")
        print(f"      Title: {existing.title}")
        if existing.rss_feed_url:
            print(f"      RSS Feed: {existing.rss_feed_url}")
            print(f"  ✅ Podcast already configured")
            return True
        else:
            print(f"  ⚠️  Podcast exists but has no RSS feed, adding it...")

    # Convert Apple URL to RSS
    print(f"\n  📱 Converting Apple Podcasts URL to RSS...")
    result = await convert_apple_podcasts_to_rss(apple_url)

    if not result:
        print(f"  ❌ Failed to convert Apple Podcasts URL")
        return False

    rss_url = result["rss_url"]
    print(f"  ✅ Found RSS feed: {rss_url}")

    # Create or update podcast
    if existing:
        # Update existing podcast
        existing.rss_feed_url = rss_url
        existing.updated_at = datetime.utcnow()
        await existing.save()
        print(f"  ✅ Updated existing podcast with RSS feed")
    else:
        # Create new podcast
        podcast = Podcast(
            title=name,
            description=podcast_info["description"],
            language=podcast_info["language"],
            rss_feed_url=rss_url,
            category=podcast_info["category"],
            auto_publish=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await podcast.insert()
        print(f"  ✅ Created new podcast")

    print(f"\n  📻 Podcast Details:")
    print(f"      Title: {name}")
    print(f"      English: {podcast_info['english_name']}")
    print(f"      Description: {podcast_info['description']}")
    print(f"      RSS Feed: {rss_url}")
    print(f"      Language: {podcast_info['language']}")
    print(f"      Category: {podcast_info['category']}")

    return True


async def main():
    """Add all Israeli tech podcasts."""
    print("\n" + "=" * 80)
    print("🎙️  Adding Popular Israeli Tech/News Podcasts to Bayit+")
    print("=" * 80 + "\n")

    try:
        # Connect to database
        await connect_to_mongo()
        print("✅ Connected to MongoDB\n")

        # Add each podcast
        success_count = 0
        failed_count = 0

        for podcast_info in ISRAELI_TECH_PODCASTS:
            try:
                success = await add_podcast_from_apple(podcast_info)
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                print(f"\n  ❌ Error adding podcast: {e}")
                import traceback

                traceback.print_exc()
                failed_count += 1

        # Summary
        print("\n" + "=" * 80)
        print("📊 Summary")
        print("=" * 80)
        print(f"  ✅ Successfully added/updated: {success_count}")
        print(f"  ❌ Failed: {failed_count}")
        print(f"\n💡 Tip: Use /bayit-sync-podcasts to sync episodes from RSS feeds")
        print("=" * 80 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
