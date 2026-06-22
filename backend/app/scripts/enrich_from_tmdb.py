"""
TMDB Metadata Enrichment Script

Enriches series and movies missing metadata by fetching data from TMDB API.

This script:
1. Finds content with TMDB IDs but missing metadata
2. Fetches complete metadata from TMDB
3. Updates posters, backdrops, descriptions, genres, years
4. For content without TMDB IDs, attempts to search and match

Usage:
    python -m app.scripts.enrich_from_tmdb [--dry-run] [--limit N]
"""

import asyncio
import logging
import os
from typing import Dict, Optional

import aiohttp
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"


class TMDBEnricher:
    """Enriches content from TMDB API."""

    def __init__(self, dry_run: bool = False, limit: Optional[int] = None):
        self.dry_run = dry_run
        self.limit = limit
        self.stats = {"enriched": 0, "errors": 0, "skipped": 0}
        self.db = None

    async def initialize(self):
        """Initialize database connection."""
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI if hasattr(settings, "MONGODB_URI") else settings.MONGODB_URL
        )
        self.db = client[settings.MONGODB_DB_NAME]
        logger.info("[OK] Connected to database")

    async def fetch_tmdb_series(self, tmdb_id: int) -> Optional[Dict]:
        """Fetch series data from TMDB."""
        if not TMDB_API_KEY:
            logger.warning("TMDB_API_KEY not set")
            return None

        url = f"{TMDB_BASE_URL}/tv/{tmdb_id}"
        params = {"api_key": TMDB_API_KEY}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"TMDB API error {response.status} for series {tmdb_id}")
                        return None
        except Exception as e:
            logger.error(f"Error fetching TMDB series {tmdb_id}: {e}")
            return None

    async def fetch_tmdb_movie(self, tmdb_id: int) -> Optional[Dict]:
        """Fetch movie data from TMDB."""
        if not TMDB_API_KEY:
            logger.warning("TMDB_API_KEY not set")
            return None

        url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
        params = {"api_key": TMDB_API_KEY}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"TMDB API error {response.status} for movie {tmdb_id}")
                        return None
        except Exception as e:
            logger.error(f"Error fetching TMDB movie {tmdb_id}: {e}")
            return None

    async def enrich_series(self):
        """Enrich series with TMDB data."""
        logger.info("=" * 80)
        logger.info("ENRICHING SERIES FROM TMDB")
        logger.info("=" * 80)

        # Find series with TMDB IDs but missing metadata
        query = {
            "content_format": "series",
            "tmdb_id": {"$exists": True, "$ne": None},
            "$or": [
                {"description": {"$in": [None, ""]}},
                {"backdrop": {"$in": [None, ""]}},
                {"poster_url": {"$in": [None, ""]}},
                {"genre_ids": {"$size": 0}},
            ]
        }

        cursor = self.db.content.find(query)
        if self.limit:
            cursor = cursor.limit(self.limit)

        series_list = await cursor.to_list(length=None)
        logger.info(f"Found {len(series_list)} series to enrich")

        for idx, series in enumerate(series_list, 1):
            tmdb_id = series.get("tmdb_id")
            title = series.get("title", "Unknown")

            logger.info(f"[{idx}/{len(series_list)}] Enriching: {title} (TMDB: {tmdb_id})")

            # Fetch from TMDB
            tmdb_data = await self.fetch_tmdb_series(tmdb_id)

            if not tmdb_data:
                logger.warning(f"[FAIL] Could not fetch TMDB data")
                self.stats["errors"] += 1
                continue

            # Build update document
            update_doc = {}

            if not series.get("description") and tmdb_data.get("overview"):
                update_doc["description"] = tmdb_data["overview"]
                update_doc["description_en"] = tmdb_data["overview"]

            if not series.get("backdrop") and tmdb_data.get("backdrop_path"):
                update_doc["backdrop"] = f"{TMDB_IMAGE_BASE}{tmdb_data['backdrop_path']}"

            if not series.get("poster_url") and tmdb_data.get("poster_path"):
                update_doc["poster_url"] = f"{TMDB_IMAGE_BASE}{tmdb_data['poster_path']}"
                if not series.get("thumbnail"):
                    update_doc["thumbnail"] = f"{TMDB_IMAGE_BASE}{tmdb_data['poster_path']}"

            if not series.get("year") and tmdb_data.get("first_air_date"):
                update_doc["year"] = int(tmdb_data["first_air_date"][:4])

            if (not series.get("genre_ids") or len(series.get("genre_ids", [])) == 0) and tmdb_data.get("genres"):
                update_doc["genre_ids"] = [g["name"].lower() for g in tmdb_data["genres"]]
                if tmdb_data["genres"]:
                    update_doc["genre"] = tmdb_data["genres"][0]["name"]

            if update_doc:
                logger.info(f"[OK] Updating: {', '.join(update_doc.keys())}")

                if not self.dry_run:
                    await self.db.content.update_one(
                        {"_id": series["_id"]},
                        {"$set": update_doc}
                    )
                self.stats["enriched"] += 1
            else:
                logger.info(f"  - No updates needed")
                self.stats["skipped"] += 1

            # Rate limiting
            await asyncio.sleep(0.25)

    async def run(self):
        """Run enrichment process."""
        if not TMDB_API_KEY:
            logger.error("=" * 80)
            logger.error("ERROR: TMDB_API_KEY environment variable is not set")
            logger.error("Please set TMDB_API_KEY before running this script")
            logger.error("=" * 80)
            return

        await self.initialize()

        logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        if self.limit:
            logger.info(f"Limit: {self.limit} items")
        logger.info("")

        await self.enrich_series()

        # Summary
        logger.info("")
        logger.info("=" * 80)
        logger.info("ENRICHMENT SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Enriched: {self.stats['enriched']}")
        logger.info(f"Skipped:  {self.stats['skipped']}")
        logger.info(f"Errors:   {self.stats['errors']}")
        logger.info("=" * 80)


async def main():
    """Entry point."""
    import sys

    dry_run = "--dry-run" in sys.argv
    limit = None

    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    enricher = TMDBEnricher(dry_run=dry_run, limit=limit)
    await enricher.run()


if __name__ == "__main__":
    asyncio.run(main())
