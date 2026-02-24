"""
Bulk TMDB Poster → GCS Migration

Finds all published non-beta content whose thumbnail points directly to
image.tmdb.org, downloads each poster, uploads to GCS, and updates MongoDB.

Uses gsutil (active gcloud account) to bypass application-default auth expiry.

Usage:
    python -m app.scripts.migrate_tmdb_posters_to_gcs [--dry-run] [--limit N]
"""

import asyncio
import logging
import os
import subprocess
import sys
import tempfile
from typing import Optional

import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BUCKET = "bayit-plus-media-new"
CONCURRENCY = 5          # parallel downloads/uploads
RATE_DELAY = 0.05        # seconds between TMDB requests per worker


async def download(session: aiohttp.ClientSession, url: str) -> Optional[bytes]:
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as r:
            return await r.read() if r.status == 200 else None
    except Exception as e:
        logger.warning("Download failed %s: %s", url[:60], e)
        return None


def gsutil_upload(local_path: str, gcs_dest: str) -> bool:
    result = subprocess.run(
        ["gsutil", "-q",
         "-h", "Content-Type:image/jpeg",
         "-h", "Cache-Control:public, max-age=31536000",
         "cp", local_path, gcs_dest],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        logger.warning("gsutil failed: %s", result.stderr.strip()[-200:])
    return result.returncode == 0


def gcs_public_url(remote_path: str) -> str:
    return f"https://storage.googleapis.com/{BUCKET}/{remote_path}"


async def migrate_one(
    session: aiohttp.ClientSession,
    db,
    doc: dict,
    dry_run: bool,
    semaphore: asyncio.Semaphore,
    stats: dict,
    idx: int,
    total: int,
) -> None:
    async with semaphore:
        content_id = str(doc["_id"])
        title = doc.get("title", "Unknown")[:50]
        thumb_url = doc.get("thumbnail", "")

        if not thumb_url or "image.tmdb.org" not in thumb_url:
            stats["skipped"] += 1
            return

        remote_path = f"content/{content_id}/poster.jpg"
        gcs_url = gcs_public_url(remote_path)

        logger.info("[%d/%d] %s", idx, total, title)

        if dry_run:
            logger.info("  [DRY RUN] %s -> GCS", thumb_url[:60])
            stats["updated"] += 1
            return

        # Download
        image_data = await download(session, thumb_url)
        if not image_data:
            logger.warning("  SKIP: download failed")
            stats["errors"] += 1
            await asyncio.sleep(RATE_DELAY)
            return

        # Write to temp file, upload via gsutil
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        ok = gsutil_upload(tmp_path, f"gs://{BUCKET}/{remote_path}")
        os.unlink(tmp_path)

        if not ok:
            stats["errors"] += 1
            await asyncio.sleep(RATE_DELAY)
            return

        await db.content.update_one(
            {"_id": doc["_id"]},
            {"$set": {"thumbnail": gcs_url}},
        )
        stats["updated"] += 1
        logger.info("  -> %s", gcs_url[: 80])
        await asyncio.sleep(RATE_DELAY)


async def run(dry_run: bool = False, limit: Optional[int] = None) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    logger.info("Connected to %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s\n", "DRY RUN" if dry_run else "LIVE")

    query = {
        "is_published": True,
        "is_beta_content": False,
        "thumbnail": {"$regex": r"image\.tmdb\.org", "$options": "i"},
    }
    cursor = db.content.find(query, {"title": 1, "thumbnail": 1})
    if limit:
        cursor = cursor.limit(limit)
    docs = await cursor.to_list(length=None)

    total = len(docs)
    logger.info("Found %d items with direct TMDB thumbnails\n", total)

    stats = {"updated": 0, "skipped": 0, "errors": 0}
    semaphore = asyncio.Semaphore(CONCURRENCY)

    async with aiohttp.ClientSession() as session:
        tasks = [
            migrate_one(session, db, doc, dry_run, semaphore, stats, i + 1, total)
            for i, doc in enumerate(docs)
        ]
        await asyncio.gather(*tasks)

    logger.info("\n%s", "=" * 60)
    logger.info("SUMMARY")
    logger.info("  Updated: %d", stats["updated"])
    logger.info("  Skipped: %d", stats["skipped"])
    logger.info("  Errors:  %d", stats["errors"])
    logger.info("  Mode:    %s", "DRY RUN" if dry_run else "LIVE")
    logger.info("%s", "=" * 60)


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    limit = None
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
    asyncio.run(run(dry_run=dry_run, limit=limit))


if __name__ == "__main__":
    main()
