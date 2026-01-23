#!/usr/bin/env python3
"""
Data Fix Script: Correct is_series field in content collection

Problem: Episodes (content with series_id) incorrectly have is_series=True
Solution: Set is_series=False for all episodes (content with series_id set)

This script is idempotent and safe to run multiple times.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.core.config import settings


async def fix_is_series_field():
    """Fix is_series field for episodes and standalone content."""
    print("=" * 80)
    print("Content Data Fix: Correcting is_series field")
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
        # Step 1: Find episodes (has series_id) that incorrectly have is_series=True
        print("\n" + "=" * 80)
        print("STEP 1: Finding episodes with incorrect is_series=True")
        print("=" * 80)

        episodes_query = {
            "series_id": {"$exists": True, "$ne": None, "$ne": ""},
            "is_series": True
        }

        episodes_to_fix = await Content.find(episodes_query).to_list()
        print(f"Found {len(episodes_to_fix)} episodes with is_series=True (should be False)")

        if episodes_to_fix:
            print("\nSample episodes to fix:")
            for ep in episodes_to_fix[:5]:
                print(f"  - {ep.title} (series_id: {ep.series_id}, season: {ep.season}, episode: {ep.episode})")
            if len(episodes_to_fix) > 5:
                print(f"  ... and {len(episodes_to_fix) - 5} more")

        # Step 2: Fix episodes
        print("\n" + "=" * 80)
        print("STEP 2: Fixing episodes (setting is_series=False)")
        print("=" * 80)

        if episodes_to_fix:
            result = await db.content.update_many(
                episodes_query,
                {"$set": {"is_series": False, "updated_at": datetime.utcnow()}}
            )
            print(f"✓ Updated {result.modified_count} episodes")
        else:
            print("✓ No episodes to fix")

        # Step 3: Verify parent series are correct
        print("\n" + "=" * 80)
        print("STEP 3: Verifying parent series configuration")
        print("=" * 80)

        parent_series_query = {
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ],
            "is_series": True
        }

        parent_series = await Content.find(parent_series_query).to_list()
        print(f"Found {len(parent_series)} parent series (correct)")

        if parent_series:
            print("\nParent series:")
            for series in parent_series:
                # Count episodes
                episode_count = await Content.find({"series_id": str(series.id)}).count()
                print(f"  - {series.title} ({episode_count} episodes)")

        # Step 4: Check for standalone content (movies) that might need fixing
        print("\n" + "=" * 80)
        print("STEP 4: Checking standalone content (movies)")
        print("=" * 80)

        # Find standalone content without series_id that's not marked as series
        # These should be movies with is_series=False
        movies_query = {
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ],
            "is_series": {"$ne": True}
        }

        movies = await Content.find(movies_query).to_list()
        print(f"Found {len(movies)} standalone content items (movies/clips)")

        if movies:
            print("\nSample movies:")
            for movie in movies[:5]:
                print(f"  - {movie.title} (is_series={movie.is_series})")
            if len(movies) > 5:
                print(f"  ... and {len(movies) - 5} more")

        # Step 5: Final verification
        print("\n" + "=" * 80)
        print("STEP 5: Final Verification")
        print("=" * 80)

        total_content = await Content.find().count()
        total_published = await Content.find({"is_published": True}).count()

        # Count by type after fix
        episodes_count = await Content.find({
            "series_id": {"$exists": True, "$ne": None, "$ne": ""}
        }).count()

        parent_series_count = await Content.find({
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ],
            "is_series": True
        }).count()

        movies_count = await Content.find({
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ],
            "is_series": {"$ne": True}
        }).count()

        print(f"\nTotal content: {total_content}")
        print(f"Published: {total_published}")
        print(f"\nBreakdown:")
        print(f"  - Episodes: {episodes_count}")
        print(f"  - Parent Series: {parent_series_count}")
        print(f"  - Standalone Movies: {movies_count}")

        # Verify API query results
        print("\n" + "=" * 80)
        print("STEP 6: Verify API Query Results")
        print("=" * 80)

        # This is what the /content/movies endpoint queries
        movies_api_query = {
            "is_published": True,
            "is_series": {"$ne": True},
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ]
        }
        movies_api_count = await Content.find(movies_api_query).count()
        print(f"/content/movies endpoint will return: {movies_api_count} items")

        # This is what the /content/series endpoint queries
        series_api_query = {
            "is_published": True,
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""}
            ]
        }
        series_api_count = await Content.find(series_api_query).count()
        print(f"/content/series endpoint will return: {series_api_count} items")

        print("\n" + "=" * 80)
        print("✓ Data fix completed successfully!")
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
    success = asyncio.run(fix_is_series_field())
    sys.exit(0 if success else 1)
