#!/usr/bin/env python3
"""
Tag Kids Movies Based on TMDB Age Classifications

Scans all movies in the database and automatically tags them with the
"kids-movies" subcategory based on their content_rating from TMDB.

Kid-friendly ratings include:
- G (General Audiences)
- PG (Parental Guidance Suggested)
- TV-Y (All Children)
- TV-Y7 (Directed to Older Children)
- TV-G (General Audience)
- U (Universal - UK)
- Y (Young Audience - some regions)

Usage:
    cd backend
    poetry run python scripts/tag_kids_movies_by_age_rating.py [--dry-run]
"""

import asyncio
import sys
import logging
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Add parent directory to path
sys.path.insert(0, '/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend')

from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Kids subcategory IDs
KIDS_MOVIES_SUBCATEGORY_ID = "696eec0604bcbb39f7f15169"
KIDS_CATEGORY_ID = "696edc27ef56496cb6aac2a7"

# Kid-friendly content ratings (case-insensitive)
KIDS_RATINGS = {
    'G',       # General Audiences (US)
    'PG',      # Parental Guidance Suggested (US)
    'TV-Y',    # All Children (TV)
    'TV-Y7',   # Directed to Older Children (TV)
    'TV-G',    # General Audience (TV)
    'U',       # Universal (UK)
    'Y',       # Young Audience
    'ALL',     # All Ages (some regions)
    'ATP',     # Suitable for All (Argentina)
    'TOUS',    # All Audiences (France)
}

# Maximum age rating for kids content (e.g., 12 years and under)
MAX_KIDS_AGE = 12


async def tag_kids_movies(dry_run: bool = False):
    """
    Tag movies as kids content based on age ratings.

    Args:
        dry_run: If True, only show what would be tagged without making changes
    """
    try:
        # Connect to MongoDB
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB_NAME]
        content_collection = db["content"]
        logger.info(f"Connected to database: {settings.MONGODB_DB_NAME}")

        # Fetch all movies (not series)
        logger.info("Fetching all movies from database...")
        all_movies = await content_collection.find({
            "content_type": "movie",
            "is_published": True
        }).to_list(length=None)

        logger.info(f"Found {len(all_movies)} total movies")

        # Statistics
        already_tagged = 0
        newly_tagged = 0
        no_rating_info = 0
        not_kids_content = 0
        movies_to_tag: List[Dict[str, Any]] = []

        # Analyze each movie
        for movie in all_movies:
            # Check if already tagged with kids-movies subcategory
            subcategory_ids = movie.get('subcategory_ids', []) or []
            if KIDS_MOVIES_SUBCATEGORY_ID in subcategory_ids:
                already_tagged += 1
                continue

            # Check if movie qualifies as kids content
            is_kids = False
            reason = ""

            # Method 1: Check content_rating (G, PG, TV-Y, etc.)
            content_rating = movie.get('content_rating')
            if content_rating:
                rating_upper = content_rating.upper().strip()
                if rating_upper in KIDS_RATINGS:
                    is_kids = True
                    reason = f"content_rating={content_rating}"

            # Method 2: Check age_rating (numeric age limit)
            age_rating = movie.get('age_rating')
            if not is_kids and age_rating and age_rating <= MAX_KIDS_AGE:
                is_kids = True
                reason = f"age_rating={age_rating}"

            # Method 3: Check if already flagged as kids content
            if not is_kids and movie.get('is_kids_content', False):
                is_kids = True
                reason = "is_kids_content=True"

            if is_kids:
                movies_to_tag.append(movie)
                newly_tagged += 1
                logger.info(
                    f"✓ KIDS: {movie.get('title', 'Unknown')} ({movie.get('year', 'N/A')}) - "
                    f"Reason: {reason}, TMDB ID: {movie.get('tmdb_id', 'N/A')}"
                )
            else:
                not_kids_content += 1
                if content_rating or age_rating:
                    logger.debug(
                        f"✗ NOT KIDS: {movie.get('title', 'Unknown')} - "
                        f"content_rating={content_rating}, age_rating={age_rating}"
                    )
                else:
                    no_rating_info += 1

        # Summary
        logger.info("\n" + "="*80)
        logger.info("TAGGING SUMMARY")
        logger.info("="*80)
        logger.info(f"Total movies analyzed: {len(all_movies)}")
        logger.info(f"Already tagged as Kids: {already_tagged}")
        logger.info(f"Newly identified as Kids: {newly_tagged}")
        logger.info(f"Not kids content: {not_kids_content}")
        logger.info(f"No rating information: {no_rating_info}")
        logger.info("="*80)

        if movies_to_tag:
            logger.info(f"\n{len(movies_to_tag)} movies will be tagged with Kids Movies subcategory")

            if dry_run:
                logger.info("\n🔍 DRY RUN MODE - No changes will be made")
                logger.info("\nMovies that would be tagged:")
                for movie in movies_to_tag[:20]:  # Show first 20
                    logger.info(f"  - {movie.get('title', 'Unknown')} ({movie.get('year', 'N/A')})")
                if len(movies_to_tag) > 20:
                    logger.info(f"  ... and {len(movies_to_tag) - 20} more")
            else:
                logger.info("\n💾 Updating database...")
                updated_count = 0
                failed_count = 0

                for movie in movies_to_tag:
                    try:
                        movie_id = movie.get('_id')
                        if not movie_id:
                            logger.warning(f"  Skipping movie without _id: {movie.get('title', 'Unknown')}")
                            failed_count += 1
                            continue

                        # Prepare update operations
                        update_operations = {
                            "$addToSet": {
                                "subcategory_ids": KIDS_MOVIES_SUBCATEGORY_ID,
                                "category_ids": KIDS_CATEGORY_ID
                            },
                            "$set": {
                                "is_kids_content": True
                            }
                        }

                        # Update in database
                        result = await content_collection.update_one(
                            {"_id": movie_id},
                            update_operations
                        )

                        if result.modified_count > 0:
                            updated_count += 1
                        else:
                            logger.debug(f"  No changes needed for {movie.get('title', 'Unknown')}")
                            updated_count += 1  # Count as success even if no modification

                        if updated_count % 10 == 0:
                            logger.info(f"  Updated {updated_count}/{len(movies_to_tag)} movies...")

                    except Exception as e:
                        logger.error(f"  Failed to update {movie.get('title', 'Unknown')}: {e}")
                        failed_count += 1

                logger.info(f"\n✅ Successfully tagged {updated_count} movies as Kids Movies")
                if failed_count > 0:
                    logger.warning(f"⚠️  Failed to update {failed_count} movies")
        else:
            logger.info("\nNo new movies to tag")

        # Close MongoDB connection
        client.close()
        logger.info("\n✅ Script completed successfully")

    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Check for dry-run flag
    dry_run = "--dry-run" in sys.argv or "-d" in sys.argv

    if dry_run:
        logger.info("🔍 Running in DRY RUN mode - no changes will be made\n")

    asyncio.run(tag_kids_movies(dry_run=dry_run))
