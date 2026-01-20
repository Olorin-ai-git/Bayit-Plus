#!/usr/bin/env python3
"""Update ALL old bucket URLs to new bucket."""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def fix_all_urls():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find all content with old bucket URLs (not the new bucket)
    cursor = content_collection.find(
        {
            "$and": [
                {"stream_url": {"$regex": "bayit-plus-media", "$options": "i"}},
                {
                    "stream_url": {
                        "$not": {"$regex": "bayit-plus-media-new", "$options": "i"}
                    }
                },
            ]
        }
    )

    updated = 0
    async for doc in cursor:
        old_url = doc.get("stream_url", "")
        new_url = old_url.replace("bayit-plus-media/", "bayit-plus-media-new/")

        print(f"Updating: {doc.get('title')}")
        print(f"  Old: {old_url}")
        print(f"  New: {new_url}")

        result = await content_collection.update_one(
            {"_id": doc["_id"]}, {"$set": {"stream_url": new_url}}
        )

        if result.modified_count > 0:
            updated += 1

    print(f"\n✅ Updated {updated} URLs from bayit-plus-media/ to bayit-plus-media-new/")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_all_urls())
