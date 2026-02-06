"""Remove is_series field from all content documents."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def remove_is_series_field(dry_run=True):
    """Remove is_series field from all content documents."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Count documents with is_series field
    count = await collection.count_documents({"is_series": {"$exists": True}})
    print(f"Found {count} documents with is_series field")

    if count == 0:
        print("No documents to update")
        return

    # Show sample of documents before removal
    samples = await collection.find({"is_series": {"$exists": True}}).limit(5).to_list(length=5)
    print("\nSample documents (before):")
    for item in samples:
        print(f"  - {item.get('title')}")
        print(f"    is_series: {item.get('is_series')}")
        print(f"    category_name: {item.get('category_name')}")
        print(f"    series_id: {item.get('series_id')}")
        print()

    if not dry_run:
        # Remove is_series field from all documents
        result = await collection.update_many(
            {"is_series": {"$exists": True}},
            {"$unset": {"is_series": ""}}
        )
        print(f"\n✅ Removed is_series field from {result.modified_count} documents")

        # Verify removal
        remaining = await collection.count_documents({"is_series": {"$exists": True}})
        print(f"✅ Remaining documents with is_series: {remaining}")
    else:
        print(f"\n⚠️  DRY RUN - Would remove is_series field from {count} documents")
        print("Run with --execute to apply changes")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Execute removal (default is dry run)")
    args = parser.parse_args()

    asyncio.run(remove_is_series_field(dry_run=not args.execute))
