#!/usr/bin/env python3
"""
Cleanup script to remove duplicate podcast episodes.

This script identifies and removes duplicate podcast episodes where the same
title exists multiple times for the same podcast, keeping only the most recent
episode (by published_at date).

Usage:
    poetry run python scripts/cleanup_duplicate_podcast_episodes.py
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import PodcastEpisode


async def cleanup_duplicates():
    """Remove duplicate podcast episodes, keeping the most recent."""
    await connect_to_mongo()

    print("🔍 Scanning for duplicate podcast episodes...")

    # Get all episodes
    all_episodes = await PodcastEpisode.find().to_list()
    print(f"📊 Found {len(all_episodes)} total podcast episodes")

    # Group by (podcast_id, title)
    grouped = defaultdict(list)
    for episode in all_episodes:
        # Normalize title (strip whitespace, lowercase for comparison)
        title_key = episode.title.strip().lower()
        key = (episode.podcast_id, title_key)
        grouped[key].append(episode)

    # Find duplicates
    duplicates_found = 0
    entries_to_delete = []

    for (podcast_id, title_key), episodes in grouped.items():
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
                f"  📻 Podcast {podcast_id[:8]}... | '{episodes[0].title[:60]}...'"
            )
            print(f"     Found {len(episodes)} duplicates, keeping most recent:")
            print(f"       ✅ Keep: ID {str(to_keep.id)[:8]}... | Ep #{to_keep.episode_number} | {to_keep.published_at}")
            for ep in to_delete:
                print(f"       ❌ Delete: ID {str(ep.id)[:8]}... | Ep #{ep.episode_number} | {ep.published_at}")

    if not duplicates_found:
        print("✅ No duplicates found!")
        await close_mongo_connection()
        return

    print(f"\n⚠️  Found {duplicates_found} duplicate groups")
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
        if deleted_count % 10 == 0:
            print(f"  Deleted {deleted_count}/{len(entries_to_delete)} episodes...")

    print(f"\n✅ Deleted {deleted_count} duplicate episodes")
    print(f"📊 Remaining episodes: {len(all_episodes) - deleted_count}")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
