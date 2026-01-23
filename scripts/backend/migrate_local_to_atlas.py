"""Migrate movies from local MongoDB to Atlas."""
import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

ATLAS_URL = os.getenv("MONGODB_ATLAS_URI")
if not ATLAS_URL:
    raise RuntimeError("MONGODB_ATLAS_URI environment variable not set")

LOCAL_URL = os.getenv("MONGODB_LOCAL_URI", "mongodb://localhost:27017")


async def migrate():
    # Connect to both databases
    local_client = AsyncIOMotorClient(LOCAL_URL)
    atlas_client = AsyncIOMotorClient(ATLAS_URL)

    local_db = local_client["bayit_plus"]
    atlas_db = atlas_client["bayit_plus"]

    # Get all movies from local
    local_movies = await local_db.content.find({"category_name": "Movies"}).to_list(
        None
    )
    print(f"Found {len(local_movies)} movies in local DB")

    # Migrate each movie
    migrated = 0
    skipped = 0

    for movie in local_movies:
        # Check if already exists in Atlas by file_hash
        file_hash = movie.get("file_hash")
        if file_hash:
            existing = await atlas_db.content.find_one({"file_hash": file_hash})
            if existing:
                print(f"  Skipped: {movie.get('title')} - already in Atlas")
                skipped += 1
                continue

        # Insert to Atlas
        result = await atlas_db.content.insert_one(movie)
        print(
            f"  Migrated: {movie.get('title')} ({movie.get('year')}) - ID: {result.inserted_id}"
        )
        migrated += 1

    print(f"\nMigration complete:")
    print(f"  Migrated: {migrated}")
    print(f"  Skipped: {skipped}")

    # Verify
    atlas_count = await atlas_db.content.count_documents({"category_name": "Movies"})
    print(f"  Total in Atlas: {atlas_count}")

    local_client.close()
    atlas_client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
