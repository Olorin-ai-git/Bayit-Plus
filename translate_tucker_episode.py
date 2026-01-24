#!/usr/bin/env python3
"""
Sync episodes from Tucker Carlson Show RSS feed and translate latest episode to Hebrew.
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

import feedparser
import httpx
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_translation_service import PodcastTranslationService


async def sync_rss_episodes(podcast: Podcast, limit: int = 5):
    """
    Sync episodes from RSS feed.

    Args:
        podcast: Podcast document
        limit: Maximum number of episodes to sync

    Returns:
        List of synced episode IDs
    """
    if not podcast.rss_feed:
        print(f"❌ No RSS feed configured for podcast: {podcast.title}")
        return []

    print(f"\n📡 Syncing episodes from RSS feed...")
    print(f"   RSS: {podcast.rss_feed}")

    # Fetch and parse RSS feed
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(podcast.rss_feed)
        response.raise_for_status()

    feed = feedparser.parse(response.text)

    if not feed.entries:
        print(f"❌ No episodes found in RSS feed")
        return []

    print(f"   Found {len(feed.entries)} episodes in feed")

    synced_ids = []

    # Process episodes (latest first)
    for i, entry in enumerate(feed.entries[:limit]):
        title = entry.get("title", "Untitled")

        # Check if episode already exists
        existing = await PodcastEpisode.find_one({
            "podcast_id": str(podcast.id),
            "title": title
        })

        if existing:
            print(f"   {i+1}. {title} - Already exists")
            synced_ids.append(str(existing.id))
            continue

        # Extract episode data
        description = entry.get("description", "") or entry.get("summary", "")
        audio_url = None

        # Find audio URL from enclosures
        if hasattr(entry, "enclosures") and entry.enclosures:
            for enclosure in entry.enclosures:
                if enclosure.get("type", "").startswith("audio/"):
                    audio_url = enclosure.get("href") or enclosure.get("url")
                    break

        # Fallback to links
        if not audio_url and hasattr(entry, "links"):
            for link in entry.links:
                if link.get("type", "").startswith("audio/"):
                    audio_url = link.get("href")
                    break

        if not audio_url:
            print(f"   {i+1}. {title} - No audio URL found, skipping")
            continue

        # Parse published date
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6])

        # Create episode
        episode = PodcastEpisode(
            podcast_id=str(podcast.id),
            title=title,
            description=description,
            audio_url=audio_url,
            published_at=published_at or datetime.utcnow(),
            duration=entry.get("itunes_duration", ""),
            original_language="en",  # Tucker Carlson Show is in English
            translation_status="pending",
            retry_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        await episode.insert()
        synced_ids.append(str(episode.id))

        print(f"   {i+1}. ✅ {title}")

    # Update podcast episode count
    podcast.episode_count = await PodcastEpisode.find({
        "podcast_id": str(podcast.id)
    }).count()
    podcast.updated_at = datetime.utcnow()
    await podcast.save()

    return synced_ids


async def translate_latest_episode():
    """Sync Tucker Carlson episodes and translate latest to Hebrew."""

    print("\n" + "="*80)
    print("🎙️  Tucker Carlson Show - Episode Translation")
    print("="*80 + "\n")

    # Connect to database
    await connect_to_mongo()

    # Find Tucker Carlson podcast
    podcast = await Podcast.find_one(Podcast.title == "The Tucker Carlson Show")
    if not podcast:
        print("❌ Tucker Carlson Show podcast not found in database")
        await close_mongo_connection()
        return

    print(f"✅ Found podcast: {podcast.title}")
    print(f"   ID: {podcast.id}")
    print(f"   RSS Feed: {podcast.rss_feed}")

    # Sync episodes from RSS
    synced_ids = await sync_rss_episodes(podcast, limit=5)

    if not synced_ids:
        print("\n❌ No episodes synced")
        await close_mongo_connection()
        return

    print(f"\n✅ Synced {len(synced_ids)} episodes")

    # Get latest episode
    latest_episode = await PodcastEpisode.find({
        "podcast_id": str(podcast.id)
    }).sort("-published_at").first_or_none()

    if not latest_episode:
        print("❌ No episodes found after sync")
        await close_mongo_connection()
        return

    print(f"\n📝 Latest Episode:")
    print(f"   Title: {latest_episode.title}")
    print(f"   Published: {latest_episode.published_at}")
    print(f"   Audio URL: {latest_episode.audio_url}")
    print(f"   Translation Status: {latest_episode.translation_status}")

    # Check if already translated
    if latest_episode.translation_status == "completed":
        print(f"\n✅ Episode already translated!")
        if hasattr(latest_episode, "translations") and latest_episode.translations:
            for lang, data in latest_episode.translations.items():
                print(f"   {lang.upper()}: {data.get('audio_url', 'N/A')}")
        await close_mongo_connection()
        return

    # Translate to Hebrew
    print(f"\n🔄 Starting translation to Hebrew...")
    print(f"   This will:")
    print(f"   1. Download original audio")
    print(f"   2. Separate vocals from background")
    print(f"   3. Transcribe using Whisper")
    print(f"   4. Translate English → Hebrew")
    print(f"   5. Generate Hebrew TTS")
    print(f"   6. Mix with original background")
    print(f"   7. Upload to storage")
    print(f"\n   ⏱️  This may take 10-30 minutes depending on episode length...\n")

    try:
        translation_service = PodcastTranslationService()
        result = await translation_service.translate_episode(latest_episode)

        print(f"\n✅ Translation completed successfully!")
        print(f"\n📊 Translation Results:")
        for lang, url in result.items():
            print(f"   {lang.upper()}: {url}")

        # Refresh episode to get updated data
        updated_episode = await PodcastEpisode.get(latest_episode.id)
        print(f"\n📝 Updated Episode Status:")
        print(f"   Translation Status: {updated_episode.translation_status}")
        print(f"   Available Languages: {updated_episode.available_languages}")

    except Exception as e:
        print(f"\n❌ Translation failed: {e}")
        import traceback
        traceback.print_exc()

    await close_mongo_connection()

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(translate_latest_episode())
