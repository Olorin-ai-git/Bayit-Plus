#!/usr/bin/env python3
"""Audit English subtitles for all published movies.

Buckets: A) missing English sub, B) has English (validate), C) no IMDB ID.
Usage: poetry run python scripts/audit_movie_english_subtitles.py [--dry-run|--fetch] [--limit N] [--fix-sync]
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import connect_to_mongo
from app.core.logging_config import get_logger
from app.services.external_subtitle_service import ExternalSubtitleService
from subtitle_cue_validator import compute_coverage, validate_cues

logger = get_logger(__name__)

_MOVIE_QUERY = {
    "is_published": True,
    "$or": [{"content_format": "movie"}, {"content_type": "movie"}, {"section_ids": "movies"}],
}

_LOW_COVERAGE_THRESHOLD = 50


async def sync_subtitle_counts(db) -> int:
    """Sync has_subtitles / available_subtitle_languages from subtitle_tracks."""
    content_col = db["content"]
    tracks_col = db["subtitle_tracks"]

    cursor = tracks_col.aggregate([
        {"$group": {"_id": "$content_id", "languages": {"$addToSet": "$language"}}}
    ])
    rows = await cursor.to_list(length=None)

    updated = 0
    for row in rows:
        languages = sorted(row["languages"])
        try:
            result = await content_col.update_one(
                {"_id": ObjectId(row["_id"])},
                {"$set": {"available_subtitle_languages": languages, "has_subtitles": True}},
            )
            if result.modified_count:
                updated += 1
        except Exception:
            pass
    return updated


async def classify_movie(movie: dict, tracks_col) -> tuple[str, list[str]]:
    """Classify a movie and validate if English track exists. Returns (bucket, issues)."""
    mid = str(movie["_id"])
    langs = movie.get("available_subtitle_languages", [])

    if "en" not in langs:
        return ("c" if not movie.get("imdb_id") else "a"), []

    track = await tracks_col.find_one({"content_id": mid, "language": "en"})
    if not track:
        return "a", []

    issues = []
    if track.get("content_id") != mid:
        issues.append("linkage mismatch: track.content_id != content._id")
    issues.extend(validate_cues(track.get("cues", [])))

    coverage = compute_coverage(track.get("cues", []), movie.get("duration"))
    if coverage is not None and coverage < _LOW_COVERAGE_THRESHOLD:
        issues.append(f"low coverage: {coverage:.0f}% of content duration")

    return "b", issues


def print_report(bucket_a, bucket_b, bucket_c, validation_results) -> None:
    """Print structured audit report."""
    logger.info("=" * 70)
    logger.info("AUDIT RESULTS")
    logger.info("=" * 70)
    logger.info("A (missing EN sub): %d | B (validated): %d | C (no IMDB): %d",
                len(bucket_a), len(bucket_b), len(bucket_c))
    issues_found = {mid: iss for mid, iss in validation_results.items() if iss}
    logger.info("B clean: %d | B with issues: %d",
                len(validation_results) - len(issues_found), len(issues_found))
    for mid, issues in issues_found.items():
        movie = next((m for m in bucket_b if str(m["_id"]) == mid), None)
        logger.info("  [ISSUES] %s:", movie["title"] if movie else mid)
        for issue in issues:
            logger.info("    - %s", issue)
    for m in bucket_c:
        logger.info("  [NO IMDB] %s", m.get("title", str(m["_id"])))
    for m in bucket_a:
        logger.info("  [MISSING EN] %s (imdb: %s)", m.get("title"), m.get("imdb_id", "none"))


async def fetch_missing(bucket_a: list[dict]) -> None:
    """Fetch English subtitles for movies in Bucket A that have IMDB IDs."""
    fetchable = [m for m in bucket_a if m.get("imdb_id")]
    if not fetchable:
        logger.info("No fetchable movies (all lack IMDB ID)")
        return
    logger.info("Fetching English subtitles for %d movies...", len(fetchable))
    service = ExternalSubtitleService()
    content_ids = [str(m["_id"]) for m in fetchable]
    result = await service.batch_fetch_subtitles(content_ids=content_ids, languages=["en"])
    logger.info(
        "Fetch complete: %d/%d successful, quota remaining: %d",
        result["success"], result["processed"], result["quota_remaining"],
    )
    for detail in result["details"]:
        status = "ok" if detail["status"] == "success" else "FAIL"
        logger.info("  [%s] %s - %s", status, detail["title"], detail.get("source", ""))


async def run(dry_run: bool, fetch: bool, limit: int | None, fix_sync: bool) -> None:
    logger.info("=" * 70)
    logger.info("Movie English Subtitle Audit")
    logger.info("=" * 70)

    await connect_to_mongo()
    raw_client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = raw_client[settings.MONGODB_DB_NAME]

    logger.info("Phase 1: Syncing subtitle counts...")
    synced = await sync_subtitle_counts(db)
    logger.info("Synced %d content records", synced)

    content_col = db["content"]
    tracks_col = db["subtitle_tracks"]
    projection = {"_id": 1, "title": 1, "imdb_id": 1, "available_subtitle_languages": 1, "duration": 1}
    cursor = content_col.find(_MOVIE_QUERY, projection)
    if limit:
        cursor = cursor.limit(limit)
    movies = await cursor.to_list(length=None)
    logger.info("Phase 2: Found %d published movies", len(movies))

    bucket_a, bucket_b, bucket_c = [], [], []
    validation_results = {}

    for movie in movies:
        bucket, issues = await classify_movie(movie, tracks_col)
        if bucket == "a":
            bucket_a.append(movie)
        elif bucket == "b":
            bucket_b.append(movie)
            validation_results[str(movie["_id"])] = issues
        else:
            bucket_c.append(movie)

    print_report(bucket_a, bucket_b, bucket_c, validation_results)

    if fix_sync and synced:
        logger.info("Fix-sync applied: %d records updated", synced)

    if fetch and not dry_run and bucket_a:
        await fetch_missing(bucket_a)
    elif dry_run and bucket_a:
        fetchable = [m for m in bucket_a if m.get("imdb_id")]
        logger.info("[DRY RUN] Would fetch for %d movies (%d have IMDB ID)", len(bucket_a), len(fetchable))

    raw_client.close()
    logger.info("Audit complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit English subtitles for movies")
    parser.add_argument("--dry-run", action="store_true", help="Scan and report only")
    parser.add_argument("--fetch", action="store_true", help="Download missing English subtitles")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N movies")
    parser.add_argument("--fix-sync", action="store_true", help="Auto-fix subtitle language mismatches")
    args = parser.parse_args()

    if not args.fetch:
        args.dry_run = True

    asyncio.run(run(dry_run=args.dry_run, fetch=args.fetch, limit=args.limit, fix_sync=args.fix_sync))


if __name__ == "__main__":
    main()
