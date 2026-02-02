#!/usr/bin/env python3
"""
Update Ice Age content to point to new HLS URL

After manual HLS transcoding, this updates the database record
to use the new HLS stream URL.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings


async def update_ice_age_url():
    """Update Ice Age stream URL to HLS"""

    content_id = "6965398bb0b67350385e6e0b"
    new_hls_url = "https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/master.m3u8"

    print("=" * 70)
    print("Updating Ice Age HLS URL in Database")
    print("=" * 70)

    # Connect to MongoDB
    print("\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    print("  ✓ Connected")

    # Get current content
    print(f"\nFetching content: {content_id}")
    content = await db["content"].find_one({"_id": ObjectId(content_id)})

    if not content:
        print(f"  ✗ Content not found!")
        return

    print(f"  ✓ Found: {content['title']}")
    print(f"\n  Current URL: {content.get('stream_url', 'N/A')}")
    print(f"  New HLS URL: {new_hls_url}")

    # Update content
    print("\nUpdating database...")
    result = await db["content"].update_one(
        {"_id": ObjectId(content_id)},
        {
            "$set": {
                "stream_url": new_hls_url,
                "stream_type": "hls",
                "video_metadata.hls_migrated_at": "2026-02-02",
                "video_metadata.hls_bucket": "bayit-plus-media-new",
                "video_metadata.original_stream_url": content.get('stream_url')
            }
        }
    )

    if result.modified_count > 0:
        print("  ✓ Database updated successfully!")
        print(f"\n{'=' * 70}")
        print("✅ SUCCESS!")
        print(f"{'=' * 70}")
        print(f"\nIce Age now streams from: {new_hls_url}")
        print(f"\nTry playing the movie in the app now!")
        print(f"{'=' * 70}")
    else:
        print("  ⚠️  No changes made (URL may already be set)")

    await client.close()


if __name__ == "__main__":
    asyncio.run(update_ice_age_url())
