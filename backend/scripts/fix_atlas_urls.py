#!/usr/bin/env python3
"""Update bucket URLs in PRODUCTION MongoDB Atlas."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def fix_atlas_urls():
    # Connect to MongoDB Atlas (production)
    atlas_url = "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0"
    
    client = AsyncIOMotorClient(atlas_url)
    db = client["bayit_plus"]
    content_collection = db["content"]

    print("Connected to MongoDB Atlas\n")

    # Find all content with old bucket URLs
    cursor = content_collection.find({
        "$and": [
            {"stream_url": {"$regex": "bayit-plus-media", "$options": "i"}},
            {"stream_url": {"$not": {"$regex": "bayit-plus-media-new", "$options": "i"}}}
        ]
    })

    updated = 0
    async for doc in cursor:
        old_url = doc.get("stream_url", "")
        new_url = old_url.replace("bayit-plus-media/", "bayit-plus-media-new/")
        
        print(f"Updating: {doc.get('title')}")
        print(f"  Old: {old_url}")
        print(f"  New: {new_url}")
        
        result = await content_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"stream_url": new_url}}
        )
        
        if result.modified_count > 0:
            updated += 1
            print("  ✅ Updated\n")

    print(f"\n✅ Total updated: {updated} URLs from bayit-plus-media/ to bayit-plus-media-new/")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_atlas_urls())
