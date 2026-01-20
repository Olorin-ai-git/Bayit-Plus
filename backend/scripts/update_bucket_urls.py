#!/usr/bin/env python3
"""
Update all movie URLs to point to the new GCS bucket.
Changes: gs://bayit-plus-media/movies -> gs://bayit-plus-media-new/movies
"""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def update_bucket_urls():
    """Update all movie URLs to point to the new bucket."""

    # Connect to MongoDB
    mongo_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongo_url)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    print("Connected to MongoDB")

    # Find all content with old bucket URLs
    old_bucket = "bayit-plus-media"
    new_bucket = "bayit-plus-media-new"

    # Count documents to update
    count = await content_collection.count_documents(
        {
            "$or": [
                {"stream_url": {"$regex": old_bucket}},
                {"preview_url": {"$regex": old_bucket}},
                {"trailer_url": {"$regex": old_bucket}},
                {"poster_url": {"$regex": old_bucket}},
                {"backdrop_url": {"$regex": old_bucket}},
            ]
        }
    )

    print(f"\nFound {count} documents with old bucket URLs")

    if count == 0:
        print("No updates needed!")
        return

    # Find all documents that need updating
    cursor = content_collection.find(
        {
            "$or": [
                {"stream_url": {"$regex": old_bucket}},
                {"preview_url": {"$regex": old_bucket}},
                {"trailer_url": {"$regex": old_bucket}},
                {"poster_url": {"$regex": old_bucket}},
                {"backdrop_url": {"$regex": old_bucket}},
            ]
        }
    )

    updated_count = 0

    async for doc in cursor:
        doc_id = doc["_id"]
        updates = {}

        # Check each URL field
        for field in [
            "stream_url",
            "preview_url",
            "trailer_url",
            "poster_url",
            "backdrop_url",
        ]:
            if field in doc and doc[field] and old_bucket in doc[field]:
                new_url = doc[field].replace(old_bucket, new_bucket)
                updates[field] = new_url
                print(f"\n{doc.get('title', 'Unknown')} - {field}:")
                print(f"  Old: {doc[field]}")
                print(f"  New: {new_url}")

        if updates:
            result = await content_collection.update_one(
                {"_id": doc_id}, {"$set": updates}
            )
            if result.modified_count > 0:
                updated_count += 1

    print(f"\n✅ Successfully updated {updated_count} documents")

    client.close()


if __name__ == "__main__":
    asyncio.run(update_bucket_urls())
