#!/usr/bin/env python3
"""Fix stream types for direct video files."""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def fix_stream_types():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find all content with stream URLs ending in video extensions
    video_extensions = [".mp4", ".mkv", ".avi", ".mov", ".webm"]

    updated = 0
    for ext in video_extensions:
        cursor = content_collection.find(
            {"stream_url": {"$regex": f"{ext}$", "$options": "i"}, "stream_type": "hls"}
        )

        async for doc in cursor:
            print(f"Updating {doc.get('title')}: {doc.get('stream_url')}")

            result = await content_collection.update_one(
                {"_id": doc["_id"]}, {"$set": {"stream_type": "video"}}
            )

            if result.modified_count > 0:
                updated += 1

    print(f"\n✅ Updated {updated} items to stream_type='video'")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_stream_types())
