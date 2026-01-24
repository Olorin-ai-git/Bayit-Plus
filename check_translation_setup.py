#!/usr/bin/env python3
"""
Check podcast translation setup and configuration.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Podcast, PodcastEpisode


async def check_setup():
    """Check translation setup."""

    print("\n" + "="*80)
    print("🔍 Translation Setup Check")
    print("="*80 + "\n")

    # Check configuration
    print("📋 Configuration:")
    print(f"   PODCAST_TRANSLATION_ENABLED: {settings.PODCAST_TRANSLATION_ENABLED}")
    print(f"   TEMP_AUDIO_DIR: {settings.TEMP_AUDIO_DIR}")
    print(f"   ALLOWED_AUDIO_DOMAINS: {len(settings.ALLOWED_AUDIO_DOMAINS)} domains")
    for domain in settings.ALLOWED_AUDIO_DOMAINS:
        print(f"      • {domain}")
    print(f"\n   ELEVENLABS_API_KEY: {'✅ Set' if settings.ELEVENLABS_API_KEY else '❌ Missing'}")
    print(f"   OPENAI_API_KEY: {'✅ Set' if settings.OPENAI_API_KEY else '❌ Missing'}")
    print(f"   HEBREW_VOICE_ID: {settings.ELEVENLABS_HEBREW_VOICE_ID}")
    print(f"   ENGLISH_VOICE_ID: {settings.ELEVENLABS_ENGLISH_VOICE_ID}")

    # Connect to database
    print(f"\n📡 Connecting to database...")
    await connect_to_mongo()
    print(f"   ✅ Connected")

    # Check podcast
    print(f"\n🎙️  Checking Tucker Carlson podcast...")
    podcast = await Podcast.find_one(Podcast.title == "The Tucker Carlson Show")
    if not podcast:
        print(f"   ❌ Podcast not found")
        await close_mongo_connection()
        return

    print(f"   ✅ Found: {podcast.title}")
    print(f"   RSS Feed: {podcast.rss_feed}")
    print(f"   Episode Count: {podcast.episode_count}")

    # Check episodes
    print(f"\n📝 Checking episodes...")
    episode_count = await PodcastEpisode.find({
        "podcast_id": str(podcast.id)
    }).count()
    print(f"   Total episodes: {episode_count}")

    if episode_count > 0:
        # Get latest episode
        latest = await PodcastEpisode.find({
            "podcast_id": str(podcast.id)
        }).sort("-published_at").first_or_none()

        if latest:
            print(f"\n   Latest Episode:")
            print(f"      Title: {latest.title}")
            print(f"      Audio URL: {latest.audio_url}")
            print(f"      Status: {latest.translation_status}")
            print(f"      Original Language: {latest.original_language}")

            # Check if audio domain is allowed
            from urllib.parse import urlparse
            parsed = urlparse(latest.audio_url)
            is_allowed = parsed.netloc in settings.ALLOWED_AUDIO_DOMAINS
            print(f"      Domain ({parsed.netloc}): {'✅ Allowed' if is_allowed else '❌ Not Allowed'}")

    await close_mongo_connection()

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(check_setup())
