#!/usr/bin/env python3
"""Check series structure and parent-child relationships."""
import asyncio
import sys
from pathlib import Path
from bson import ObjectId

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def check_series_structure():
    """Check parent series and episode relationships."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    print("=" * 80)
    print("Checking Series Structure")
    print("=" * 80)

    try:
        # Find all unique series_id values
        series_ids_list = await db.content.distinct(
            'series_id',
            {'series_id': {'$ne': None, '$ne': ''}}
        )
        print(f"\nFound {len(series_ids_list)} unique series_id values (episodes point to these)")

        if not series_ids_list:
            print("\nNo episodes with series_id found!")
            return

        print("\nChecking parent series documents:\n")

        parents_exist = 0
        parents_missing = 0
        parent_details = []

        for series_id_str in series_ids_list:
            try:
                series_id_obj = ObjectId(series_id_str)
                parent = await db.content.find_one({'_id': series_id_obj})

                if parent:
                    parents_exist += 1
                    title = parent.get('title', 'N/A')
                    is_series = parent.get('is_series', 'N/A')
                    has_series_id = parent.get('series_id')
                    episode_count = await db.content.count_documents({'series_id': series_id_str})

                    parent_details.append({
                        'title': title,
                        'is_series': is_series,
                        'has_series_id': has_series_id,
                        'episode_count': episode_count,
                        'id': series_id_str
                    })

                    status = "✓" if is_series and not has_series_id else "✗"
                    print(f"{status} {title:40} | is_series={is_series:5} | has_series_id={bool(has_series_id):5} | {episode_count} episodes")
                else:
                    parents_missing += 1
                    print(f"✗ Missing parent document for series_id: {series_id_str}")

            except Exception as e:
                print(f"✗ Error checking series_id {series_id_str}: {e}")

        print("\n" + "=" * 80)
        print("Summary")
        print("=" * 80)
        print(f"Parent series exist: {parents_exist}")
        print(f"Parent series missing: {parents_missing}")

        # Check if parents need fixing
        need_fixing = [p for p in parent_details if p['is_series'] == False]
        if need_fixing:
            print(f"\n⚠ {len(need_fixing)} parent series have is_series=False (should be True):")
            for p in need_fixing:
                print(f"  - {p['title']} ({p['episode_count']} episodes)")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(check_series_structure())
