#!/usr/bin/env python3
"""
Sync database URLs with cleaned GCS folder structure using gsutil.
"""

import asyncio
import os
import sys
import re
import subprocess
from motor.motor_asyncio import AsyncIOMotorClient

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


def extract_folder_and_file(url: str) -> tuple:
    """Extract folder name and file name from GCS URL."""
    match = re.search(r'/movies/([^/]+)/(.+)$', url)
    if match:
        return match.groups()
    return None, None


def get_gcs_folders() -> list:
    """Get list of folders in GCS bucket using gsutil."""
    result = subprocess.run(
        ["gsutil", "ls", "gs://bayit-plus-media-new/movies/"],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"Error listing GCS folders: {result.stderr}")
        return []

    # Parse folder names from output
    # Format: gs://bayit-plus-media-new/movies/folder_name/
    folders = []
    for line in result.stdout.strip().split('\n'):
        if line.endswith('/'):
            folder = line.rstrip('/').split('/')[-1]
            folders.append(folder)

    return folders


def find_matching_gcs_folder(old_folder: str, gcs_folders: list) -> str:
    """Find the best matching GCS folder for an old folder name."""
    # Try exact match first
    if old_folder in gcs_folders:
        return old_folder

    # Try cleaning the old folder name to match GCS cleaned names
    cleaned = old_folder

    # Remove common suffixes (order matters - most specific first)
    patterns_to_remove = [
        r'_com_Winnie_the_Pooh_-AMIABLE$',
        r'_PROPER_-TC_HQ_-See$',
        r'_p_DD_H264-FGT$',
        r'_LINE_XviD-MDMA_cd1$',
        r'_p_Multi_-DDR$',
        r'_p_-_MX$',
        r'_-_MX\]$',
        r'_-_MX$',
        r'_TV_-BoK$',
        r'_-AMIABLE$',
        r'_BOKUTOX$',
        r'_p_-hV$',  # Added for 300
        r'_GAZ$',
        r'_Eng$',
        r'_p$',
    ]

    for pattern in patterns_to_remove:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    # Remove _p_ prefix patterns
    cleaned = re.sub(r'_com_', '_', cleaned)

    # Check if cleaned version exists
    if cleaned in gcs_folders:
        return cleaned

    # Try fuzzy matching (find folder that starts with cleaned name)
    for gcs_folder in gcs_folders:
        if gcs_folder.lower() == cleaned.lower():
            return gcs_folder

    # Try prefix matching
    cleaned_lower = cleaned.lower()
    for gcs_folder in gcs_folders:
        if gcs_folder.lower().startswith(cleaned_lower):
            return gcs_folder

    return None


def verify_file_exists(folder: str, filename: str) -> bool:
    """Verify a file exists in GCS using gsutil."""
    gcs_path = f"gs://bayit-plus-media-new/movies/{folder}/{filename}"
    result = subprocess.run(
        ["gsutil", "ls", gcs_path],
        capture_output=True,
        text=True
    )
    return result.returncode == 0


async def sync_with_cleaned_folders():
    """Sync database URLs with cleaned GCS folder structure."""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_collection = db["content"]

    print("Connected to MongoDB")

    # Get all GCS folders using gsutil
    print("Fetching GCS folder structure...")
    gcs_folders = get_gcs_folders()
    print(f"Found {len(gcs_folders)} GCS folders")

    if not gcs_folders:
        print("❌ No GCS folders found. Exiting.")
        return

    # Find all content with bayit-plus-media-new URLs
    cursor = content_collection.find({
        "stream_url": {"$regex": "bayit-plus-media-new/movies"}
    })

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
            errors.append({"title": title, "old_folder": old_folder, "error": error_msg})
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
        if not verify_file_exists(new_folder, filename):
            error_msg = f"File not found in GCS: movies/{new_folder}/{filename}"
            print(f"  ❌ {error_msg}")
            errors.append({
                "title": title,
                "old_folder": old_folder,
                "new_folder": new_folder,
                "filename": filename,
                "error": error_msg
            })
            continue

        # Update database
        result = await content_collection.update_one(
            {"_id": doc_id},
            {"$set": {"stream_url": new_url}}
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
