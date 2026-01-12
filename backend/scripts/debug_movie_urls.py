#!/usr/bin/env python3
"""Debug movie URLs in database."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def debug_urls():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    # Find specific movies
    titles = ["65", "300", "A Man Called Otto"]

    for title in titles:
        cursor = content_collection.find({"title": {"$regex": title, "$options": "i"}})
        async for doc in cursor:
            print(f"\nTitle: {doc.get('title')}")
            print(f"ID: {doc.get('_id')}")
            print(f"Stream URL: {doc.get('stream_url')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(debug_urls())
