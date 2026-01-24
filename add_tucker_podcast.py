#!/usr/bin/env python3
"""
Add Tucker Carlson Show podcast to database with full metadata.
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Podcast


async def add_tucker_podcast():
    """Add Tucker Carlson Show podcast with full metadata."""

    print("\n" + "="*80)
    print("🎙️  Adding Tucker Carlson Show Podcast")
    print("="*80 + "\n")

    # Connect to database
    await connect_to_mongo()

    # Check if podcast already exists
    existing = await Podcast.find_one(Podcast.title == "The Tucker Carlson Show")
    if existing:
        print("⚠️  Podcast already exists in database!")
        print(f"   ID: {existing.id}")
        print(f"   Title: {existing.title}")
        print(f"   RSS Feed: {existing.rss_feed}")

        # Update RSS feed if needed
        if existing.rss_feed != "https://feeds.megaphone.fm/RSV1597324942":
            existing.rss_feed = "https://feeds.megaphone.fm/RSV1597324942"
            existing.updated_at = datetime.utcnow()
            await existing.save()
            print("\n✅ Updated RSS feed URL")

        await close_mongo_connection()
        return

    # Create new podcast
    podcast = Podcast(
        title="The Tucker Carlson Show",
        title_en="The Tucker Carlson Show",
        description="Tucker Carlson brings you in-depth interviews with guests covering news, politics, and current events.",
        description_en="Tucker Carlson brings you in-depth interviews with guests covering news, politics, and current events.",
        author="Tucker Carlson Network",
        author_en="Tucker Carlson Network",
        cover="https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/cb/a6/7f/cba67f7a-2c3e-7c8e-3b73-1e4b8e9e1e51/mza_11802843737067714823.jpg/600x600bb.jpg",
        category="News & Politics",
        category_en="News & Politics",
        culture_id="israeli",  # Default culture
        rss_feed="https://feeds.megaphone.fm/RSV1597324942",
        website="https://podcasts.apple.com/us/podcast/the-tucker-carlson-show/id1719657632",
        episode_count=0,
        is_active=True,
        order=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    # Save to database
    await podcast.insert()

    print("✅ Successfully added podcast!")
    print(f"\n📊 Podcast Details:")
    print(f"   ID: {podcast.id}")
    print(f"   Title: {podcast.title}")
    print(f"   Author: {podcast.author}")
    print(f"   Category: {podcast.category}")
    print(f"   RSS Feed: {podcast.rss_feed}")
    print(f"   Cover: {podcast.cover}")
    print(f"   Website: {podcast.website}")

    print(f"\n💡 Next Steps:")
    print(f"   • Episodes will be synced automatically from the RSS feed")
    print(f"   • Check the podcasts section in your app to see the podcast")

    await close_mongo_connection()

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(add_tucker_podcast())
