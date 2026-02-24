"""
Download Posters to GCS Script

For specific movies: downloads TMDB poster images to GCS so they are served
through the backend proxy rather than directly from TMDB's CDN.
Updates the MongoDB thumbnail field to the GCS URL.

For Cinderella and the Big City (no TMDB ID): extracts a frame from the HLS
stream using ffmpeg as a fallback poster.

Usage:
    python -m app.scripts.download_posters_to_gcs [--dry-run]
"""

import asyncio
import logging
import os
import subprocess
import tempfile
from typing import Dict, List, Optional

import aiohttp
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.storage import storage_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_IMG = "https://image.tmdb.org/t/p/w500"

TARGET_TITLES = [
    "Hotel Transylvania",
    "Zootopia",
    "Shrek 2",
    "Avengers: Infinity War",
    "Mary Poppins Returns",
    "Cinderella and the Big City",
]


async def download_image(session: aiohttp.ClientSession, url: str) -> Optional[bytes]:
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as r:
            if r.status == 200:
                return await r.read()
    except Exception as e:
        logger.error("Failed to download %s: %s", url, e)
    return None


async def upload_poster_to_gcs(content_id: str, image_data: bytes) -> Optional[str]:
    remote_path = f"content/{content_id}/poster.jpg"
    try:
        gcs_url = await storage_service.upload_bytes(
            content=image_data,
            remote_path=remote_path,
            content_type="image/jpeg",
        )
        return gcs_url
    except Exception as e:
        logger.error("GCS upload failed for %s: %s", content_id, e)
        return None


async def extract_frame_from_hls(hls_url: str) -> Optional[bytes]:
    """Extract a single frame from an HLS stream using ffmpeg."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", "30",              # seek to 30 seconds (past title cards)
                "-i", hls_url,
                "-frames:v", "1",
                "-q:v", "2",
                "-vf", "scale=500:-1",    # w500 to match TMDB size
                tmp_path,
            ],
            capture_output=True,
            timeout=60,
        )

        if result.returncode == 0 and os.path.exists(tmp_path):
            with open(tmp_path, "rb") as f:
                data = f.read()
            os.unlink(tmp_path)
            if data:
                logger.info("  Extracted frame (%d bytes)", len(data))
                return data
        else:
            logger.warning("  ffmpeg failed: %s", result.stderr.decode()[-200:])
    except subprocess.TimeoutExpired:
        logger.warning("  ffmpeg timed out")
    except Exception as e:
        logger.error("  frame extraction error: %s", e)
    return None


async def run(dry_run: bool = False):
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

            doc = await db.content.find_one(
                {"title": {"$regex": f"^{title}$", "$options": "i"}},
                {"title": 1, "thumbnail": 1, "poster_url": 1, "stream_url": 1, "tmdb_id": 1},
            )
            if not doc:
                logger.warning("  NOT FOUND in database")
                stats["not_found"] += 1
                continue

            content_id = str(doc["_id"])
            existing_thumb = doc.get("thumbnail", "")

            # Skip if already using GCS URL
            if existing_thumb and "storage.googleapis.com" in existing_thumb:
                logger.info("  Already using GCS URL — skipping")
                stats["skipped"] += 1
                continue

            image_data: Optional[bytes] = None

            # Case 1: has TMDB thumbnail URL — download it
            if existing_thumb and "image.tmdb.org" in existing_thumb:
                logger.info("  Downloading TMDB poster: %s", existing_thumb)
                image_data = await download_image(session, existing_thumb)
                if not image_data:
                    # Try original size as fallback
                    orig_url = existing_thumb.replace("/w500/", "/original/")
                    logger.info("  Retrying with original size: %s", orig_url)
                    image_data = await download_image(session, orig_url)

            # Case 2: has poster_url but no thumbnail
            elif doc.get("poster_url") and "image.tmdb.org" in doc.get("poster_url", ""):
                url = doc["poster_url"]
                logger.info("  Downloading from poster_url: %s", url)
                image_data = await download_image(session, url)

            # Case 3: no TMDB image — extract frame from HLS stream
            elif doc.get("stream_url"):
                logger.info("  No TMDB poster — extracting frame from HLS stream")
                image_data = await extract_frame_from_hls(doc["stream_url"])

            if not image_data:
                logger.warning("  Could not obtain image data")
                stats["errors"] += 1
                continue

            logger.info("  Image size: %d bytes", len(image_data))

            if dry_run:
                logger.info("  [DRY RUN] Would upload to GCS and update thumbnail")
                stats["updated"] += 1
                continue

            gcs_url = await upload_poster_to_gcs(content_id, image_data)
            if not gcs_url:
                stats["errors"] += 1
                continue

            await db.content.update_one(
                {"_id": doc["_id"]},
                {"$set": {"thumbnail": gcs_url}},
            )
            logger.info("  Uploaded to GCS: %s", gcs_url)
            logger.info("  Updated thumbnail in MongoDB")
            stats["updated"] += 1

            await asyncio.sleep(0.25)

    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("  Updated:    %d", stats["updated"])
    logger.info("  Skipped:    %d", stats["skipped"])
    logger.info("  Not found:  %d", stats["not_found"])
    logger.info("  Errors:     %d", stats["errors"])
    logger.info("  Mode:       %s", "DRY RUN" if dry_run else "LIVE (GCS + MongoDB updated)")
    logger.info("=" * 60)


def main():
    import sys
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
