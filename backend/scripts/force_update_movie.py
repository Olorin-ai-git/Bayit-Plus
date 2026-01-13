#!/usr/bin/env python3
"""Force update specific movie."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def force_update():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    movie_id = "6964193ff7dfde7d50ef0a6f"

    # Force update with new URL
    result = await content_collection.update_one(
        {"_id": ObjectId(movie_id)},
        {
            "$set": {
                "stream_url": "https://storage.googleapis.com/bayit-plus-media-new/movies/25th_Hour/25th.Hour.2002.HDTV.720p.AC3.5.1-BoK.mkv",
                "stream_type": "video"
            }
        }
    )

    print(f"Matched: {result.matched_count}")
    print(f"Modified: {result.modified_count}")

    # Verify
    doc = await content_collection.find_one({"_id": ObjectId(movie_id)})
    print(f"\nVerification:")
    print(f"Stream URL: {doc.get('stream_url')}")
    print(f"Stream Type: {doc.get('stream_type')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(force_update())
