"""
Verify system widgets for Israeli tech podcasts.

Usage:
    cd backend
    poetry run python ../scripts/backend/content/verify_widgets.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[3] / "backend"))

from app.core.database import close_mongo_connection, connect_to_mongo
from app.models.content import Podcast, PodcastEpisode
from app.models.widget import Widget, WidgetType


async def verify_widgets():
    """Verify all tech podcast widgets."""
    await connect_to_mongo()

    print("\n" + "=" * 80)
    print("🎛️  Verifying Tech Podcast Widgets")
    print("=" * 80 + "\n")

    # Find all system widgets with podcast content
    widgets = await Widget.find(
        Widget.type == WidgetType.SYSTEM,
        Widget.content.content_type == "podcast",
    ).to_list()

    print(f"Found {len(widgets)} system podcast widgets\n")

    for widget in widgets:
        podcast_id = widget.content.podcast_id

        # Get podcast
        podcast = await Podcast.get(podcast_id)
        if not podcast:
            print(f"❌ Widget {widget.id}: Podcast not found (ID: {podcast_id})")
            continue

        # Count episodes
        episode_count = await PodcastEpisode.find(
            PodcastEpisode.podcast_id == podcast_id
        ).count()

        # Display info
        print(f"✅ {podcast.title}")
        print(f"   Widget ID: {widget.id}")
        print(f"   Podcast ID: {podcast_id}")
        print(f"   Category: {podcast.category}")
        print(f"   Icon: {widget.icon}")
        print(f"   Description: {widget.title}")
        print(f"   Position: x={widget.position.x}, y={widget.position.y}")
        print(f"   Episodes: {episode_count}")
        print(f"   RSS Feed: {podcast.rss_feed or 'N/A'}")
        print(f"   Active: {widget.is_active}")
        print()

    await close_mongo_connection()
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(verify_widgets())
