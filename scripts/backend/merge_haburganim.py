"""Merge duplicate Haburganim series entries."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def merge_haburganim():
    """Merge burganim and הבורגנים into single series."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Find all Haburganim entries (parent series only, not episodes)
    haburganim = await collection.find({
        "$and": [
            {"is_published": True},
            {
                "$or": [
                    {"title": {"$regex": "^burganim$", "$options": "i"}},
                    {"title": {"$regex": "^הבורגנים$", "$options": "i"}},
                    {"title": {"$regex": "^haburganim$", "$options": "i"}}
                ]
            },
            {
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                    {"series_id": ""}
                ]
            }
        ]
    }).to_list(length=None)

    print(f"Found {len(haburganim)} Haburganim parent series entries:\n")

    for item in haburganim:
        print(f"  ID: {item['_id']}")
        print(f"  Title: {item['title']}")
        print(f"  Total Episodes: {item.get('total_episodes', 0)}")
        print(f"  Is Featured: {item.get('is_featured', False)}")
        print(f"  Category: {item.get('category_name')}")
        print()

    # Decide which one to keep (prefer Hebrew title with most episodes)
    if not haburganim:
        print("No Haburganim series found!")
        return

    # Sort by total_episodes (descending) to keep the one with most episodes
    # Handle None values by treating them as 0
    haburganim.sort(key=lambda x: x.get('total_episodes') or 0, reverse=True)

    primary = haburganim[0]
    duplicates = haburganim[1:]

    print(f"✅ Keeping primary: {primary['title']} (ID: {primary['_id']}, {primary.get('total_episodes', 0)} episodes)")
    print(f"❌ Removing {len(duplicates)} duplicates:\n")

    for dup in duplicates:
        print(f"  - {dup['title']} (ID: {dup['_id']}, {dup.get('total_episodes', 0)} episodes)")

    # Unpublish duplicates
    if duplicates:
        duplicate_ids = [dup["_id"] for dup in duplicates]
        result = await collection.update_many(
            {"_id": {"$in": duplicate_ids}},
            {"$set": {"is_published": False, "needs_review": True}}
        )
        print(f"\n✅ Unpublished {result.modified_count} duplicate series")

    # Ensure primary is featured
    await collection.update_one(
        {"_id": primary["_id"]},
        {"$set": {"is_featured": True, "category_name": "Israeli Series"}}
    )
    print(f"✅ Marked {primary['title']} as featured")


if __name__ == "__main__":
    asyncio.run(merge_haburganim())
