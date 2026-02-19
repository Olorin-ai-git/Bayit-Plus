#!/usr/bin/env python3
"""
Find movies with no subtitles and fetch them from OpenSubtitles.

First syncs subtitle counts from subtitle_tracks to content records,
then fetches subtitles for any movie still missing them.

Usage:
    # Dry run - list movies without subtitles
    poetry run python scripts/fetch_missing_movie_subtitles.py --dry-run

    # Fetch subtitles (default languages: he, en, es)
    poetry run python scripts/fetch_missing_movie_subtitles.py

    # Limit to N movies
    poetry run python scripts/fetch_missing_movie_subtitles.py --limit 20

    # Specific languages only
    poetry run python scripts/fetch_missing_movie_subtitles.py --languages he en
"""

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import connect_to_mongo
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.external_subtitle_service import ExternalSubtitleService

logger = get_logger(__name__)

_MOVIE_QUERY = {
    "is_published": True,
    "$or": [
        {"content_format": "movie"},
        {"content_type": "movie"},
        {"section_ids": "movies"},
    ],
}


async def _sync_subtitle_counts(db) -> int:
    """
    Sync has_subtitles / available_subtitle_languages from subtitle_tracks.
    Returns number of documents updated.
    """
    content_col = db["content"]
    tracks_col = db["subtitle_tracks"]

    cursor = tracks_col.aggregate([
        {"$group": {
            "_id": "$content_id",
            "languages": {"$addToSet": "$language"},
        }}
    ])
    rows = await cursor.to_list(length=None)

    updated = 0
    for row in rows:
        content_id = row["_id"]
        languages = sorted(row["languages"])
        try:
            result = await content_col.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {
                    "available_subtitle_languages": languages,
                    "has_subtitles": True,
                }},
            )
            if result.modified_count:
                updated += 1
        except Exception:
            pass

    return updated


async def find_movies_without_subtitles(db, limit: int | None) -> list[dict]:
    """Return movies where available_subtitle_languages is empty."""
    content_col = db["content"]
    query = {
        **_MOVIE_QUERY,
        "$and": [
            {
                "$or": [
                    {"has_subtitles": False},
                    {"has_subtitles": {"$exists": False}},
                ]
            },
            {
                "$or": [
                    {"available_subtitle_languages": {"$size": 0}},
                    {"available_subtitle_languages": {"$exists": False}},
                ]
            },
        ],
    }
    cursor = content_col.find(query, {"_id": 1, "title": 1, "imdb_id": 1})
    movies = await cursor.to_list(length=limit)
    return movies


async def run(dry_run: bool, limit: int | None, languages: list[str]) -> None:
    logger.info("=" * 70)
    logger.info("Fetch Missing Movie Subtitles")
    logger.info("=" * 70)

    await connect_to_mongo()

    raw_client = AsyncIOMotorClient(settings.MONGODB_URI or settings.MONGODB_URL)
    db = raw_client[settings.MONGODB_DB_NAME]

    # Step 1: sync subtitle counts so the query below reflects reality
    logger.info("Syncing subtitle counts from subtitle_tracks...")
    synced = await _sync_subtitle_counts(db)
    logger.info("Synced %d content records", synced)

    # Step 2: find movies still without subtitles
    movies = await find_movies_without_subtitles(db, limit)
    raw_client.close()

    logger.info("Found %d movies without subtitles", len(movies))
    for m in movies:
        logger.info("  - %s (imdb: %s)", m.get("title"), m.get("imdb_id", "none"))

    if not movies:
        logger.info("All movies already have subtitles.")
        return

    if dry_run:
        logger.info("[DRY RUN] Would fetch subtitles for %d movies", len(movies))
        logger.info("[DRY RUN] Languages: %s", languages)
        return

    # Step 3: fetch subtitles
    logger.info("Fetching subtitles for %d movies (languages: %s)...", len(movies), languages)

    content_ids = [str(m["_id"]) for m in movies]
    service = ExternalSubtitleService()

    start = datetime.utcnow()
    result = await service.batch_fetch_subtitles(
        content_ids=content_ids,
        languages=languages,
    )
    elapsed = (datetime.utcnow() - start).total_seconds()

    logger.info("=" * 70)
    logger.info("FETCH COMPLETE")
    logger.info("=" * 70)
    logger.info("Processed:       %d", result["processed"])
    logger.info("Success:         %d", result["success"])
    logger.info("Failed:          %d", result["failed"])
    logger.info("Quota remaining: %d", result["quota_remaining"])
    logger.info("Elapsed:         %.1fs", elapsed)

    for detail in result["details"]:
        status = "ok" if detail["status"] == "success" else "FAIL"
        logger.info(
            "  [%s] %s (%s) - %s",
            status,
            detail["title"],
            detail["language"],
            detail.get("source", ""),
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch subtitles for movies that have none"
    )
    parser.add_argument("--dry-run", action="store_true", help="List only, no downloads")
    parser.add_argument("--limit", type=int, default=None, help="Max movies to process")
    parser.add_argument(
        "--languages",
        nargs="+",
        default=["he", "en", "es"],
        metavar="LANG",
        help="Languages to fetch (default: he en es)",
    )
    args = parser.parse_args()

    asyncio.run(run(dry_run=args.dry_run, limit=args.limit, languages=args.languages))


if __name__ == "__main__":
    main()
