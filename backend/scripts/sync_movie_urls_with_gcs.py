#!/usr/bin/env python3
"""
Sync movie stream URLs with actual GCS folder structure.
Fixes 404 errors by updating database URLs to match GCS.
"""

import asyncio
import os
import re
import subprocess
from difflib import SequenceMatcher

from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URI")
if not MONGODB_URL:
    raise RuntimeError("MONGODB_URI environment variable not set")
GCS_BUCKET = "bayit-plus-media-new"


def get_gcs_movie_folders():
    """Get list of all movie folders in GCS."""
    result = subprocess.run(
        ["gsutil", "ls", f"gs://{GCS_BUCKET}/movies/"], capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Error listing GCS folders: {result.stderr}")
        return []

    folders = []
    for line in result.stdout.strip().split("\n"):
        if line.strip():
            # Extract folder name from gs://bucket/movies/FOLDER_NAME/
            folder_name = line.strip().rstrip("/").split("/")[-1]
            folders.append(folder_name)

    return folders


def find_best_match(old_folder: str, gcs_folders: list) -> str:
    """Find the best matching GCS folder for an old folder name."""
    # Try exact match first
    if old_folder in gcs_folders:
        return old_folder

    # Try simple cleanup patterns
    cleaned = old_folder
    cleaned = re.sub(r"_com_", "_", cleaned)
    cleaned = re.sub(r"_-?AMIABLE$", "", cleaned)
    cleaned = re.sub(r"_TV_-?BoK$", "", cleaned)
    cleaned = re.sub(r"_p_-?hV$", "", cleaned)
    cleaned = re.sub(r"_BOKUTOX$", "", cleaned)
    cleaned = re.sub(r"_-_MX\]?$", "", cleaned)
    cleaned = re.sub(r"_Rip_-?Sample$", "", cleaned)
    cleaned = re.sub(r"_p$", "", cleaned)
    cleaned = re.sub(r"_-_MX$", "", cleaned)
    cleaned = re.sub(r"_Rip_XViD-juggs$", "", cleaned)
    cleaned = re.sub(r"_Rip_XviD_-?EVO$", "", cleaned)
    cleaned = re.sub(r"_GAZ$", "", cleaned)
    cleaned = re.sub(r"_Eng$", "", cleaned)
    cleaned = re.sub(r"_DD_H264-FGT$", "", cleaned)
    cleaned = re.sub(r"^[\d-]+_", "", cleaned)  # Remove numeric prefix

    if cleaned in gcs_folders:
        return cleaned

    # Try fuzzy matching - find the most similar folder name
    best_match = None
    best_ratio = 0.0

    for gcs_folder in gcs_folders:
        ratio = SequenceMatcher(None, old_folder.lower(), gcs_folder.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = gcs_folder

    # Only return if confidence is high enough
    if best_ratio >= 0.7:
        return best_match

    return None


async def sync_movie_urls():
    """Sync all movie stream URLs with actual GCS folder structure."""
    print("Fetching GCS folder list...")
    gcs_folders = get_gcs_movie_folders()
    print(f"Found {len(gcs_folders)} folders in GCS")

    print("\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client["bayit_plus"]

    print("Fetching movies from database...")
    movies = await db.content.find({"category_name": "Movies"}).to_list(length=None)
    print(f"Found {len(movies)} movies in database")

    updates = []
    not_found = []

    for movie in movies:
        stream_url = movie.get("stream_url", "")
        if not stream_url or f"{GCS_BUCKET}/movies/" not in stream_url:
            continue

        # Extract folder name and filename from URL
        match = re.search(r"movies/([^/]+)/(.+)$", stream_url)
        if not match:
            continue

        old_folder = match.group(1)
        filename = match.group(2)

        # Find best matching GCS folder
        new_folder = find_best_match(old_folder, gcs_folders)

        if new_folder and new_folder != old_folder:
            new_url = stream_url.replace(
                f"movies/{old_folder}/", f"movies/{new_folder}/"
            )
            updates.append(
                {
                    "id": movie["_id"],
                    "title": movie.get("title", "N/A"),
                    "old_folder": old_folder,
                    "new_folder": new_folder,
                    "old_url": stream_url,
                    "new_url": new_url,
                }
            )
        elif not new_folder:
            not_found.append({"title": movie.get("title", "N/A"), "folder": old_folder})

    print(f"\n✅ Found {len(updates)} URLs to update")
    print(f"⚠️  Could not find match for {len(not_found)} movies")

    if updates:
        # Show first 20 examples
        print("\nFirst 20 URL updates:")
        print("=" * 100)
        for i, update in enumerate(updates[:20], 1):
            print(f"{i}. {update['title']}")
            print(f"   {update['old_folder']} → {update['new_folder']}")
            print("-" * 100)

        if len(updates) > 20:
            print(f"... and {len(updates) - 20} more")

        # Apply updates
        print(f"\n🔄 Updating {len(updates)} stream URLs in database...")
        updated_count = 0

        for update in updates:
            result = await db.content.update_one(
                {"_id": update["id"]}, {"$set": {"stream_url": update["new_url"]}}
            )
            if result.modified_count > 0:
                updated_count += 1

        print(f"✅ Updated {updated_count} stream URLs")

    if not_found:
        print(f"\n⚠️  Movies without matching GCS folder ({len(not_found)}):")
        for item in not_found[:10]:
            print(f"   - {item['title']} (folder: {item['folder']})")
        if len(not_found) > 10:
            print(f"   ... and {len(not_found) - 10} more")


if __name__ == "__main__":
    asyncio.run(sync_movie_urls())
