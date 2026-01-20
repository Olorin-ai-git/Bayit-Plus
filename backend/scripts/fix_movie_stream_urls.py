#!/usr/bin/env python3
"""
Fix movie stream URLs to match cleaned GCS folder names.
"""

import asyncio
import re

from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGODB_URL = "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority"


def clean_folder_name(folder_name: str) -> str:
    """Clean folder name using same logic as GCS cleanup script."""
    # Remove junk suffixes
    name = re.sub(r"_-?AMIABLE$", "", folder_name)
    name = re.sub(r"_TV_-?BoK$", "", name)
    name = re.sub(r"_p_-?hV$", "", name)
    name = re.sub(r"_BOKUTOX$", "", name)
    name = re.sub(r"_-_MX\]?$", "", name)
    name = re.sub(r"_Rip_-?Sample$", "", name)
    name = re.sub(r"_p$", "", name)
    name = re.sub(r"_-_MX$", "", name)
    name = re.sub(r"_Rip_XViD-juggs$", "", name)
    name = re.sub(r"_Rip_XviD_-?EVO$", "", name)
    name = re.sub(r"_GAZ$", "", name)
    name = re.sub(r"_Eng$", "", name)
    name = re.sub(r"_com_", "_", name)

    # Remove numeric prefixes like "1-3-3-8_"
    name = re.sub(r"^[\d-]+_", "", name)

    return name


async def fix_stream_urls():
    """Update all movie stream URLs to match cleaned GCS folder names."""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client["bayit_plus"]

    print("Fetching movies from database...")
    movies = await db.content.find({"category_name": "Movies"}).to_list(length=None)
    print(f"Found {len(movies)} movies")

    updates = []

    for movie in movies:
        stream_url = movie.get("stream_url", "")
        if not stream_url or "bayit-plus-media-new/movies/" not in stream_url:
            continue

        # Extract folder name from URL
        # URL format: https://storage.googleapis.com/bayit-plus-media-new/movies/FOLDER_NAME/file.mkv
        match = re.search(r"movies/([^/]+)/", stream_url)
        if not match:
            continue

        old_folder = match.group(1)
        new_folder = clean_folder_name(old_folder)

        if old_folder != new_folder:
            new_url = stream_url.replace(
                f"movies/{old_folder}/", f"movies/{new_folder}/"
            )
            updates.append(
                {
                    "id": movie["_id"],
                    "title": movie.get("title", "N/A"),
                    "old_url": stream_url,
                    "new_url": new_url,
                }
            )

    print(f"\nFound {len(updates)} URLs to update")

    if not updates:
        print("No updates needed!")
        return

    # Show first 10 examples
    print("\nFirst 10 examples:")
    print("=" * 120)
    for i, update in enumerate(updates[:10], 1):
        print(f"{i}. {update['title']}")
        print(f"   OLD: {update['old_url']}")
        print(f"   NEW: {update['new_url']}")
        print("-" * 120)

    if len(updates) > 10:
        print(f"... and {len(updates) - 10} more")

    # Confirm
    print(f"\nReady to update {len(updates)} stream URLs")
    confirm = input("Proceed? (yes/no): ")

    if confirm.lower() != "yes":
        print("Cancelled")
        return

    # Apply updates
    print("\nUpdating database...")
    updated_count = 0

    for update in updates:
        result = await db.content.update_one(
            {"_id": update["id"]}, {"$set": {"stream_url": update["new_url"]}}
        )
        if result.modified_count > 0:
            updated_count += 1

    print(f"\n✅ Updated {updated_count} stream URLs")


if __name__ == "__main__":
    asyncio.run(fix_stream_urls())
