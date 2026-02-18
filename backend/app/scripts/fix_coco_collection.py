"""
Fix Coco Collection Script

Removes the incorrectly created "Coco Collection" from the database
and deduplicates the two Coco movie entries down to one.

Operations:
1. Delete the Coco collection parent document (is_collection_parent=True)
2. Delete the duplicate Coco movie document
3. Clear collection fields from the remaining Coco movie

Usage:
    python -m app.scripts.fix_coco_collection              # dry-run
    python -m app.scripts.fix_coco_collection --execute    # apply changes
"""

import asyncio
import logging
import re
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

EXECUTE = "--execute" in sys.argv


async def main() -> None:
    mode = "EXECUTE" if EXECUTE else "DRY-RUN"
    logger.info(f"Starting Coco cleanup [{mode}]")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    col = db["content"]

    # --- 1. Find the collection parent ---
    collection_parent = await col.find_one(
        {"is_collection_parent": True, "title": {"$regex": "^Coco", "$options": "i"}}
    )
    if collection_parent:
        logger.info(
            f"Found collection parent: '{collection_parent['title']}' "
            f"(id={collection_parent['_id']}, "
            f"tmdb_collection_id={collection_parent.get('tmdb_collection_id')})"
        )
    else:
        logger.warning("No Coco collection parent found")

    # --- 2. Find all Coco movie entries (not the collection parent) ---
    coco_movies = await col.find(
        {
            "title": {"$regex": "^Coco$", "$options": "i"},
            "is_collection_parent": {"$ne": True},
        }
    ).to_list(length=None)

    logger.info(f"Found {len(coco_movies)} Coco movie document(s):")
    for m in coco_movies:
        logger.info(
            f"  id={m['_id']} | year={m.get('year')} | "
            f"source={m.get('source_provider')} | source_id={m.get('source_id')} "
            f"| collection_parent_id={m.get('collection_parent_id')}"
        )

    if not collection_parent and len(coco_movies) <= 1:
        logger.info("Nothing to fix - already clean.")
        return

    # --- 3. Choose which movie to keep (prefer the one with stream_url + duration) ---
    movie_to_keep = None
    movies_to_delete = []

    if len(coco_movies) >= 2:
        scored = sorted(
            coco_movies,
            key=lambda m: (
                bool(m.get("stream_url")),
                bool(m.get("duration")),
                bool(m.get("imdb_rating")),
                bool(m.get("thumbnail")),
            ),
            reverse=True,
        )
        movie_to_keep = scored[0]
        movies_to_delete = scored[1:]
        logger.info(f"Keeping movie: id={movie_to_keep['_id']}")
        for dup in movies_to_delete:
            logger.info(f"Will delete duplicate movie: id={dup['_id']}")
    elif len(coco_movies) == 1:
        movie_to_keep = coco_movies[0]
        logger.info(f"Only one movie entry, keeping: id={movie_to_keep['_id']}")

    if EXECUTE:
        # Delete collection parent
        if collection_parent:
            await col.delete_one({"_id": collection_parent["_id"]})
            logger.info(f"Deleted collection parent id={collection_parent['_id']}")

        # Delete duplicate movies
        for dup in movies_to_delete:
            await col.delete_one({"_id": dup["_id"]})
            logger.info(f"Deleted duplicate movie id={dup['_id']}")

        # Clear collection fields from the movie to keep
        if movie_to_keep:
            await col.update_one(
                {"_id": movie_to_keep["_id"]},
                {
                    "$unset": {
                        "collection_parent_id": "",
                        "collection_order": "",
                        "tmdb_collection_id": "",
                        "tmdb_collection_name": "",
                        "tmdb_collection_poster_path": "",
                    }
                },
            )
            logger.info(
                f"Cleared collection fields from movie id={movie_to_keep['_id']} "
                f"('{movie_to_keep['title']}')"
            )

        logger.info("Done. Coco is now a standalone movie with no collection.")
    else:
        logger.info(
            "DRY-RUN complete. Re-run with --execute to apply these changes."
        )


if __name__ == "__main__":
    asyncio.run(main())
