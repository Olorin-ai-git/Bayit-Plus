#!/usr/bin/env python3
"""
Sync database URLs with cleaned GCS folder structure.
The GCS folders were cleaned, but database URLs still point to old folder names.
"""

import asyncio
import os
import re
import sys

from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


def extract_folder_and_file(url: str) -> tuple:
    """Extract folder name and file name from GCS URL."""
    # Example: https://storage.googleapis.com/bayit-plus-media-new/movies/310_to_Yuma_BOKUTOX/file.mp4
    # Returns: ("310_to_Yuma_BOKUTOX", "file.mp4")
    match = re.search(r"/movies/([^/]+)/(.+)$", url)
    if match:
        return match.groups()
    return None, None


def find_matching_gcs_folder(old_folder: str, gcs_folders: list) -> str:
    """Find the best matching GCS folder for an old folder name."""
    # Try exact match first
    if old_folder in gcs_folders:
        return old_folder

    # Try cleaning the old folder name to match GCS cleaned names
    cleaned = old_folder

    # Remove common suffixes
    patterns_to_remove = [
        r"_BOKUTOX$",
        r"_GAZ$",
        r"_-AMIABLE$",
        r"_p_-_MX$",
        r"_-_MX$",
        r"_p$",
        r"_TV_-BoK$",
        r"_-_MX\]$",
        r"_p_DD_H264-FGT$",
        r"_PROPER_-TC_HQ_-See$",
        r"_Eng$",
        r"_p_Multi_-DDR$",
        r"_LINE_XviD-MDMA_cd1$",
    ]

    for pattern in patterns_to_remove:
        cleaned = re.sub(pattern, "", cleaned)

    # Check if cleaned version exists
    if cleaned in gcs_folders:
        return cleaned

    # Try fuzzy matching (find folder that starts with the cleaned name)
    for gcs_folder in gcs_folders:
        if gcs_folder.startswith(cleaned):
            return gcs_folder

    return None


async def sync_with_cleaned_folders():
    """Sync database URLs with cleaned GCS folder structure."""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    print("Connected to MongoDB")

    # Get all GCS folders
    storage_client = storage.Client(project="bayit-plus")
    bucket = storage_client.bucket("bayit-plus-media-new")

    print("Fetching GCS folder structure...")
    blobs = bucket.list_blobs(prefix="movies/", delimiter="/")

    # Consume the iterator to get prefixes
    list(blobs)

    gcs_folders = [prefix.split("/")[-2] for prefix in blobs.prefixes]
    print(f"Found {len(gcs_folders)} GCS folders")

    # Find all content with bayit-plus-media-new URLs
    cursor = content_collection.find(
        {"stream_url": {"$regex": "bayit-plus-media-new/movies"}}
    )

    updated_count = 0
    errors = []

    async for doc in cursor:
        doc_id = doc["_id"]
        title = doc.get("title", "Unknown")
        stream_url = doc.get("stream_url", "")

        if not stream_url:
            continue

        # Extract folder and file from URL
        old_folder, filename = extract_folder_and_file(stream_url)

        if not old_folder or not filename:
            print(f"\n⚠️  Could not parse URL: {stream_url}")
            continue

        # Find matching GCS folder
        new_folder = find_matching_gcs_folder(old_folder, gcs_folders)

        if not new_folder:
            error_msg = f"No matching folder for: {old_folder}"
            print(f"\n❌ {title}: {error_msg}")
            errors.append(
                {"title": title, "old_folder": old_folder, "error": error_msg}
            )
            continue

        # Build new URL
        new_url = stream_url.replace(f"/movies/{old_folder}/", f"/movies/{new_folder}/")

        if new_url == stream_url:
            continue  # No change needed

        print(f"\n{title}:")
        print(f"  Old folder: {old_folder}")
        print(f"  New folder: {new_folder}")
        print(f"  Filename: {filename}")

        # Verify the file exists in GCS
        blob = bucket.blob(f"movies/{new_folder}/{filename}")
        if not blob.exists():
            error_msg = f"File not found in GCS: movies/{new_folder}/{filename}"
            print(f"  ❌ {error_msg}")
            errors.append(
                {
                    "title": title,
                    "old_folder": old_folder,
                    "new_folder": new_folder,
                    "filename": filename,
                    "error": error_msg,
                }
            )
            continue

        # Update database
        result = await content_collection.update_one(
            {"_id": doc_id}, {"$set": {"stream_url": new_url}}
        )

        if result.modified_count > 0:
            updated_count += 1
            print(f"  ✅ Updated")

    print(f"\n{'='*60}")
    print(f"✅ Successfully updated {updated_count} documents")

    if errors:
        print(f"\n❌ Encountered {len(errors)} errors:")
        for error in errors:
            print(f"  - {error['title']}: {error['error']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(sync_with_cleaned_folders())
