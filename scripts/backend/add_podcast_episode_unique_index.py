#!/usr/bin/env python3
"""
Migration script to add unique index on PodcastEpisode to prevent duplicates.

This ensures that each podcast can only have one episode with the same GUID
(RSS feed unique identifier), preventing duplicate episodes.

Usage:
    poetry run python scripts/add_podcast_episode_unique_index.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import PodcastEpisode
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError


async def add_unique_index():
    """Add unique index on (podcast_id, guid) to PodcastEpisode collection."""
    await connect_to_mongo()

    print("🔍 Adding unique index to podcast_episodes collection...")

    # Get the MongoDB collection
    collection = PodcastEpisode.get_pymongo_collection()

    # Check for existing indexes
    existing_indexes = await collection.index_information()
    print(f"📋 Existing indexes: {list(existing_indexes.keys())}")

    # Drop non-unique indexes if they exist
    for index_name in existing_indexes:
        if ("podcast_id_1_guid_1" in index_name or "podcast_id_1_title_1" in index_name) and not existing_indexes[index_name].get("unique", False):
            print(f"🗑️  Dropping non-unique index: {index_name}")
            await collection.drop_index(index_name)

    # Create unique index on (podcast_id, guid)
    try:
        index_name = await collection.create_index(
            [("podcast_id", ASCENDING), ("guid", ASCENDING)],
            unique=True,
            sparse=True,  # Allow null GUIDs (older episodes without GUID)
            name="podcast_id_guid_unique"
        )
        print(f"✅ Created unique index on (podcast_id, guid): {index_name}")
    except DuplicateKeyError as e:
        print("⚠️  Duplicate key error! Duplicates still exist in the database.")
        print("   Run cleanup_duplicate_podcast_episodes.py first.")
        raise
    except Exception as e:
        print(f"❌ Error creating index: {e}")
        raise

    print("✅ Migration complete!")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(add_unique_index())
