#!/usr/bin/env python3
"""Update ALL content with old bucket URLs."""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def update_all():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find all with old bucket URL
    cursor = content_collection.find(
        {"stream_url": {"$regex": "storage.googleapis.com/bayit-plus-media-new/movies"}}
    )

    updated = 0
    async for doc in cursor:
        old_url = doc.get("stream_url", "")
        new_url = old_url.replace(
            "bayit-plus-media-new/movies", "bayit-plus-media-new/movies"
        )

        print(f"Updating: {doc.get('title')}")
        print(f"  ID: {doc['_id']}")
        print(f"  Old: {old_url}")
        print(f"  New: {new_url}")

        result = await content_collection.update_one(
            {"_id": doc["_id"]}, {"$set": {"stream_url": new_url}}
        )

        if result.modified_count > 0:
            updated += 1
            print(f"  ✅ Updated\n")
        else:
            print(f"  ⚠️  Not modified\n")

    print(f"\n✅ Total updated: {updated}")

    client.close()


if __name__ == "__main__":
    asyncio.run(update_all())
