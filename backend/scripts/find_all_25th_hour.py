#!/usr/bin/env python3
"""Find ALL 25th Hour records across all collections."""

import asyncio
import os
import sys

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def find_all():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    print(f"Database: {settings.MONGODB_DB_NAME}")
    print(f"Looking for ID: 6964193ff7dfde7d50ef0a6f\n")

    # Check all collections
    collections = await db.list_collection_names()
    print(f"Collections: {collections}\n")

    # Look in content collection
    content_collection = db["content"]

    doc = await content_collection.find_one(
        {"_id": ObjectId("6964193ff7dfde7d50ef0a6f")}
    )
    if doc:
        print("Found in 'content' collection:")
        print(f"  Title: {doc.get('title')}")
        print(f"  Stream URL: {doc.get('stream_url')}")
        print(f"  Stream Type: {doc.get('stream_type')}")
    else:
        print("NOT found in 'content' collection")

    # Check if there's a movies collection
    if "movies" in collections:
        movies_collection = db["movies"]
        doc = await movies_collection.find_one(
            {"_id": ObjectId("6964193ff7dfde7d50ef0a6f")}
        )
        if doc:
            print("\nFound in 'movies' collection:")
            print(f"  Title: {doc.get('title')}")
            print(f"  Stream URL: {doc.get('stream_url')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(find_all())
