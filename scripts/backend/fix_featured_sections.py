#!/usr/bin/env python3
"""Fix featured content section mappings."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def fix_featured_sections(dry_run=True):
    """Fix featured content section mappings."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    content_col = db["content"]

    # Section IDs
    SERIES_ID = "696edc27ef56496cb6aac2a6"
    ISRAELI_SERIES_ID = "698512c18239d8e593b50b0c"
    MOVIES_ID = "696edc27ef56496cb6aac2a5"
    MUSIC_ID = "696eec0504bcbb39f7f15160"
    DOCUMENTARIES_ID = "696edc27ef56496cb6aac2a9"

    # Fix 1: Move HaBurganim from "series" to "israeli-series"
    print("=" * 80)
    print("FIX 1: Move HaBurganim to Israeli-Series carousel")
    print("=" * 80)

    burganim = await content_col.find_one({
        "title": {"$regex": "^הבורגנים$", "$options": "i"},
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""}
        ]
    })

    if burganim:
        print(f"\n📺 {burganim.get('title')}")
        print(f"   Current featured_order: {burganim.get('featured_order', {})}")

        old_order = burganim.get('featured_order', {}).get(SERIES_ID)
        if old_order is not None:
            new_featured_order = burganim.get('featured_order', {}).copy()
            # Remove from series section
            if SERIES_ID in new_featured_order:
                del new_featured_order[SERIES_ID]
            # Add to israeli-series section
            new_featured_order[ISRAELI_SERIES_ID] = old_order

            print(f"   New featured_order: {new_featured_order}")

            if not dry_run:
                result = await content_col.update_one(
                    {"_id": burganim["_id"]},
                    {"$set": {"featured_order": new_featured_order}}
                )
                print(f"   ✅ Updated HaBurganim (modified: {result.modified_count})")
        else:
            print(f"   ⚠️  HaBurganim not in series section")
    else:
        print("\n❌ HaBurganim not found")

    # Fix 2: Add music content to music section
    print("\n" + "=" * 80)
    print("FIX 2: Add Music content to Music carousel")
    print("=" * 80)

    music_content = await content_col.find({
        "$or": [
            {"category_name": {"$in": ["Music", "מוזיקה"]}},
            {"genres": {"$in": ["Music"]}}
        ],
        "is_published": True,
        "is_featured": True,
    }).limit(10).to_list(length=10)

    print(f"\nFound {len(music_content)} featured music items")

    updated_count = 0
    for idx, item in enumerate(music_content):
        featured_order = item.get('featured_order', {})
        if MUSIC_ID not in featured_order:
            print(f"\n🎵 {item.get('title')}")
            print(f"   Adding to music section with order {idx}")

            new_featured_order = featured_order.copy()
            new_featured_order[MUSIC_ID] = idx

            if not dry_run:
                await content_col.update_one(
                    {"_id": item["_id"]},
                    {"$set": {f"featured_order.{MUSIC_ID}": idx}}
                )
                updated_count += 1

    if not dry_run:
        print(f"\n✅ Added {updated_count} items to music section")
    else:
        print(f"\n⚠️  Would add {len(music_content)} items to music section")

    # Fix 3: Find and feature documentary content
    print("\n" + "=" * 80)
    print("FIX 3: Add Documentary content to Documentaries carousel")
    print("=" * 80)

    # Find documentary content (even if not marked as featured yet)
    doc_content = await content_col.find({
        "$or": [
            {"category_name": {"$in": ["Documentary", "דוקומנטרי"]}},
            {"genres": {"$in": ["Documentary"]}}
        ],
        "is_published": True,
    }).limit(10).to_list(length=10)

    print(f"\nFound {len(doc_content)} published documentary items")

    updated_count = 0
    for idx, item in enumerate(doc_content):
        print(f"\n🎬 {item.get('title')}")
        print(f"   Is Featured: {item.get('is_featured')}")

        if not dry_run:
            # Mark as featured and add to documentaries section
            await content_col.update_one(
                {"_id": item["_id"]},
                {
                    "$set": {
                        "is_featured": True,
                        f"featured_order.{DOCUMENTARIES_ID}": idx
                    }
                }
            )
            updated_count += 1

    if not dry_run:
        print(f"\n✅ Featured {updated_count} documentary items")
    else:
        print(f"\n⚠️  Would feature {len(doc_content)} documentary items")

    if dry_run:
        print("\n" + "=" * 80)
        print("⚠️  DRY RUN - No changes made")
        print("Run with --execute to apply changes")
        print("=" * 80)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Execute fixes (default is dry run)")
    args = parser.parse_args()

    asyncio.run(fix_featured_sections(dry_run=not args.execute))
