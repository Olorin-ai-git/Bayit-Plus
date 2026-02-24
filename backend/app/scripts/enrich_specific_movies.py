"""
Targeted Movie Enrichment Script

Fetches TMDB metadata and posters for specific movies missing this info.
For movies without a TMDB ID, searches TMDB by title and picks the best match.
Fetches poster, backdrop, description, year, genres, cast, and IMDB ID.

Usage:
    python -m app.scripts.enrich_specific_movies [--dry-run]
"""

import asyncio
import logging
import os
from difflib import SequenceMatcher
from typing import Dict, List, Optional

import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG = "https://image.tmdb.org/t/p/original"

TARGET_TITLES = [
    "Hotel Transylvania",
    "Zootopia",
    "Shrek 2",
    "Avengers: Infinity War",
    "Mary Poppins Returns",
    "Cinderella and the Big City",
]


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


async def tmdb_get(session: aiohttp.ClientSession, path: str, **params) -> Optional[Dict]:
    params["api_key"] = TMDB_API_KEY
    try:
        async with session.get(
            f"{TMDB_BASE}{path}", params=params, timeout=aiohttp.ClientTimeout(total=10)
        ) as r:
            return await r.json() if r.status == 200 else None
    except Exception as e:
        logger.error("TMDB request failed %s: %s", path, e)
        return None


async def search_movie(session: aiohttp.ClientSession, title: str) -> Optional[int]:
    data = await tmdb_get(session, "/search/movie", query=title)
    if not data or not data.get("results"):
        logger.warning("  No TMDB results for: %s", title)
        return None
    results = data["results"][:5]
    best = max(results, key=lambda r: similarity(title, r.get("title", "")))
    score = similarity(title, best.get("title", ""))
    logger.info("  TMDB match: '%s' (id=%s, score=%.2f)", best.get("title"), best["id"], score)
    return best["id"] if score >= 0.5 else None


async def fetch_movie_details(session: aiohttp.ClientSession, tmdb_id: int) -> Optional[Dict]:
    return await tmdb_get(
        session, f"/movie/{tmdb_id}", append_to_response="credits,external_ids"
    )


def build_update(doc: Dict, tmdb: Dict) -> Dict:
    update: Dict = {}

    if not doc.get("tmdb_id") and tmdb.get("id"):
        update["tmdb_id"] = tmdb["id"]

    if not doc.get("poster_url") and tmdb.get("poster_path"):
        update["poster_url"] = f"{TMDB_IMG}{tmdb['poster_path']}"
    if not doc.get("thumbnail") and tmdb.get("poster_path"):
        update["thumbnail"] = f"{TMDB_IMG}{tmdb['poster_path']}"
    if not doc.get("backdrop") and tmdb.get("backdrop_path"):
        update["backdrop"] = f"{TMDB_IMG}{tmdb['backdrop_path']}"

    if not doc.get("description") and tmdb.get("overview"):
        update["description"] = tmdb["overview"]
        update["description_en"] = tmdb["overview"]

    if not doc.get("year") and tmdb.get("release_date"):
        try:
            update["year"] = int(tmdb["release_date"][:4])
        except (ValueError, TypeError):
            pass

    genres = tmdb.get("genres", [])
    if not doc.get("genre_ids") and genres:
        update["genre_ids"] = [g["name"].lower() for g in genres]
        update["genre"] = genres[0]["name"]

    credits = tmdb.get("credits", {})
    cast = [c["name"] for c in credits.get("cast", [])[:10]]
    if not doc.get("cast") and cast:
        update["cast"] = cast

    ext = tmdb.get("external_ids", {})
    if not doc.get("imdb_id") and ext.get("imdb_id"):
        update["imdb_id"] = ext["imdb_id"]
    if not doc.get("imdb_rating") and tmdb.get("vote_average"):
        update["imdb_rating"] = round(tmdb["vote_average"], 1)

    return update


async def run(dry_run: bool = False):
    if not TMDB_API_KEY:
        logger.error("TMDB_API_KEY is not set — aborting")
        return

    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    logger.info("Connected to MongoDB database: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s\n", "DRY RUN" if dry_run else "LIVE")

    stats = {"updated": 0, "skipped": 0, "not_found": 0, "errors": 0}

    async with aiohttp.ClientSession() as session:
        for title in TARGET_TITLES:
            logger.info("=" * 60)
            logger.info("Processing: %s", title)

            # Find in DB — search by title only (content_format may be None for legacy docs)
            query = {"title": {"$regex": f"^{title}$", "$options": "i"}}
            docs: List[Dict] = await db.content.find(query).to_list(length=None)

            if not docs:
                logger.warning("  NOT FOUND in database: %s", title)
                stats["not_found"] += 1
                continue

            logger.info("  Found %d document(s) in DB", len(docs))

            for doc in docs:
                doc_title = doc.get("title", "Unknown")
                doc_id = doc["_id"]

                # Resolve TMDB ID
                tmdb_id = doc.get("tmdb_id")
                if not tmdb_id:
                    logger.info("  No TMDB ID — searching TMDB for '%s'", doc_title)
                    tmdb_id = await search_movie(session, doc_title)
                    if not tmdb_id:
                        logger.warning("  Could not find TMDB match for: %s", doc_title)
                        stats["errors"] += 1
                        continue
                    await asyncio.sleep(0.25)

                # Fetch full TMDB details
                tmdb = await fetch_movie_details(session, tmdb_id)
                if not tmdb:
                    logger.warning("  TMDB fetch failed for id=%s", tmdb_id)
                    stats["errors"] += 1
                    continue

                update = build_update(doc, tmdb)

                if not update:
                    logger.info("  Already complete — no updates needed")
                    stats["skipped"] += 1
                else:
                    logger.info("  Updating fields: %s", ", ".join(sorted(update.keys())))
                    if not dry_run:
                        await db.content.update_one({"_id": doc_id}, {"$set": update})
                    stats["updated"] += 1

                await asyncio.sleep(0.25)

    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("  Updated:    %d", stats["updated"])
    logger.info("  Skipped:    %d", stats["skipped"])
    logger.info("  Not in DB:  %d", stats["not_found"])
    logger.info("  Errors:     %d", stats["errors"])
    logger.info("  Mode:       %s", "DRY RUN (no writes)" if dry_run else "LIVE (writes committed)")
    logger.info("=" * 60)


def main():
    import sys
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
