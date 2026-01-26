#!/usr/bin/env python3
"""
Check if an ID exists in any collection.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId


async def check_all_collections(content_id: str):
    """Check if ID exists in any collection."""
    print(f"Searching for ID {content_id} in all collections...")

    await connect_to_mongo()

    try:
        db = get_database()

        # Collections to check
        collections_to_check = [
            'content',
            'podcasts',
            'podcast_episodes',
            'radio_stations',
            'live_channels'
        ]

        # Try as string first, then as ObjectId
        try:
            obj_id = ObjectId(content_id)
        except:
            obj_id = None

        for coll_name in collections_to_check:
            print(f"\nChecking {coll_name}...")

            # Try string ID
            doc = await db[coll_name].find_one({"_id": content_id})
            if doc:
                print(f"✅ FOUND in {coll_name} (string ID)")
                print(f"   Title: {doc.get('title', doc.get('name', 'Unknown'))}")
                print(f"   Document: {doc}")
                return True

            # Try ObjectId
            if obj_id:
                doc = await db[coll_name].find_one({"_id": obj_id})
                if doc:
                    print(f"✅ FOUND in {coll_name} (ObjectId)")
                    print(f"   Title: {doc.get('title', doc.get('name', 'Unknown'))}")
                    print(f"   Document keys: {list(doc.keys())}")
                    return True

        print(f"\n❌ ID {content_id} not found in any collection")
        return False

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_all_collections.py <content_id>")
        sys.exit(1)

    content_id = sys.argv[1]
    try:
        result = asyncio.run(check_all_collections(content_id))
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
