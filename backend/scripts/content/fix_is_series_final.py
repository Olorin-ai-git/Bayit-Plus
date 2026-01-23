#!/usr/bin/env python3
"""
Data Fix Script FINAL: Correct is_series field in content collection

Correctly identifies and fixes in the right order:
1. Identify parent series (have episodes pointing to them)
2. Set parent series: is_series=True
3. Set episodes (have valid series_id): is_series=False (excluding parents)
4. Set standalone movies: is_series=False (excluding parents)

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


async def fix_is_series_final():
    """Fix is_series field with correct sequencing."""
    print("=" * 80)
    print("Content Data Fix FINAL: Correcting is_series field")
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
        # Step 1: Identify parent series IDs
        print("\n" + "=" * 80)
        print("STEP 1: Identifying Parent Series")
        print("=" * 80)

        # Get all unique series_id values that point to parent series
        series_ids_raw = await db.content.distinct(
            'series_id',
            {'series_id': {'$ne': None, '$ne': ''}}
        )

        # Convert to ObjectIds
        parent_series_object_ids = []
        for sid in series_ids_raw:
            try:
                if sid:
                    parent_series_object_ids.append(ObjectId(sid))
            except Exception:
                print(f"  Warning: Invalid ObjectId format: {sid}")

        print(f"Identified {len(parent_series_object_ids)} parent series")

        # Get parent details for logging
        if parent_series_object_ids:
            parents = await db.content.find({'_id': {'$in': parent_series_object_ids}}).to_list(length=None)
            print("\nParent series found:")
            for parent in parents[:10]:
                episode_count = await db.content.count_documents({'series_id': str(parent['_id'])})
                print(f"  - {parent.get('title')} (ID: {parent['_id']}, {episode_count} episodes)")
            if len(parents) > 10:
                print(f"  ... and {len(parents) - 10} more")

        # Step 2: Set parent series to is_series=True
        print("\n" + "=" * 80)
        print("STEP 2: Setting Parent Series to is_series=True")
        print("=" * 80)

        if parent_series_object_ids:
            result = await db.content.update_many(
                {'_id': {'$in': parent_series_object_ids}},
                {'$set': {'is_series': True, 'updated_at': datetime.now()}}
            )
            print(f"✓ Updated {result.modified_count} parent series documents")
        else:
            print("✓ No parent series to update")

        # Step 3: Set ALL episodes to is_series=False (episodes have series_id set, excluding parents)
        print("\n" + "=" * 80)
        print("STEP 3: Setting Episodes to is_series=False")
        print("=" * 80)

        # Episodes are documents with a non-null series_id that are NOT parent series
        episodes_query = {
            'series_id': {'$ne': None, '$ne': ''},
            '_id': {'$nin': parent_series_object_ids}  # Exclude parent series
        }

        episodes_count = await db.content.count_documents(episodes_query)
        print(f"Found {episodes_count} episodes to update")

        if episodes_count > 0:
            # Show samples
            sample_episodes = await db.content.find(episodes_query).limit(5).to_list(length=5)
            print("\nSample episodes:")
            for ep in sample_episodes:
                print(f"  - {ep.get('title')} (series_id: {ep.get('series_id')})")

            result = await db.content.update_many(
                episodes_query,
                {'$set': {'is_series': False, 'updated_at': datetime.now()}}
            )
            print(f"\n✓ Updated {result.modified_count} episodes")
        else:
            print("✓ No episodes to update")

        # Step 4: Set standalone content to is_series=False (no series_id, not a parent)
        print("\n" + "=" * 80)
        print("STEP 4: Setting Standalone Content to is_series=False")
        print("=" * 80)

        standalone_query = {
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ],
            '_id': {'$nin': parent_series_object_ids}  # Exclude parent series
        }

        standalone_count = await db.content.count_documents(standalone_query)
        print(f"Found {standalone_count} standalone content items")

        if standalone_count > 0:
            # Show samples
            sample_standalone = await db.content.find(standalone_query).limit(5).to_list(length=5)
            print("\nSample standalone content:")
            for item in sample_standalone:
                print(f"  - {item.get('title')}")

            result = await db.content.update_many(
                standalone_query,
                {'$set': {'is_series': False, 'updated_at': datetime.now()}}
            )
            print(f"\n✓ Updated {result.modified_count} standalone content items")
        else:
            print("✓ No standalone content to update")

        # Step 5: Final verification
        print("\n" + "=" * 80)
        print("STEP 5: Final Verification")
        print("=" * 80)

        total = await db.content.count_documents({})
        published = await db.content.count_documents({'is_published': True})

        parent_count = await db.content.count_documents({'_id': {'$in': parent_series_object_ids}})
        episodes_final = await db.content.count_documents({
            'series_id': {'$ne': None, '$ne': ''},
            '_id': {'$nin': parent_series_object_ids}
        })
        standalone_final = await db.content.count_documents({
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ],
            '_id': {'$nin': parent_series_object_ids}
        })

        print(f"\nTotal content: {total}")
        print(f"Published: {published}")
        print(f"\nBreakdown:")
        print(f"  - Parent Series (is_series=True): {parent_count}")
        print(f"  - Episodes (is_series=False): {episodes_final}")
        print(f"  - Standalone Movies (is_series=False): {standalone_final}")

        # Step 6: Verify API endpoints will work
        print("\n" + "=" * 80)
        print("STEP 6: Verify API Endpoint Queries")
        print("=" * 80)

        # /content/movies endpoint
        movies_api = await db.content.count_documents({
            'is_published': True,
            'is_series': {'$ne': True},
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ]
        })
        print(f"\n/content/movies will return: {movies_api} items")

        if movies_api > 0:
            samples = await db.content.find({
                'is_published': True,
                'is_series': {'$ne': True},
                '$or': [
                    {'series_id': None},
                    {'series_id': {'$exists': False}},
                    {'series_id': ''}
                ]
            }).limit(5).to_list(length=5)
            print("Sample movies:")
            for item in samples:
                print(f"  - {item.get('title')}")

        # /content/series endpoint
        series_api = await db.content.count_documents({
            'is_published': True,
            'is_series': True,
            '$or': [
                {'series_id': None},
                {'series_id': {'$exists': False}},
                {'series_id': ''}
            ]
        })
        print(f"\n/content/series will return: {series_api} items")

        if series_api > 0:
            samples = await db.content.find({
                'is_published': True,
                'is_series': True,
                '$or': [
                    {'series_id': None},
                    {'series_id': {'$exists': False}},
                    {'series_id': ''}
                ]
            }).limit(5).to_list(length=5)
            print("Sample series:")
            for item in samples:
                episode_count = await db.content.count_documents({'series_id': str(item['_id'])})
                print(f"  - {item.get('title')} ({episode_count} episodes)")

        # Final status
        print("\n" + "=" * 80)
        if movies_api > 0 and series_api > 0:
            print("✅ SUCCESS: VOD page should now display both movies and series!")
        elif movies_api > 0:
            print("✅ PARTIAL SUCCESS: Movies will display, but no parent series found")
        else:
            print("⚠️ WARNING: No content will display on VOD page")
        print("=" * 80)

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
    success = asyncio.run(fix_is_series_final())
    sys.exit(0 if success else 1)
