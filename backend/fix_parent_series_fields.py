#!/usr/bin/env python3
"""Add missing required fields to parent series documents."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from datetime import datetime


async def fix_parent_series():
    """Add stream_url and other required fields to parent series."""
    print("=" * 80)
    print("Adding Missing Required Fields to Parent Series")
    print("=" * 80)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # Find parent series (no season/episode, is_series=True)
        parent_query = {
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""},
            ],
            "$and": [
                {
                    "$or": [
                        {"season": None},
                        {"season": {"$exists": False}},
                    ]
                },
                {
                    "$or": [
                        {"episode": None},
                        {"episode": {"$exists": False}},
                    ]
                },
            ],
        }

        parents = await db.content.find(parent_query).to_list(length=None)
        print(f"\nFound {len(parents)} parent series\n")

        for parent in parents:
            parent_id = parent['_id']
            title = parent.get('title', 'Unknown')

            # Get first episode to copy metadata from
            first_episode = await db.content.find_one({'series_id': str(parent_id)})

            if first_episode:
                # Update parent with required fields from episode
                update_fields = {
                    "updated_at": datetime.now()
                }

                # Add stream_url if missing (use placeholder for parent series)
                if not parent.get('stream_url'):
                    update_fields['stream_url'] = ""  # Empty for parent series

                # Add category_id if missing
                if not parent.get('category_id') and first_episode.get('category_id'):
                    update_fields['category_id'] = first_episode['category_id']
                    update_fields['category_name'] = first_episode.get('category_name')

                result = await db.content.update_one(
                    {'_id': parent_id},
                    {'$set': update_fields}
                )

                print(f"✅ Updated: {title} (stream_url={'added' if 'stream_url' in update_fields else 'exists'}, category={update_fields.get('category_id', 'exists')})")
            else:
                # No episodes found, use defaults
                update_fields = {
                    "stream_url": "",
                    "updated_at": datetime.now()
                }

                if not parent.get('category_id'):
                    update_fields['category_id'] = "series"  # Default category

                result = await db.content.update_one(
                    {'_id': parent_id},
                    {'$set': update_fields}
                )

                print(f"⚠️  Updated: {title} (no episodes found, using defaults)")

        print("\n" + "=" * 80)
        print("Testing Query")
        print("=" * 80)

        # Test the series endpoint query
        filters = {
            "is_published": True,
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""},
            ],
            "$and": [
                {
                    "$or": [
                        {"season": None},
                        {"season": {"$exists": False}},
                    ]
                },
                {
                    "$or": [
                        {"episode": None},
                        {"episode": {"$exists": False}},
                    ]
                },
            ],
        }

        test_items = await db.content.find(filters).limit(5).to_list(length=5)
        print(f"\n✅ Query returned {len(test_items)} items")

        for item in test_items:
            has_stream = 'stream_url' in item and item['stream_url'] is not None
            has_category = 'category_id' in item
            marker = "✅" if has_stream and has_category else "❌"
            print(f"{marker} {item.get('title')} - stream_url: {has_stream}, category_id: {has_category}")

        print("\n" + "=" * 80)
        print("✅ Fix completed!")
        print("=" * 80)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(fix_parent_series())
