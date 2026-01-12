#!/usr/bin/env python3
"""Find duplicate movie records."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def find_duplicates():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find all documents with title containing "25th Hour"
    cursor = content_collection.find({"title": {"$regex": "25th Hour", "$options": "i"}})

    print("All '25th Hour' movies:")
    async for doc in cursor:
        print(f"\nID: {doc['_id']}")
        print(f"Title: {doc.get('title')}")
        print(f"Stream URL: {doc.get('stream_url')}")
        print(f"Published: {doc.get('is_published')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(find_duplicates())
