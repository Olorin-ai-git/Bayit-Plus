#!/usr/bin/env python3
"""
Check current translation status for Tucker Carlson episode.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Podcast, PodcastEpisode


async def check_status():
    """Check translation status."""

    await connect_to_mongo()

    # Get podcast
    podcast = await Podcast.find_one(Podcast.title == "The Tucker Carlson Show")
    if not podcast:
        print("❌ Podcast not found")
        await close_mongo_connection()
        return

    # Get latest episode
    latest = await PodcastEpisode.find({
        "podcast_id": str(podcast.id)
    }).sort("-published_at").first_or_none()

    if not latest:
        print("❌ No episodes found")
        await close_mongo_connection()
        return

    print("\n" + "="*80)
    print("📝 Latest Episode Status")
    print("="*80)
    print(f"\nTitle: {latest.title}")
    print(f"Status: {latest.translation_status}")
    print(f"Original Language: {latest.original_language}")
    print(f"Retry Count: {latest.retry_count}")
    print(f"Updated: {latest.updated_at}")

    if hasattr(latest, "available_languages") and latest.available_languages:
        print(f"\n✅ Available Languages: {', '.join(latest.available_languages)}")

    if hasattr(latest, "translations") and latest.translations:
        print(f"\n🎯 Translations:")
        for lang_code, trans_data in latest.translations.items():
            print(f"\n   {lang_code.upper()}:")
            print(f"      Audio: {trans_data.get('audio_url', 'N/A')}")
            print(f"      Duration: {trans_data.get('duration', 'N/A')}")
            print(f"      Size: {trans_data.get('file_size', 0)} bytes")
            print(f"      Created: {trans_data.get('created_at', 'N/A')}")

    print("\n" + "="*80 + "\n")

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(check_status())
