#!/usr/bin/env python3
"""
Migration script to add unique index on WatchHistory (user_id, content_id).

This ensures that each user can only have one watch history entry per content item,
preventing duplicate entries.

Usage:
    poetry run python scripts/add_watch_history_unique_index.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.watchlist import WatchHistory
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError


async def add_unique_index():
    """Add unique index on (user_id, content_id) to WatchHistory collection."""
    await connect_to_mongo()

    print("🔍 Adding unique index to watch_history collection...")

    # Get the MongoDB collection
    collection = WatchHistory.get_pymongo_collection()

    # Check for existing index
    existing_indexes = await collection.index_information()
    print(f"📋 Existing indexes: {list(existing_indexes.keys())}")

    # Drop non-unique index if it exists
    for index_name in existing_indexes:
        if "user_id_1_content_id_1" in index_name and not existing_indexes[index_name].get("unique", False):
            print(f"🗑️  Dropping non-unique index: {index_name}")
            await collection.drop_index(index_name)

    # Create unique index
    try:
        index_name = await collection.create_index(
            [("user_id", ASCENDING), ("content_id", ASCENDING)],
            unique=True,
            name="user_id_content_id_unique"
        )
        print(f"✅ Created unique index: {index_name}")
    except DuplicateKeyError as e:
        print("⚠️  Duplicate key error! Duplicates exist in the database.")
        print("   Run cleanup_duplicate_watch_history.py first to remove duplicates.")
        raise
    except Exception as e:
        print(f"❌ Error creating index: {e}")
        raise

    print("✅ Migration complete!")

    # Cleanup connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(add_unique_index())
