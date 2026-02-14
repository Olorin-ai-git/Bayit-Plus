#!/usr/bin/env python3
"""
Enrichment Script: Add TMDB collection metadata to existing movies
Fetches collection information from TMDB API for movies that have tmdb_id but no tmdb_collection_id
"""

import asyncio
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.core.database import connect_to_mongo
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.tmdb_service import tmdb_service

logger = get_logger(__name__)


async def enrich_movie_collections():
    """Enrich movies with TMDB collection metadata"""
    logger.info("=" * 60)
    logger.info("TMDB COLLECTION ENRICHMENT")
    logger.info("=" * 60)

    # Initialize database
    logger.info("Connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

    # Find movies with TMDB ID but no collection ID (missing or null)
    movies = await Content.find(
        {
            "content_type": "movie",
            "tmdb_id": {"$exists": True, "$ne": None},
            "is_collection_parent": {"$ne": True},
            "$or": [
                {"tmdb_collection_id": {"$exists": False}},
                {"tmdb_collection_id": None},
            ],
        }
    ).to_list()

    logger.info(f"Found {len(movies)} movies to enrich")

    enriched_count = 0
    skipped_count = 0
    error_count = 0

    for idx, movie in enumerate(movies, 1):
        logger.info(f"[{idx}/{len(movies)}] Processing: {movie.title}")

        try:
            # Fetch movie details from TMDB using existing tmdb_id
            details = await tmdb_service.get_movie_details(movie.tmdb_id)

            if not details:
                logger.error(f"  ✗ Failed to fetch TMDB details")
                error_count += 1
                continue

            # Check if movie belongs to a collection
            belongs_to_collection = details.get("belongs_to_collection")
            if belongs_to_collection:
                collection_id = belongs_to_collection.get("id")
                collection_name = belongs_to_collection.get("name")
                collection_poster = None

                if belongs_to_collection.get("poster_path"):
                    collection_poster = tmdb_service.get_image_url(
                        belongs_to_collection["poster_path"], "w500"
                    )

                # Update movie with collection metadata
                await movie.set({
                    Content.tmdb_collection_id: collection_id,
                    Content.tmdb_collection_name: collection_name,
                    Content.tmdb_collection_poster_path: collection_poster,
                })

                enriched_count += 1
                logger.info(
                    f"  ✓ Added to collection: {collection_name} "
                    f"(ID: {collection_id})"
                )
            else:
                skipped_count += 1
                logger.info("  - Not part of a collection")

        except Exception as e:
            error_count += 1
            logger.error(f"  ✗ Error enriching movie: {e}", exc_info=True)

    # Display results
    logger.info("=" * 60)
    logger.info("ENRICHMENT COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Movies processed:    {len(movies)}")
    logger.info(f"Collections found:   {enriched_count}")
    logger.info(f"Skipped (no collection): {skipped_count}")
    logger.info(f"Errors:              {error_count}")
    logger.info("=" * 60)

    return {
        "total_processed": len(movies),
        "enriched": enriched_count,
        "skipped": skipped_count,
        "errors": error_count,
    }


if __name__ == "__main__":
    asyncio.run(enrich_movie_collections())
