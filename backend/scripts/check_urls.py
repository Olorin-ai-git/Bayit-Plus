#!/usr/bin/env python3
"""Check URLs in database."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def check_urls():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find the specific movie
    doc = await content_collection.find_one({"_id": ObjectId("6964193ff7dfde7d50ef0a6f")})
    print(f"Movie ID: 6964193ff7dfde7d50ef0a6f")
    print(f"Title: {doc.get('title') if doc else 'NOT FOUND'}")
    print(f"Stream URL: {doc.get('stream_url') if doc else 'NOT FOUND'}")
    print()

    # Count old bucket URLs
    old_count = await content_collection.count_documents({
        "$and": [
            {"stream_url": {"$regex": "bayit-plus-media", "$options": "i"}},
            {"stream_url": {"$not": {"$regex": "bayit-plus-media-new", "$options": "i"}}}
        ]
    })
    print(f"Old bucket URLs: {old_count}")

    # Count new bucket URLs  
    new_count = await content_collection.count_documents({
        "stream_url": {"$regex": "bayit-plus-media-new", "$options": "i"}
    })
    print(f"New bucket URLs: {new_count}")

    # Sample of old URLs
    if old_count > 0:
        print("\nSample old URLs:")
        cursor = content_collection.find({
            "$and": [
                {"stream_url": {"$regex": "bayit-plus-media", "$options": "i"}},
                {"stream_url": {"$not": {"$regex": "bayit-plus-media-new", "$options": "i"}}}
            ]
        }).limit(3)
        async for doc in cursor:
            print(f"  - {doc.get('title')}: {doc.get('stream_url')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_urls())
