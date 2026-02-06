"""Tag Israeli content with proper genre and category."""
import asyncio
import sys
import re
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


def is_hebrew_title(title: str) -> bool:
    """Check if title contains Hebrew characters."""
    hebrew_pattern = re.compile(r'[\u0590-\u05FF]')
    return bool(hebrew_pattern.search(title))


KNOWN_ISRAELI_SERIES = [
    'haburganim', 'burganim', 'בורגנים',
    'palmach', 'פלמח', 'פלמ״ח',
    'fauda', 'פאודה',
    'shtisel', 'שטיסל',
    'tehran', 'טהרן',
    'valley of tears', 'עמק הבכא',
    'euphoria', 'אופוריה',
    'המנהרה', 'the tunnel',
    'הנהג', 'the driver',
    'עשרים ואחת', 'twenty one',
]


async def tag_israeli_content(dry_run=True):
    """Tag Israeli content with 'Israeli' genre and proper category."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    # Find content that should be tagged as Israeli
    # 1. Hebrew titles
    # 2. Known Israeli series

    all_content = await collection.find({"is_published": True}).to_list(length=None)

    to_update_israeli_series = []
    to_update_israeli_movies = []

    for item in all_content:
        title = item.get("title", "").lower()
        genres = item.get("genres") or []
        category_name = item.get("category_name", "")

        # Determine if this is series content (NOT using is_series flag)
        series_id = item.get("series_id")
        total_episodes = item.get("total_episodes")
        has_episode_info = item.get("season_number") is not None or item.get("episode_number") is not None

        # Series content if: has series_id (episode) OR has total_episodes (parent series)
        is_series_content = bool(series_id) or bool(total_episodes) or has_episode_info

        # Check if already tagged as Israeli
        if "Israeli" in genres:
            continue

        # Check if should be tagged as Israeli
        should_tag = False

        # Check if title contains Hebrew
        if is_hebrew_title(item.get("title", "")):
            should_tag = True

        # Check if title matches known Israeli content
        for known_title in KNOWN_ISRAELI_SERIES:
            if known_title in title:
                should_tag = True
                break

        if should_tag:
            if is_series_content:
                to_update_israeli_series.append(item)
            else:
                to_update_israeli_movies.append(item)

    print(f"Found {len(to_update_israeli_series)} Israeli series to tag")
    print(f"Found {len(to_update_israeli_movies)} Israeli movies to tag")

    if to_update_israeli_series:
        print("\nIsraeli Series (sample):")
        for item in to_update_israeli_series[:10]:
            print(f"  - {item.get('title')} (ID: {item['_id']})")

    if to_update_israeli_movies:
        print("\nIsraeli Movies (sample):")
        for item in to_update_israeli_movies[:10]:
            print(f"  - {item.get('title')} (ID: {item['_id']})")

    if not dry_run:
        # Update Israeli series
        if to_update_israeli_series:
            series_ids = [item["_id"] for item in to_update_israeli_series]

            # First ensure genres is an array
            await collection.update_many(
                {"_id": {"$in": series_ids}, "genres": None},
                {"$set": {"genres": []}}
            )

            # Then add Israeli genre
            result = await collection.update_many(
                {"_id": {"$in": series_ids}},
                {
                    "$set": {
                        "category_name": "Israeli Series"
                    },
                    "$addToSet": {
                        "genres": "Israeli"
                    }
                }
            )
            print(f"\n✅ Updated {result.modified_count} Israeli series")

        # Update Israeli movies
        if to_update_israeli_movies:
            movie_ids = [item["_id"] for item in to_update_israeli_movies]

            # First ensure genres is an array
            await collection.update_many(
                {"_id": {"$in": movie_ids}, "genres": None},
                {"$set": {"genres": []}}
            )

            # Then add Israeli genre
            result = await collection.update_many(
                {"_id": {"$in": movie_ids}},
                {
                    "$set": {
                        "category_name": "Israeli Movies"
                    },
                    "$addToSet": {
                        "genres": "Israeli"
                    }
                }
            )
            print(f"✅ Updated {result.modified_count} Israeli movies")
    else:
        total = len(to_update_israeli_series) + len(to_update_israeli_movies)
        print(f"\n⚠️  DRY RUN - Would update {total} items")
        print(f"Run with --execute to apply changes")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Execute tagging (default is dry run)")
    args = parser.parse_args()

    asyncio.run(tag_israeli_content(dry_run=not args.execute))
