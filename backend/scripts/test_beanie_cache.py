#!/usr/bin/env python3
"""Test if Beanie is caching old data."""

import asyncio
import os
import sys

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import connect_to_mongo
from app.models.content import Content


async def test_cache():
    # Initialize database
    await connect_to_mongo()

    movie_id = "6964193ff7dfde7d50ef0a6f"

    # Method 1: Direct MongoDB query
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    direct_doc = await content_collection.find_one({"_id": ObjectId(movie_id)})
    print("Direct MongoDB query:")
    print(f"  Stream URL: {direct_doc.get('stream_url')}\n")

    # Method 2: Beanie ORM
    movie = await Content.get(movie_id)
    print("Beanie ORM query:")
    print(f"  Stream URL: {movie.stream_url}\n")

    # Compare
    if direct_doc.get("stream_url") == movie.stream_url:
        print("✅ URLs match!")
    else:
        print("❌ URLs DON'T match!")
        print(f"   Direct:  {direct_doc.get('stream_url')}")
        print(f"   Beanie:  {movie.stream_url}")

    client.close()


if __name__ == "__main__":
    asyncio.run(test_cache())
