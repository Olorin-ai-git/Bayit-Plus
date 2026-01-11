#!/usr/bin/env python3
"""
Add 'השבוע - פודקאסט הארץ' podcast to database
"""
import asyncio
import feedparser
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
sys.path.append('.')

from app.models.content import Podcast, PodcastEpisode
from app.core.config import settings


async def add_hashavoua_podcast():
    """Add השבוע - פודקאסט הארץ podcast to database."""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Podcast, PodcastEpisode],
    )

    try:
        print("📻 Adding 'השבוע - פודקאסט הארץ' to database...")

        # Podcast info
        podcast_title = "השבוע - פודקאסט הארץ"
        rss_feed_url = "https://www.omnycontent.com/d/playlist/397b9456-4f75-4509-acff-ac0600b4a6a4/fdef9415-eb17-45d7-85fd-ac08009235b2/4c9f1a8f-8a0e-4f10-b01f-ac08009235b7/podcast.rss"

        # Check if podcast already exists
        existing = await Podcast.find_one(Podcast.title == podcast_title)
        if existing:
            print(f"  ⊙ Podcast already exists: {existing.id}")
            podcast = existing
        else:
            # Create podcast
            podcast = Podcast(
                title=podcast_title,
                author="הארץ",
                description="פודקאסט החדשות השבועי של עיתון הארץ",
                cover="/uploads/podcasts/hashavoua_haaretz.jpg",
                category="News",
                rss_feed=rss_feed_url,
                is_active=True,
                episode_count=0,
                latest_episode_date=None,
                order=100,
            )
            await podcast.insert()
            print(f"  ✓ Created podcast: {podcast.id}")

        # Fetch RSS feed
        print(f"\n📡 Fetching RSS feed...")
        feed = feedparser.parse(rss_feed_url)

        if not feed.entries:
            print("  ⚠️  No episodes found in RSS feed")
            return

        print(f"  ✓ Found {len(feed.entries)} episodes in feed")

        # Add episodes (limit to most recent 3)
        episodes_to_add = feed.entries[:3]
        added = 0
        updated = 0

        for idx, entry in enumerate(episodes_to_add, 1):
            title = entry.get('title', 'Untitled Episode')

            # Extract audio URL
            audio_url = None
            if hasattr(entry, 'enclosures') and entry.enclosures:
                audio_url = entry.enclosures[0].get('href')
            elif hasattr(entry, 'links'):
                for link in entry.links:
                    if link.get('type', '').startswith('audio/'):
                        audio_url = link.get('href')
                        break

            # Parse published date
            published_date = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published_date = datetime(*entry.published_parsed[:6])

            # Get description
            description = entry.get('summary', entry.get('description', ''))

            # Get duration
            duration = None
            if hasattr(entry, 'itunes_duration'):
                duration = entry.itunes_duration

            # Check if episode exists
            existing_ep = await PodcastEpisode.find_one({
                "podcast_id": str(podcast.id),
                "title": title
            })

            if existing_ep:
                updated += 1
                continue

            # Create episode
            episode = PodcastEpisode(
                podcast_id=str(podcast.id),
                title=title,
                description=description,
                audio_url=audio_url,
                duration=duration,
                published_at=published_date or datetime.now(),
                episode_number=idx,
                is_published=True,
            )
            await episode.insert()
            added += 1

        # Update podcast episode count and latest episode date
        total_episodes = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == str(podcast.id)
        ).count()

        latest_ep = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == str(podcast.id)
        ).sort(-PodcastEpisode.published_at).first_or_none()

        podcast.episode_count = total_episodes
        if latest_ep:
            podcast.latest_episode_date = latest_ep.published_at
        await podcast.save()

        print(f"\n✅ Podcast added successfully!")
        print(f"  • Total episodes in DB: {total_episodes}")
        print(f"  • New episodes added: {added}")
        print(f"  • Episodes skipped (existing): {updated}")
        print(f"  • Latest episode: {latest_ep.title if latest_ep else 'N/A'}")
        print(f"  • Podcast ID: {podcast.id}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_hashavoua_podcast())
