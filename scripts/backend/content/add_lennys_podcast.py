"""
Add Lenny's Podcast: Product | Career | Growth to Bayit+.

RSS Source: https://api.substack.com/feed/podcast/10845.rss
Author: Lenny Rachitsky

Usage:
    cd backend
    poetry run python ../scripts/backend/content/add_lennys_podcast.py
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_scraper import fetch_rss_feed
from app.services.podcast_sync import fetch_rss_episodes

RSS_URL = "https://api.substack.com/feed/podcast/10845.rss"


async def main():
    """Add Lenny's Podcast from Substack RSS feed."""
    print("\n" + "=" * 80)
    print("Adding: Lenny's Podcast: Product | Career | Growth")
    print("=" * 80 + "\n")

    try:
        await connect_to_mongo()
        print("Connected to MongoDB\n")

        # Check if podcast already exists
        existing = await Podcast.find_one({"rss_feed": RSS_URL})
        if existing:
            print(f"Podcast already exists: {existing.title} (ID: {existing.id})")
            print(f"Episodes: {existing.episode_count}")
            return

        # Fetch feed metadata
        print("Fetching RSS feed metadata...")
        podcast_data = await fetch_rss_feed(RSS_URL)
        if not podcast_data:
            print("Failed to parse RSS feed")
            sys.exit(1)

        print(f"  Title: {podcast_data.title}")
        print(f"  Author: {podcast_data.author}")
        print(f"  Cover: {podcast_data.cover}")
        print(f"  Episodes in feed: {len(podcast_data.episodes)}\n")

        # Fetch episode data
        print("Fetching episodes...")
        episodes_data = await fetch_rss_episodes(RSS_URL, max_episodes=15)
        if not episodes_data:
            print("Failed to fetch episodes")
            sys.exit(1)

        print(f"  Parsed {len(episodes_data)} episodes\n")

        # Create Podcast document
        podcast = Podcast(
            title=podcast_data.title,
            title_en=podcast_data.title,
            description=podcast_data.description,
            description_en=podcast_data.description,
            author=podcast_data.author,
            author_en=podcast_data.author,
            cover=podcast_data.cover,
            category="technology",
            category_en="Technology",
            category_es="Tecnologia",
            category_fr="Technologie",
            category_it="Tecnologia",
            category_hi="Technology",
            category_ta="Technology",
            category_bn="Technology",
            category_ja="Technology",
            category_zh="Technology",
            culture_id="global",
            rss_feed=RSS_URL,
            website="https://www.lennysnewsletter.com/",
            episode_count=0,
            is_active=True,
            is_featured=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await podcast.insert()
        print(f"Created podcast: {podcast.title} (ID: {podcast.id})")

        # Create PodcastEpisode documents
        episodes_added = 0
        for i, ep_data in enumerate(episodes_data):
            episode = PodcastEpisode(
                podcast_id=str(podcast.id),
                title=ep_data["title"],
                description=ep_data.get("description"),
                audio_url=ep_data.get("audio_url"),
                duration=ep_data.get("duration"),
                episode_number=i + 1,
                season_number=1,
                published_at=ep_data.get("published_at", datetime.utcnow()),
                thumbnail=podcast_data.cover,
                guid=ep_data.get("guid"),
            )
            await episode.insert()
            episodes_added += 1
            print(f"  [{episodes_added}] {ep_data['title']}")

        # Update podcast metadata
        podcast.episode_count = episodes_added
        if episodes_data:
            dates = [
                ep.get("published_at")
                for ep in episodes_data
                if ep.get("published_at")
            ]
            if dates:
                podcast.latest_episode_date = max(dates)
        podcast.updated_at = datetime.utcnow()
        await podcast.save()

        print(f"\n{'=' * 80}")
        print(f"Added: {podcast.title}")
        print(f"  ID: {podcast.id}")
        print(f"  Episodes: {episodes_added}")
        print(f"  RSS: {RSS_URL}")
        print(f"  RSS sync will keep episodes updated automatically")
        print(f"{'=' * 80}\n")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
