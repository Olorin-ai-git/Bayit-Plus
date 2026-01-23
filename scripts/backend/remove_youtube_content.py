#!/usr/bin/env python3
"""Remove all YouTube content from MongoDB database.

This script identifies and removes content that:
- Has stream_url containing youtube.com or youtu.be
- Has thumbnail containing img.youtube.com

Usage:
    # Dry run (shows what would be deleted without actually deleting)
    python scripts/remove_youtube_content.py --dry-run

    # Actually delete YouTube content
    python scripts/remove_youtube_content.py --confirm
"""

import argparse
import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient


async def find_youtube_content(db):
    """Find all content where the actual stream is from YouTube (not trailers)."""
    content_collection = db["content"]

    # Query for content where the STREAM URL is YouTube
    # (not just trailer_url, which many legitimate movies have)
    query = {
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be", "$options": "i"}},
            # Also match content that ONLY has YouTube thumbnails and no valid stream
            {
                "$and": [
                    {"thumbnail": {"$regex": "img\\.youtube\\.com", "$options": "i"}},
                    {
                        "$or": [
                            {"stream_url": {"$exists": False}},
                            {"stream_url": ""},
                            {"stream_url": None},
                        ]
                    },
                ]
            },
        ]
    }

    cursor = content_collection.find(query)
    content_list = await cursor.to_list(length=None)
    return content_list


async def remove_youtube_content(dry_run: bool = True):
    """Remove all YouTube content from the database."""
    # Connect to MongoDB
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("ERROR: MONGODB_URI environment variable not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_uri)
    db = client["bayit_plus"]

    print("Connected to MongoDB\n")
    print("=" * 60)
    print("YOUTUBE CONTENT REMOVAL SCRIPT")
    print("=" * 60)

    if dry_run:
        print("MODE: DRY RUN (no changes will be made)\n")
    else:
        print("MODE: LIVE DELETION\n")

    # Collections to check
    collections_to_check = [
        "content",
        "kids_content",
        "youngsters_content",
        "judaism_content",
    ]

    total_deleted = 0

    for coll_name in collections_to_check:
        print(f"\n--- Checking {coll_name} ---")
        youtube_content = await find_youtube_content_in_collection(db, coll_name)

        if not youtube_content:
            print(f"No YouTube content found in {coll_name}.")
            continue

        print(f"Found {len(youtube_content)} YouTube items in {coll_name}:\n")

        # Display content to be deleted
        for i, doc in enumerate(youtube_content, 1):
            title = doc.get("title", "Untitled")
            stream_url = doc.get("stream_url", "")
            category = doc.get("category_name", doc.get("category_id", "Unknown"))

            print(f"{i}. {title}")
            print(f"   Category: {category}")
            print(f"   Stream URL: {stream_url[:80]}...")

        if not dry_run:
            # Actually delete
            collection = db[coll_name]
            ids_to_delete = [doc["_id"] for doc in youtube_content]
            result = await collection.delete_many({"_id": {"$in": ids_to_delete}})
            print(f"\n✅ DELETED {result.deleted_count} items from {coll_name}")
            total_deleted += result.deleted_count

    print("\n" + "=" * 60)

    if dry_run:
        print("DRY RUN complete. Run with --confirm to actually delete.")
    else:
        print(f"\n✅ TOTAL DELETED: {total_deleted} YouTube content items.")

    client.close()


async def find_youtube_content_in_collection(db, collection_name: str):
    """Find all content where the actual stream is from YouTube in a specific collection."""
    collection = db[collection_name]

    # Query for content where the STREAM URL is YouTube
    query = {
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be", "$options": "i"}},
            {
                "$and": [
                    {"thumbnail": {"$regex": "img\\.youtube\\.com", "$options": "i"}},
                    {
                        "$or": [
                            {"stream_url": {"$exists": False}},
                            {"stream_url": ""},
                            {"stream_url": None},
                        ]
                    },
                ]
            },
        ]
    }

    cursor = collection.find(query)
    content_list = await cursor.to_list(length=None)
    return content_list


def main():
    parser = argparse.ArgumentParser(
        description="Remove all YouTube content from the database"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete YouTube content (requires this flag)",
    )

    args = parser.parse_args()

    if not args.dry_run and not args.confirm:
        print("ERROR: You must specify either --dry-run or --confirm")
        print("  --dry-run: Show what would be deleted")
        print("  --confirm: Actually delete content")
        sys.exit(1)

    dry_run = args.dry_run or not args.confirm
    asyncio.run(remove_youtube_content(dry_run=dry_run))


if __name__ == "__main__":
    main()
