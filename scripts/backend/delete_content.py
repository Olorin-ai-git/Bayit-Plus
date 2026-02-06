#!/usr/bin/env python3
"""Delete a content item from the library."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings


async def delete_content(content_id: str, dry_run=True):
    """Delete content item by ID."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    content_col = db["content"]

    # Convert string ID to ObjectId
    try:
        obj_id = ObjectId(content_id)
    except Exception as e:
        print(f"❌ Invalid content ID format: {e}")
        return

    # Find the content
    content = await content_col.find_one({"_id": obj_id})

    if not content:
        print(f"❌ Content not found with ID: {content_id}")
        return

    print("=" * 80)
    print("CONTENT TO DELETE")
    print("=" * 80)
    print(f"\n📺 {content.get('title')}")
    print(f"   ID: {content['_id']}")
    print(f"   Category: {content.get('category_name')}")
    print(f"   Content Format: {content.get('content_format')}")
    print(f"   Is Published: {content.get('is_published')}")
    print(f"   Is Featured: {content.get('is_featured')}")
    print(f"   Year: {content.get('year')}")
    print(f"   Duration: {content.get('duration')}")

    # Check if it's a series parent
    if content.get('total_episodes'):
        print(f"   Total Episodes: {content.get('total_episodes')}")

        # Find episodes
        episodes = await content_col.find({
            "series_id": content_id
        }).to_list(length=None)

        if episodes:
            print(f"\n⚠️  WARNING: This is a series parent with {len(episodes)} episodes")
            print("   Episodes will become orphaned if parent is deleted")
            print("\n   Episodes:")
            for ep in episodes[:5]:
                print(f"     - {ep.get('title')} (ID: {ep['_id']})")
            if len(episodes) > 5:
                print(f"     ... and {len(episodes) - 5} more")

    # Check if it's an episode
    if content.get('series_id'):
        print(f"   Series ID: {content.get('series_id')}")
        print(f"   Season: {content.get('season_number')}")
        print(f"   Episode: {content.get('episode_number')}")

    if not dry_run:
        # Delete the content
        result = await content_col.delete_one({"_id": obj_id})

        if result.deleted_count > 0:
            print(f"\n✅ Deleted content: {content.get('title')} (ID: {content_id})")
        else:
            print(f"\n❌ Failed to delete content")
    else:
        print("\n" + "=" * 80)
        print("⚠️  DRY RUN - No changes made")
        print("Run with --execute to delete this content")
        print("=" * 80)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("content_id", help="Content ID to delete")
    parser.add_argument("--execute", action="store_true", help="Execute deletion (default is dry run)")
    args = parser.parse_args()

    asyncio.run(delete_content(args.content_id, dry_run=not args.execute))
