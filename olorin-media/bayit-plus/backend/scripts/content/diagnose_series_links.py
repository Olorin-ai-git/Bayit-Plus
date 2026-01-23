#!/usr/bin/env python3
"""Diagnose series-episode linking issues."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def diagnose_series_links():
    """Diagnose series-episode relationships."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    print("=" * 80)
    print("Diagnosing Series-Episode Links")
    print("=" * 80)

    try:
        # Check all distinct series_id values
        print("\nChecking all distinct series_id values in database:")
        all_series_ids = await db.content.distinct('series_id')
        print(f"Found {len(all_series_ids)} distinct series_id values:")
        for sid in all_series_ids:
            count = await db.content.count_documents({'series_id': sid})
            print(f"  - series_id={sid!r} ({type(sid).__name__}): {count} documents")

        # Check parent series configuration
        print("\n" + "=" * 80)
        print("Checking Parent Series")
        print("=" * 80)

        # Find content marked as series
        parent_series = await db.content.find({'is_series': True}).to_list(length=None)
        print(f"\nFound {len(parent_series)} documents with is_series=True:")

        for parent in parent_series[:10]:
            title = parent.get('title')
            parent_id = str(parent.get('_id'))
            has_series_id = parent.get('series_id')

            # Count episodes
            episode_count = await db.content.count_documents({'series_id': parent_id})

            print(f"\n  {title}")
            print(f"    ID: {parent_id}")
            print(f"    series_id: {has_series_id!r}")
            print(f"    Episodes with series_id={parent_id}: {episode_count}")

            if episode_count > 0:
                episodes = await db.content.find({'series_id': parent_id}).limit(3).to_list(length=3)
                for ep in episodes:
                    print(f"      - {ep.get('title')} (S{ep.get('season')}E{ep.get('episode')})")

        # Check for orphaned episodes
        print("\n" + "=" * 80)
        print("Checking for Orphaned Episodes")
        print("=" * 80)

        # Get all series_id values that aren't None
        series_ids_with_values = [sid for sid in all_series_ids if sid]
        print(f"\nFound {len(series_ids_with_values)} non-null series_id values")

        # Check if these parent IDs exist
        for sid in series_ids_with_values[:10]:
            from bson import ObjectId
            try:
                parent_exists = await db.content.find_one({'_id': ObjectId(sid)})
                episode_count = await db.content.count_documents({'series_id': sid})

                if parent_exists:
                    status = "✓"
                    parent_title = parent_exists.get('title')
                else:
                    status = "✗"
                    parent_title = "MISSING"

                print(f"  {status} series_id={sid}: parent={parent_title}, {episode_count} episodes")
            except Exception as e:
                print(f"  ✗ Invalid ObjectId: {sid} ({e})")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(diagnose_series_links())
