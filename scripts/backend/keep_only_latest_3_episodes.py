#!/usr/bin/env python3
"""
Keep only the latest 3 episodes per podcast.

This script removes all but the 3 most recent episodes for each podcast,
helping reduce storage and keep the podcast library focused on current content.

Usage:
    poetry run python scripts/keep_only_latest_3_episodes.py
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import PodcastEpisode


async def keep_latest_3():
    """Keep only the 3 most recent episodes per podcast."""
    await connect_to_mongo()

    print("🔍 Scanning all podcast episodes...")

    # Get all episodes
    all_episodes = await PodcastEpisode.find().to_list()
    print(f"📊 Found {len(all_episodes)} total podcast episodes")

    # Group by podcast_id
    grouped = defaultdict(list)
    for episode in all_episodes:
        grouped[episode.podcast_id].append(episode)

    print(f"📻 Found {len(grouped)} unique podcasts")

    # Find episodes to delete (keep only latest 3 per podcast)
    entries_to_delete = []
    podcasts_with_excess = 0

    for podcast_id, episodes in grouped.items():
        if len(episodes) > 3:
            podcasts_with_excess += 1
            # Sort by published_at (most recent first), then by ID
            episodes.sort(
                key=lambda e: (
                    e.published_at if e.published_at else str(e.id),
                    str(e.id)
                ),
                reverse=True
            )

            # Keep first 3, delete the rest
            to_keep = episodes[:3]
            to_delete = episodes[3:]
            entries_to_delete.extend(to_delete)

            print(
                f"\n  📻 Podcast {str(podcast_id)[:8]}... | "
                f"Has {len(episodes)} episodes, keeping latest 3"
            )
            print(f"     ✅ Keeping:")
            for ep in to_keep:
                print(f"        - {ep.title[:50]}... | {ep.published_at}")
            print(f"     ❌ Deleting {len(to_delete)} older episodes")

    if not podcasts_with_excess:
        print("\n✅ All podcasts already have 3 or fewer episodes!")
        await close_mongo_connection()
        return

    print(f"\n⚠️  Found {podcasts_with_excess} podcasts with more than 3 episodes")
    print(f"📝 Will delete {len(entries_to_delete)} episodes")
    print(f"📊 Will retain {len(all_episodes) - len(entries_to_delete)} episodes")

    # Confirm deletion
    response = input("\n❓ Proceed with deletion? (yes/no): ")
    if response.lower() != "yes":
        print("❌ Deletion cancelled")
        await close_mongo_connection()
        return

    # Delete old episodes
    deleted_count = 0
    for episode in entries_to_delete:
        await episode.delete()
        deleted_count += 1
        if deleted_count % 10 == 0:
            print(f"  Deleted {deleted_count}/{len(entries_to_delete)} episodes...")

    print(f"\n✅ Deleted {deleted_count} episodes")
    print(f"📊 Remaining episodes: {len(all_episodes) - deleted_count}")
    print("\n✅ Cleanup complete! Each podcast now has 3 or fewer episodes.")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(keep_latest_3())
