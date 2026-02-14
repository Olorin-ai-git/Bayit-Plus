#!/usr/bin/env python3
"""
Backfill Script: Enrich existing movies with TMDB collection metadata
and auto-create collection parent documents.

Runs two phases:
1. Enrich: Fetch collection metadata from TMDB for movies missing it
2. Detect: Create/update collection parent documents for groups of 2+ movies
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
from app.services.collection_detector_service import collection_detector_service
from app.services.tmdb_service import tmdb_service

logger = get_logger(__name__)


async def phase1_enrich():
    """Phase 1: Add TMDB collection metadata to movies missing it."""
    logger.info("PHASE 1: TMDB Collection Enrichment")
    logger.info("-" * 40)

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

    logger.info("Found %d movies to enrich", len(movies))
    enriched = 0

    for idx, movie in enumerate(movies, 1):
        logger.info("[%d/%d] %s (tmdb_id: %s)", idx, len(movies), movie.title, movie.tmdb_id)

        details = await tmdb_service.get_movie_details(movie.tmdb_id)
        if not details:
            logger.warning("  Failed to fetch TMDB details")
            continue

        btc = details.get("belongs_to_collection")
        if not btc:
            logger.info("  Not part of a collection")
            continue

        collection_poster = None
        if btc.get("poster_path"):
            collection_poster = tmdb_service.get_image_url(btc["poster_path"], "w500")

        await movie.set({
            Content.tmdb_collection_id: btc.get("id"),
            Content.tmdb_collection_name: btc.get("name"),
            Content.tmdb_collection_poster_path: collection_poster,
        })
        enriched += 1
        logger.info("  Added to: %s (ID: %s)", btc.get("name"), btc.get("id"))

    logger.info("Phase 1 complete: %d/%d movies enriched", enriched, len(movies))
    return enriched


async def phase2_detect():
    """Phase 2: Create collection parent documents."""
    logger.info("")
    logger.info("PHASE 2: Collection Parent Detection")
    logger.info("-" * 40)

    stats = await collection_detector_service.scan_all_movies()
    logger.info(
        "Phase 2 complete: %d collections created, %d movies linked",
        stats["collections_created"], stats["movies_linked"],
    )
    return stats


async def main():
    logger.info("=" * 60)
    logger.info("COLLECTION BACKFILL")
    logger.info("=" * 60)

    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    logger.info("")

    enriched = await phase1_enrich()
    stats = await phase2_detect()

    logger.info("")
    logger.info("=" * 60)
    logger.info("BACKFILL COMPLETE")
    logger.info("=" * 60)
    logger.info("  Movies enriched:     %d", enriched)
    logger.info("  Collections created: %d", stats["collections_created"])
    logger.info("  Movies linked:       %d", stats["movies_linked"])
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
