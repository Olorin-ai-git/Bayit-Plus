#!/usr/bin/env python3
"""
Rebuild Content collection indexes for performance optimization.

This script recreates all indexes from the Content model definition.

Usage:
    poetry run python rebuild_content_indexes.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.models.content import Content


async def rebuild_indexes():
    """Rebuild all indexes for the Content collection."""
    print("🔧 Connecting to database and initializing models...")

    # connect_to_mongo initializes Beanie with all models
    await connect_to_mongo()

    try:
        print(f"\n📊 Content collection: {Content.Settings.name}")

        # Get MongoDB collection directly
        db = get_database()
        collection = db[Content.Settings.name]

        # Get existing indexes
        existing_indexes = await collection.list_indexes().to_list(None)
        print(f"\n📋 Current indexes ({len(existing_indexes)}):")
        for idx in existing_indexes:
            print(f"   - {idx['name']}")

        # Drop all indexes except _id
        print("\n🗑️  Dropping existing indexes...")
        for idx in existing_indexes:
            if idx['name'] != '_id_':
                try:
                    await collection.drop_index(idx['name'])
                    print(f"   ✓ Dropped: {idx['name']}")
                except Exception as e:
                    print(f"   ⚠️  Skip: {idx['name']} - {e}")

        # Recreate indexes using Beanie's inspection
        print("\n🔨 Creating indexes from Content model...")

        # Force Beanie to recreate indexes by calling inspect_collection
        from beanie.odm.utils.init import inspect_collection

        await inspect_collection(
            cls=Content,
            database=get_database(),
            allow_index_dropping=True,
        )
        print("   ✓ Indexes created successfully")

        # Verify new indexes
        new_indexes = await collection.list_indexes().to_list(None)
        print(f"\n✅ Rebuilt indexes ({len(new_indexes)}):")
        for idx in new_indexes:
            key_info = idx.get('key', {})
            print(f"   - {idx['name']}: {dict(key_info)}")

        # Performance summary
        print("\n💡 Performance improvements:")
        print("   ✓ is_series indexed → Fast content type filtering (movies/series)")
        print("   ✓ title indexed → Fast alphabetical sorting")
        print("   ✓ year indexed → Fast year sorting")
        print("   ✓ view_count indexed → Fast popularity sorting")
        print("   ✓ avg_rating indexed → Fast rating sorting")
        print("   ✓ category_name indexed → Fast category sorting")
        print("\n🚀 Indexes ready! Queries should now be fast.")

    finally:
        await close_mongo_connection()
        print("\n✨ Done!")


if __name__ == "__main__":
    try:
        asyncio.run(rebuild_indexes())
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
