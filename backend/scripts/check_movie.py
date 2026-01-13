#!/usr/bin/env python3
"""Check specific movie details."""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def check_movie():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    movie_id = "6964193ff7dfde7d50ef0a6f"

    print("Checking movie in database...")

    # Check if it has the old bucket URL
    all_with_old_bucket = await content_collection.count_documents({
        "stream_url": {"$regex": "storage.googleapis.com/bayit-plus-media-new/movies"}
    })

    print(f"Total movies still with old bucket URL: {all_with_old_bucket}")

    # Try with ObjectId
    try:
        doc = await content_collection.find_one({"_id": ObjectId(movie_id)})
    except:
        doc = await content_collection.find_one({"_id": movie_id})

    if doc:
        print(f"Title: {doc.get('title')}")
        print(f"ID: {doc.get('_id')}")
        print(f"Stream URL: {doc.get('stream_url')}")
        print(f"Published: {doc.get('is_published')}")
        print(f"Type: {doc.get('type')}")
    else:
        print(f"Movie {movie_id} not found")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_movie())
