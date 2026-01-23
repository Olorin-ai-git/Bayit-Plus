#!/usr/bin/env python3
"""
Data Fix Script v2: Correct is_series field in content collection

Correctly identifies and fixes:
1. Parent series (have episodes pointing to them) -> is_series=True
2. Episodes (have series_id set) -> is_series=False
3. Standalone movies (no series_id, no children) -> is_series=False

This script is idempotent and safe to run multiple times.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime
from bson import ObjectId

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.core.config import settings


async def fix_is_series_field_v2():
    """Fix is_series field using proper parent-child relationship detection."""
    print("=" * 80)
    print("Content Data Fix v2: Correcting is_series field")
    print("=" * 80)

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie
    await init_beanie(
        database=db,
        document_models=[Content, ContentSection],
    )
    print(f"\nConnected to MongoDB: {settings.MONGODB_DB_NAME}")

    try:
        # Step 1: Find all parent series (content that has episodes pointing to it)
        print("\n" + "=" * 80)
        print("STEP 1: Identifying Parent Series")
        print("=" * 80)

        # Get all unique series_id values (these are IDs of parent series)
        series_ids_raw = await db.content.distinct(
            'series_id',
            {'series_id': {'$ne': None, '$ne': ''}}
        )

        # Convert string IDs to ObjectIds
        parent_series_ids = []
        for sid in series_ids_raw:
            try:
                if sid:  # Skip None or empty strings
                    parent_series_ids.append(ObjectId(sid))
            except Exception:
                pass

        print(f"Found {len(parent_series_ids)} parent series documents (have episodes pointing to them)")

        # Step 2: Fix parent series (set is_series=True)
        print("\n" + "=" * 80)
        print("STEP 2: Fixing Parent Series (setting is_series=True)")
        print("=" * 80)

        if parent_series_ids:
            # Check current state
            parents_to_fix = await db.content.find({
                '_id': {'$in': parent_series_ids},
                'is_series': {'$ne': True}
            }).to_list(length=None)

            if parents_to_fix:
                print(f"Found {len(parents_to_fix)} parent series with incorrect is_series value:")
                for parent in parents_to_fix[:10]:
                    episode_count = await db.content.count_documents({'series_id': str(parent['_id'])})
                    print(f"  - {parent.get('title')} ({episode_count} episodes)")
                if len(parents_to_fix) > 10:
                    print(f"  ... and {len(parents_to_fix) - 10} more")

                # Fix parent series
                result = await db.content.update_many(
                    {
                        '_id': {'$in': parent_series_ids},
                        'is_series': {'$ne': True}
                    },
                    {
                        '$set': {
                            'is_series': True,
                            'updated_at': datetime.now()
                        }
                    }
                )
                print(f"\n✓ Updated {result.modified_count} parent series to is_series=True")
            else:
                print("✓ All parent series already have is_series=True")
        else:
            print("✓ No parent series found")

        # Step 3: Fix episodes (set is_series=False)
        print("\n" + "=" * 80)
        print("STEP 3: Fixing Episodes (setting is_series=False)")
        print("=" * 80)

        episodes_query = {
            'series_id': {'$ne': None, '$ne': ''},
            'is_series': {'$ne': False}
        }

        episodes_to_fix = await db.content.find(episodes_query).to_list(length=None)

        if episodes_to_fix:
            print(f"Found {len(episodes_to_fix)} episodes with incorrect is_series value:")
            for episode in episodes_to_fix[:10]:
                print(f"  - {episode.get('title')} (series_id: {episode.get('series_id')})")
            if len(episodes_to_fix) > 10:
                print(f"  ... and {len(episodes_to_fix) - 10} more")

            result = await db.content.update_many(
                episodes_query,
                {
                    '$set': {
                        'is_series': False,
                        'updated_at': datetime.now()
                    }
                }
            )
            print(f"\n✓ Updated {result.modified_count} episodes to is_series=False")
        else:
            print("✓ All episodes already have is_series=False")

        # Step 4: Ensure standalone content (movies) have is_series=False
        print("\n" + "=" * 80)
        print("STEP 4: Ensuring Standalone Content (Movies) have is_series=False")
        print("=" * 80)

        # Standalone content: no series_id AND not a parent series
        standalone_query = {
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ],
            '_id': {'$nin': parent_series_ids},
            'is_series': {'$ne': False}
        }

        standalone_to_fix = await db.content.find(standalone_query).to_list(length=None)

        if standalone_to_fix:
            print(f"Found {len(standalone_to_fix)} standalone items with incorrect is_series value:")
            for item in standalone_to_fix[:10]:
                print(f"  - {item.get('title')}")
            if len(standalone_to_fix) > 10:
                print(f"  ... and {len(standalone_to_fix) - 10} more")

            result = await db.content.update_many(
                standalone_query,
                {
                    '$set': {
                        'is_series': False,
                        'updated_at': datetime.now()
                    }
                }
            )
            print(f"\n✓ Updated {result.modified_count} standalone items to is_series=False")
        else:
            print("✓ All standalone content already has is_series=False")

        # Step 5: Final verification
        print("\n" + "=" * 80)
        print("STEP 5: Final Verification")
        print("=" * 80)

        total_content = await db.content.count_documents({})
        total_published = await db.content.count_documents({'is_published': True})

        # Count by type after fix
        episodes_count = await db.content.count_documents({
            'series_id': {'$ne': None, '$ne': ''}
        })

        parent_series_count = await db.content.count_documents({
            '_id': {'$in': parent_series_ids}
        })

        standalone_count = await db.content.count_documents({
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ],
            '_id': {'$nin': parent_series_ids}
        })

        print(f"\nTotal content: {total_content}")
        print(f"Published: {total_published}")
        print(f"\nBreakdown:")
        print(f"  - Parent Series: {parent_series_count}")
        print(f"  - Episodes: {episodes_count}")
        print(f"  - Standalone Movies/Clips: {standalone_count}")

        # Verify API query results
        print("\n" + "=" * 80)
        print("STEP 6: Verify API Query Results")
        print("=" * 80)

        # This is what the /content/movies endpoint queries
        movies_api_query = {
            'is_published': True,
            'is_series': {'$ne': True},
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ]
        }
        movies_api_count = await db.content.count_documents(movies_api_query)
        print(f"/content/movies endpoint will return: {movies_api_count} items")

        if movies_api_count > 0:
            print("\nSample movies:")
            sample_movies = await db.content.find(movies_api_query).limit(5).to_list(length=5)
            for movie in sample_movies:
                print(f"  - {movie.get('title')}")

        # This is what the /content/series endpoint queries
        series_api_query = {
            'is_published': True,
            'is_series': True,
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ]
        }
        series_api_count = await db.content.count_documents(series_api_query)
        print(f"\n/content/series endpoint will return: {series_api_count} items")

        if series_api_count > 0:
            print("\nSample series:")
            sample_series = await db.content.find(series_api_query).limit(5).to_list(length=5)
            for series in sample_series:
                episode_count = await db.content.count_documents({'series_id': str(series['_id'])})
                print(f"  - {series.get('title')} ({episode_count} episodes)")

        print("\n" + "=" * 80)
        print("✓ Data fix completed successfully!")
        print("=" * 80)
        print("\n✓ VOD page should now display content correctly")

    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        client.close()
        print("\nDisconnected from MongoDB")

    return True


if __name__ == "__main__":
    success = asyncio.run(fix_is_series_field_v2())
    sys.exit(0 if success else 1)
