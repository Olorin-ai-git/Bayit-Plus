#!/usr/bin/env python3
"""
Fetch TMDB Age Ratings and Tag Kids Movies

This script:
1. Fetches age certifications from TMDB for all movies with TMDB IDs
2. Updates movies with content_rating field (G, PG, PG-13, etc.)
3. Automatically tags G and PG rated movies with "kids-movies" subcategory

Usage:
    cd backend
    poetry run python scripts/fetch_and_tag_kids_movies.py [--dry-run] [--limit N]
"""

import asyncio
import sys
import logging
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

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

# Kid-friendly content ratings
KIDS_RATINGS = {'G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'U', 'Y'}

# TMDB API configuration
TMDB_BASE_URL = "https://api.themoviedb.org/3"


async def fetch_tmdb_certification(tmdb_id: int, client: httpx.AsyncClient) -> Optional[str]:
    """
    Fetch US certification from TMDB for a movie.

    Returns:
        Certification string (e.g., 'G', 'PG', 'PG-13', 'R') or None
    """
    if not settings.TMDB_API_KEY:
        return None

    try:
        # Fetch release dates which contain certifications
        url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/release_dates"
        response = await client.get(url, params={"api_key": settings.TMDB_API_KEY})

        if response.status_code != 200:
            logger.debug(f"  TMDB API failed for ID {tmdb_id}: {response.status_code}")
            return None

        data = response.json()
        results = data.get('results', [])

        # Look for US certification first, then other English-speaking countries
        for country_priority in ['US', 'GB', 'CA', 'AU']:
            for country_data in results:
                if country_data.get('iso_3166_1') == country_priority:
                    release_dates = country_data.get('release_dates', [])
                    for release in release_dates:
                        certification = release.get('certification', '').strip()
                        if certification:
                            logger.debug(f"  Found {country_priority} certification: {certification}")
                            return certification

        return None

    except Exception as e:
        logger.debug(f"  Error fetching TMDB data for {tmdb_id}: {e}")
        return None


async def fetch_and_tag_kids_movies(dry_run: bool = False, limit: Optional[int] = None):
    """
    Fetch TMDB certifications and tag kids movies.

    Args:
        dry_run: If True, only show what would be done without making changes
        limit: Optional limit on number of movies to process
    """
    try:
        # Check TMDB API key
        if not settings.TMDB_API_KEY:
            logger.error("❌ TMDB_API_KEY is not configured. Cannot fetch ratings.")
            logger.info("Please set TMDB_API_KEY in your environment variables or .env file")
            sys.exit(1)

        # Connect to MongoDB
        logger.info("Connecting to MongoDB...")
        mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = mongo_client[settings.MONGODB_DB_NAME]
        content_collection = db["content"]
        logger.info(f"Connected to database: {settings.MONGODB_DB_NAME}")

        # Create HTTP client for TMDB API
        http_client = httpx.AsyncClient(timeout=10.0)

        # Fetch movies with TMDB IDs but no content_rating
        query = {
            "content_type": "movie",
            "tmdb_id": {"$exists": True, "$ne": None},
            "$or": [
                {"content_rating": {"$exists": False}},
                {"content_rating": None},
                {"content_rating": ""}
            ]
        }

        if limit:
            logger.info(f"Fetching up to {limit} movies without content ratings...")
            movies = await content_collection.find(query).limit(limit).to_list(length=limit)
        else:
            logger.info("Fetching all movies without content ratings...")
            movies = await content_collection.find(query).to_list(length=None)

        logger.info(f"Found {len(movies)} movies to process")

        if not movies:
            logger.info("✅ All movies already have content ratings!")
            http_client.close()
            mongo_client.close()
            return

        # Statistics
        fetched_count = 0
        kids_tagged = 0
        failed_count = 0
        no_rating_found = 0

        # Process each movie
        for idx, movie in enumerate(movies, 1):
            title = movie.get('title', 'Unknown')
            tmdb_id = movie.get('tmdb_id')
            year = movie.get('year', 'N/A')

            logger.info(f"[{idx}/{len(movies)}] Processing: {title} ({year}) - TMDB ID: {tmdb_id}")

            # Fetch certification from TMDB
            certification = await fetch_tmdb_certification(tmdb_id, http_client)

            if certification:
                fetched_count += 1
                logger.info(f"  ✓ Found rating: {certification}")

                if dry_run:
                    # Check if it would be tagged as kids
                    if certification.upper() in KIDS_RATINGS:
                        kids_tagged += 1
                        logger.info(f"    → Would TAG as KIDS MOVIE")
                else:
                    # Update movie with content_rating
                    update_operations = {
                        "$set": {
                            "content_rating": certification
                        }
                    }

                    # If it's a kids rating, also tag with kids subcategory
                    if certification.upper() in KIDS_RATINGS:
                        update_operations["$addToSet"] = {
                            "subcategory_ids": KIDS_MOVIES_SUBCATEGORY_ID,
                            "category_ids": KIDS_CATEGORY_ID
                        }
                        update_operations["$set"]["is_kids_content"] = True
                        kids_tagged += 1
                        logger.info(f"    → TAGGED as KIDS MOVIE")

                    # Update in database
                    try:
                        await content_collection.update_one(
                            {"_id": movie["_id"]},
                            update_operations
                        )
                    except Exception as e:
                        logger.error(f"    ✗ Failed to update: {e}")
                        failed_count += 1
            else:
                no_rating_found += 1
                logger.warning(f"  ⚠ No rating found on TMDB")

            # Rate limiting - be nice to TMDB API
            if idx % 20 == 0:
                logger.info(f"  ... Processed {idx}/{len(movies)}, pausing briefly ...")
                await asyncio.sleep(1)

        # Summary
        logger.info("\n" + "="*80)
        logger.info("PROCESSING SUMMARY")
        logger.info("="*80)
        logger.info(f"Total movies processed: {len(movies)}")
        logger.info(f"Ratings fetched from TMDB: {fetched_count}")
        logger.info(f"Kids movies tagged: {kids_tagged}")
        logger.info(f"No rating found: {no_rating_found}")
        logger.info(f"Failed updates: {failed_count}")
        logger.info("="*80)

        if dry_run:
            logger.info("\n🔍 DRY RUN MODE - No changes were made to the database")

        # Cleanup
        await http_client.aclose()
        mongo_client.close()

        logger.info("\n✅ Script completed successfully")

    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Parse arguments
    dry_run = "--dry-run" in sys.argv or "-d" in sys.argv
    limit = None

    for arg in sys.argv:
        if arg.startswith("--limit="):
            try:
                limit = int(arg.split("=")[1])
            except ValueError:
                logger.error("Invalid --limit value. Use --limit=N where N is a number")
                sys.exit(1)

    if dry_run:
        logger.info("🔍 Running in DRY RUN mode - no changes will be made\n")

    asyncio.run(fetch_and_tag_kids_movies(dry_run=dry_run, limit=limit))
