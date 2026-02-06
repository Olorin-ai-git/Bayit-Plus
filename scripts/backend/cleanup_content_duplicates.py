"""Clean up duplicate content entries (same title, different content types)."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from collections import defaultdict
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def find_duplicates():
    """Find content with same title but different content types."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Group by title
    pipeline = [
        {"$match": {"is_published": True}},
        {"$group": {
            "_id": "$title",
            "count": {"$sum": 1},
            "items": {"$push": {
                "id": "$_id",
                "is_series": "$is_series",
                "content_format": "$content_format",
                "created_at": "$created_at",
                "category_name": "$category_name"
            }}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]

    duplicates = await collection.aggregate(pipeline).to_list(length=None)
    return duplicates


async def cleanup_duplicates(dry_run=True):
    """Remove duplicate entries (keep movies, remove series)."""
    duplicates = await find_duplicates()

    print(f"Found {len(duplicates)} duplicate titles")

    to_remove = []
    for dup in duplicates:
        title = dup["_id"]
        items = dup["items"]

        # Check if has both movie and series (based on category_name)
        def is_series_item(item):
            cat_name = item.get("category_name", "")
            return "series" in cat_name.lower() or "סדרות" in cat_name

        has_movie = any(not is_series_item(item) for item in items)
        has_series = any(is_series_item(item) for item in items)

        if has_movie and has_series:
            print(f"\n📽️  Duplicate title: {title}")
            # Keep movie, remove series
            for item in items:
                if is_series_item(item):
                    to_remove.append(item["id"])
                    print(f"  ❌ Remove series: {title} (ID: {item['id']}, category: {item.get('category_name')})")
                else:
                    print(f"  ✅ Keep movie: {title} (ID: {item['id']}, category: {item.get('category_name')})")

    if not dry_run:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB_NAME]
        result = await db["content"].update_many(
            {"_id": {"$in": to_remove}},
            {"$set": {"is_published": False, "needs_review": True}}
        )
        print(f"\n✅ Unpublished {result.modified_count} duplicate entries")
    else:
        print(f"\n⚠️  DRY RUN - Would unpublish {len(to_remove)} entries")
        print(f"Run with --execute to apply changes")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Execute cleanup (default is dry run)")
    args = parser.parse_args()

    asyncio.run(cleanup_duplicates(dry_run=not args.execute))
