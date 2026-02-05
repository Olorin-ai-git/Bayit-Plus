#!/usr/bin/env python3
"""
Cleanup script to handle podcast episodes with NULL GUIDs.

Some podcast feeds don't provide GUIDs (RSS unique identifiers), resulting in
multiple episodes with guid=NULL for the same podcast. Since we want a unique
index on (podcast_id, guid), we can only have ONE episode per podcast with
guid=NULL.

This script keeps the most recently published episode with NULL GUID for each
podcast and removes the rest.

Usage:
    poetry run python scripts/cleanup_null_guid_episodes.py
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import PodcastEpisode


async def cleanup_null_guids():
    """Remove duplicate episodes with NULL GUIDs, keeping most recent."""
    await connect_to_mongo()

    print("🔍 Scanning for episodes with NULL GUIDs...")

    # Get all episodes
    all_episodes = await PodcastEpisode.find().to_list()
    null_guid_episodes = [e for e in all_episodes if e.guid is None]

    print(f"📊 Found {len(all_episodes)} total podcast episodes")
    print(f"📊 Found {len(null_guid_episodes)} episodes with NULL GUID")

    # Group by podcast_id
    grouped = defaultdict(list)
    for episode in null_guid_episodes:
        grouped[episode.podcast_id].append(episode)

    # Find podcasts with multiple NULL GUID episodes
    duplicates_found = 0
    entries_to_delete = []

    for podcast_id, episodes in grouped.items():
        if len(episodes) > 1:
            duplicates_found += 1
            # Sort by published_at (most recent first), then by ID
            episodes.sort(
                key=lambda e: (
                    e.published_at if e.published_at else str(e.id),
                    str(e.id)
                ),
                reverse=True
            )

            # Keep the first (most recent), delete the rest
            to_keep = episodes[0]
            to_delete = episodes[1:]
            entries_to_delete.extend(to_delete)

            print(
                f"  📻 Podcast {str(podcast_id)[:8]}... | "
                f"Found {len(episodes)} episodes with NULL GUID"
            )
            print(f"     ✅ Keep: ID {str(to_keep.id)[:8]}... | {to_keep.title[:40]}... | {to_keep.published_at}")
            for ep in to_delete:
                print(f"     ❌ Delete: ID {str(ep.id)[:8]}... | {ep.title[:40]}... | {ep.published_at}")

    if not duplicates_found:
        print("✅ No duplicate NULL GUID episodes found!")
        await close_mongo_connection()
        return

    print(f"\n⚠️  Found {duplicates_found} podcasts with multiple NULL GUID episodes")
    print(f"📝 Will delete {len(entries_to_delete)} duplicate episodes")

    # Confirm deletion
    response = input("\n❓ Proceed with deletion? (yes/no): ")
    if response.lower() != "yes":
        print("❌ Deletion cancelled")
        await close_mongo_connection()
        return

    # Delete duplicates
    deleted_count = 0
    for episode in entries_to_delete:
        await episode.delete()
        deleted_count += 1
        if deleted_count % 5 == 0:
            print(f"  Deleted {deleted_count}/{len(entries_to_delete)} episodes...")

    print(f"\n✅ Deleted {deleted_count} duplicate NULL GUID episodes")
    print(f"📊 Remaining episodes: {len(all_episodes) - deleted_count}")
    print("\n✅ Cleanup complete! You can now run add_podcast_episode_unique_index.py")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(cleanup_null_guids())
