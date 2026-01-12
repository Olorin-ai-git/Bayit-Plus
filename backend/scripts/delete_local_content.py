#!/usr/bin/env python3
"""Delete content from local MongoDB."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def delete_local_content():
    # Connect to local MongoDB
    local_url = "mongodb://localhost:27017"
    
    client = AsyncIOMotorClient(local_url)
    db = client["bayit_plus"]
    content_collection = db["content"]

    print("Connected to Local MongoDB\n")

    # Count documents before deletion
    count = await content_collection.count_documents({})
    print(f"Found {count} documents in content collection")
    
    if count > 0:
        # Delete all documents
        result = await content_collection.delete_many({})
        print(f"\n✅ Deleted {result.deleted_count} documents from local content collection")
    else:
        print("No documents to delete")

    client.close()


if __name__ == "__main__":
    asyncio.run(delete_local_content())
