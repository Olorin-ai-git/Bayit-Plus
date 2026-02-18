"""Clean up true duplicate VOD content (same title, same type).

Handles:
  - movie×movie duplicates (same IMDB → keep oldest, unpublish rest)
  - episode×episode duplicates (keep oldest ObjectId, unpublish rest)
  - series/episode conflicts (keep series record, unpublish episode)
  - movie/series conflicts (keep movie, unpublish series)

Skips:
  - Same-title films with different IMDB IDs (e.g. Karate Kid 1984 vs 2010)

Usage:
    poetry run python scripts/cleanup_vod_duplicates.py            # dry run
    poetry run python scripts/cleanup_vod_duplicates.py --execute  # apply
"""
import asyncio
import logging
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import argparse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _item_kind(item: dict) -> str:
    """Return normalised kind: 'movie', 'episode', or 'series'."""
    ct = (item.get("content_type") or "").lower()
    cat = (item.get("category_name") or "").lower()
    cf = (item.get("content_format") or "").lower()
    if ct == "movie" or (not ct and "movie" in cat):
        return "movie"
    if ct == "episode" or item.get("season") or item.get("episode"):
        return "episode"
    if ct == "series" or "series" in cat or "סדרות" in cat or cf == "series":
        return "series"
    return "unknown"


async def run(dry_run: bool = True) -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    col = db["content"]

    pipeline = [
        {"$match": {"is_published": True}},
        {
            "$group": {
                "_id": "$title",
                "count": {"$sum": 1},
                "items": {
                    "$push": {
                        "id": "$_id",
                        "content_type": "$content_type",
                        "content_format": "$content_format",
                        "category_name": "$category_name",
                        "imdb_id": "$imdb_id",
                        "season": "$season",
                        "episode": "$episode",
                    }
                },
            }
        },
        {"$match": {"count": {"$gt": 1}}},
    ]

    groups = await col.aggregate(pipeline).to_list(length=None)
    logger.info(f"Found {len(groups)} duplicate title groups")

    to_unpublish: list = []
    skipped: list = []

    for group in groups:
        title = group["_id"]
        items = group["items"]

        movies = [i for i in items if _item_kind(i) == "movie"]
        episodes = [i for i in items if _item_kind(i) == "episode"]
        series = [i for i in items if _item_kind(i) == "series"]

        # Movie/series conflict → keep movie, unpublish series entries
        if movies and series:
            for s in series:
                logger.info(f"  [movie/series] '{title}': unpublish series {s['id']}")
                to_unpublish.append(s["id"])
            # Still process remaining movie dupes below (fall through)

        # Series/episode conflict (no movie) → keep series, unpublish episodes
        if series and episodes and not movies:
            for ep in episodes:
                logger.info(
                    f"  [series/episode] '{title}': unpublish episode {ep['id']}"
                )
                to_unpublish.append(ep["id"])
            continue

        # True movie duplicates
        if len(movies) > 1:
            imdb_ids = {m["imdb_id"] for m in movies if m.get("imdb_id")}
            if len(imdb_ids) > 1:
                logger.info(
                    f"  [skip] '{title}' has {len(imdb_ids)} distinct IMDB IDs "
                    f"{imdb_ids} — different films"
                )
                skipped.append(title)
                continue
            sorted_movies = sorted(movies, key=lambda x: x["id"])
            for dup in sorted_movies[1:]:
                logger.info(
                    f"  [movie dupe] '{title}': keep {sorted_movies[0]['id']} "
                    f"→ unpublish {dup['id']}"
                )
                to_unpublish.append(dup["id"])

        # True episode duplicates
        if len(episodes) > 1:
            sorted_eps = sorted(episodes, key=lambda x: x["id"])
            for dup in sorted_eps[1:]:
                logger.info(
                    f"  [episode dupe] '{title}': keep {sorted_eps[0]['id']} "
                    f"→ unpublish {dup['id']}"
                )
                to_unpublish.append(dup["id"])

    logger.info("=" * 60)
    logger.info(f"Skipped (different films): {len(skipped)} — {skipped}")
    logger.info(f"To unpublish: {len(to_unpublish)}")

    if dry_run:
        logger.info("DRY RUN — run with --execute to apply changes")
        client.close()
        return

    if not to_unpublish:
        logger.info("Nothing to unpublish.")
        client.close()
        return

    result = await col.update_many(
        {"_id": {"$in": to_unpublish}},
        {"$set": {"is_published": False, "needs_review": True}},
    )
    logger.info(f"Unpublished {result.modified_count} duplicate documents")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Apply changes")
    args = parser.parse_args()
    asyncio.run(run(dry_run=not args.execute))
