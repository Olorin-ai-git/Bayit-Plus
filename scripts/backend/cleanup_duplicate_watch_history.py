#!/usr/bin/env python3
"""
Cleanup script to remove duplicate WatchHistory entries.

This script identifies and removes duplicate watch history entries where
the same user has multiple entries for the same content_id, keeping only
the most recent entry.

Usage:
    poetry run python scripts/cleanup_duplicate_watch_history.py
"""

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.watchlist import WatchHistory


async def cleanup_duplicates():
    """Remove duplicate WatchHistory entries, keeping the most recent."""
    await connect_to_mongo()

    print("🔍 Scanning for duplicate watch history entries...")

    # Get all watch history entries
    all_history = await WatchHistory.find().to_list()
    print(f"📊 Found {len(all_history)} total watch history entries")

    # Group by (user_id, content_id)
    grouped = defaultdict(list)
    for entry in all_history:
        key = (entry.user_id, entry.content_id)
        grouped[key].append(entry)

    # Find duplicates
    duplicates_found = 0
    entries_to_delete = []

    for (user_id, content_id), entries in grouped.items():
        if len(entries) > 1:
            duplicates_found += 1
            # Sort by last_watched_at (most recent first)
            entries.sort(key=lambda e: e.last_watched_at, reverse=True)

            # Keep the first (most recent), delete the rest
            to_delete = entries[1:]
            entries_to_delete.extend(to_delete)

            print(
                f"  👤 User {user_id[:8]}... | Content {content_id[:8]}... | "
                f"Found {len(entries)} entries, keeping most recent"
            )

    if not duplicates_found:
        print("✅ No duplicates found!")
        return

    print(f"\n⚠️  Found {duplicates_found} duplicate groups")
    print(f"📝 Will delete {len(entries_to_delete)} duplicate entries")

    # Confirm deletion
    response = input("\n❓ Proceed with deletion? (yes/no): ")
    if response.lower() != "yes":
        print("❌ Deletion cancelled")
        return

    # Delete duplicates
    deleted_count = 0
    for entry in entries_to_delete:
        await entry.delete()
        deleted_count += 1

    print(f"✅ Deleted {deleted_count} duplicate entries")
    print(f"📊 Remaining entries: {len(all_history) - deleted_count}")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
