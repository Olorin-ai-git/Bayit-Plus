"""Mark some Israeli content as featured."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def mark_israeli_featured():
    """Mark first 10 Israeli movies and 10 Israeli series as featured."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Find Israeli movies (first parent item only, not episodes)
    israeli_movies = await collection.find({
        "is_published": True,
        "category_name": "Israeli Movies",
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""}
        ]
    }).limit(10).to_list(length=10)

    # Find Israeli series (first parent item only, not episodes)
    israeli_series = await collection.find({
        "is_published": True,
        "category_name": "Israeli Series",
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""}
        ]
    }).limit(10).to_list(length=10)

    print(f"Marking {len(israeli_movies)} Israeli movies as featured:")
    for item in israeli_movies:
        print(f"  - {item['title']}")

    print(f"\nMarking {len(israeli_series)} Israeli series as featured:")
    for item in israeli_series:
        print(f"  - {item['title']}")

    # Update as featured
    movie_ids = [item["_id"] for item in israeli_movies]
    series_ids = [item["_id"] for item in israeli_series]

    if movie_ids:
        result = await collection.update_many(
            {"_id": {"$in": movie_ids}},
            {"$set": {"is_featured": True}}
        )
        print(f"\n✅ Marked {result.modified_count} Israeli movies as featured")

    if series_ids:
        result = await collection.update_many(
            {"_id": {"$in": series_ids}},
            {"$set": {"is_featured": True}}
        )
        print(f"✅ Marked {result.modified_count} Israeli series as featured")


if __name__ == "__main__":
    asyncio.run(mark_israeli_featured())
