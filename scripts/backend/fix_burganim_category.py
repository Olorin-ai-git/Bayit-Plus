#!/usr/bin/env python3
"""Fix HaBurganim category to Israeli Series."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def fix_burganim():
    """Update HaBurganim to Israeli Series category."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Find HaBurganim content
    burganim = await collection.find(
        {"title": {"$regex": "בורגנים", "$options": "i"}}
    ).to_list(length=None)

    if not burganim:
        print("❌ No content found matching 'בורגנים'")
        return

    print(f"Found {len(burganim)} items matching 'בורגנים':")
    for item in burganim:
        print(f"\n📺 {item.get('title')}")
        print(f"   ID: {item['_id']}")
        print(f"   Current Category: {item.get('category_name')}")
        print(f"   Is Featured: {item.get('is_featured')}")
        print(f"   Is Published: {item.get('is_published')}")
        print(f"   Total Episodes: {item.get('total_episodes')}")
        print(f"   Series ID: {item.get('series_id')}")

    # Update to Israeli Series
    ids = [item["_id"] for item in burganim]

    # First ensure genres is an array
    await collection.update_many(
        {"_id": {"$in": ids}, "genres": None},
        {"$set": {"genres": []}}
    )

    # Then update category and add Israeli genre
    result = await collection.update_many(
        {"_id": {"$in": ids}},
        {
            "$set": {"category_name": "Israeli Series"},
            "$addToSet": {"genres": "Israeli"}
        }
    )

    print(f"\n✅ Updated {result.modified_count} items to 'Israeli Series' category")
    print(f"✅ Added 'Israeli' genre to items")


if __name__ == "__main__":
    asyncio.run(fix_burganim())
