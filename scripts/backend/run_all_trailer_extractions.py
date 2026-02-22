#!/usr/bin/env python3
"""
Bulk GCS HLS trailer extraction.

Finds all published movies AND collection parents with no trailer_stream_url,
clips a 150-second segment starting at 180s (skipping opening credits),
uploads the MP4 to GCS, and updates trailer_stream_url in MongoDB.

Collection parents without their own stream_url use their first child
movie's stream_url (sorted by collection_order).

Usage:
    cd backend
    poetry run python ../scripts/backend/run_all_trailer_extractions.py
    poetry run python ../scripts/backend/run_all_trailer_extractions.py --concurrency 4
    poetry run python ../scripts/backend/run_all_trailer_extractions.py --start 120 --duration 90
    poetry run python ../scripts/backend/run_all_trailer_extractions.py --dry-run
"""

import argparse
import asyncio
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

DEFAULT_START = 180
DEFAULT_DURATION = 150
DEFAULT_CONCURRENCY = 3


def _slug(title: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", title).strip("_").lower()


def _build_public_url(gcs_object: str) -> str:
    return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{gcs_object}"


def _extract_clip_sync(hls_url: str, start: int, duration: int, output_path: str) -> bool:
    cmd = [
        "ffmpeg",
        "-ss", str(start),
        "-i", hls_url,
        "-t", str(duration),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-y",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.error("ffmpeg failed", extra={"stderr": result.stderr[-500:]})
        return False
    if not os.path.isfile(output_path):
        logger.error("ffmpeg produced no output file")
        return False
    return True


def _upload_to_gcs_sync(local_path: str, gcs_object: str) -> str:
    gcs_uri = f"gs://{settings.GCS_BUCKET_NAME}/{gcs_object}"

    stat = subprocess.run(["gsutil", "-q", "stat", gcs_uri], capture_output=True)
    if stat.returncode == 0:
        logger.info("Already in GCS, skipping upload", extra={"gcs_object": gcs_object})
        return _build_public_url(gcs_object)

    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    logger.info("Uploading to GCS", extra={"gcs_object": gcs_object, "size_mb": round(size_mb, 1)})
    result = subprocess.run(
        ["gsutil", "-h", "Content-Type:video/mp4", "cp", local_path, gcs_uri],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gsutil upload failed: {result.stderr.strip()}")
    return _build_public_url(gcs_object)


async def _resolve_stream_url(doc: dict, db) -> str | None:
    """Return the stream_url to use for clipping.

    For collection parents with no own stream_url, falls back to the
    first child movie sorted by collection_order.
    """
    stream_url = doc.get("stream_url")
    if stream_url:
        return stream_url

    if not doc.get("is_collection_parent"):
        return None

    content_id = str(doc["_id"])
    child = await db["content"].find_one(
        {"collection_parent_id": content_id, "stream_url": {"$exists": True, "$ne": None}},
        sort=[("collection_order", 1)],
    )
    if child and child.get("stream_url"):
        logger.info(
            "Using first child stream_url for collection",
            extra={"collection": doc.get("title"), "child": child.get("title")},
        )
        return child["stream_url"]

    return None


async def _process_one(
    doc: dict,
    db,
    sem: asyncio.Semaphore,
    start: int,
    duration: int,
    dry_run: bool,
    loop: asyncio.AbstractEventLoop,
) -> bool:
    title = doc.get("title", "")
    content_id = str(doc["_id"])

    stream_url = await _resolve_stream_url(doc, db)
    if not stream_url:
        logger.warning("No stream_url, skipping", extra={"title": title, "id": content_id})
        return False

    slug = _slug(title)
    gcs_object = f"{settings.TRAILER_GCS_PATH_PREFIX}/{slug}.mp4"

    if dry_run:
        logger.info(
            "[DRY-RUN] Would clip",
            extra={"title": title, "start": start, "duration": duration, "gcs_object": gcs_object},
        )
        return True

    async with sem:
        logger.info("Extracting", extra={"title": title, "stream_url": stream_url})
        with tempfile.TemporaryDirectory(prefix="trailer_clip_") as tmp:
            clip_path = os.path.join(tmp, f"{slug}.mp4")

            ok = await loop.run_in_executor(
                None, _extract_clip_sync, stream_url, start, duration, clip_path
            )
            if not ok:
                logger.error("Clip extraction failed", extra={"title": title})
                return False

            try:
                public_url = await loop.run_in_executor(
                    None, _upload_to_gcs_sync, clip_path, gcs_object
                )
            except RuntimeError as exc:
                logger.error("GCS upload failed", extra={"title": title, "error": str(exc)})
                return False

    await db["content"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"trailer_stream_url": public_url}},
    )
    logger.info("Done", extra={"title": title, "url": public_url})
    return True


async def main(start: int, duration: int, concurrency: int, dry_run: bool) -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    missing_trailer = {"$or": [
        {"trailer_stream_url": {"$exists": False}},
        {"trailer_stream_url": None},
    ]}

    # Movies: must have their own stream_url
    movie_query = {
        "is_published": True,
        "content_type": "movie",
        "stream_url": {"$exists": True, "$ne": None},
        **missing_trailer,
    }

    # Collections: no stream_url of their own; child lookup happens in _resolve_stream_url
    collection_query = {
        "is_published": True,
        "is_collection_parent": True,
        **missing_trailer,
    }

    logger.info("Fetching candidates...")
    movies = await db["content"].find(movie_query).to_list(length=None)
    collections = await db["content"].find(collection_query).to_list(length=None)

    # Deduplicate by _id in case a collection also matches the movie query
    seen = set()
    docs = []
    for doc in movies + collections:
        if doc["_id"] not in seen:
            seen.add(doc["_id"])
            docs.append(doc)

    total = len(docs)

    if total == 0:
        logger.info("No content needs trailer extraction.")
        client.close()
        return

    logger.info(
        "Found %d candidates (movies=%d, collections=%d)",
        total, len(movies), len(collections),
    )
    if dry_run:
        logger.info("DRY-RUN: no ffmpeg, no GCS upload, no DB writes")
    else:
        logger.info("Concurrency: %d workers", concurrency)

    sem = asyncio.Semaphore(concurrency)
    loop = asyncio.get_running_loop()
    t0 = time.monotonic()
    extracted = 0
    failed = 0
    completed = 0

    tasks = [
        asyncio.create_task(_process_one(doc, db, sem, start, duration, dry_run, loop))
        for doc in docs
    ]

    for coro in asyncio.as_completed(tasks):
        result = await coro
        completed += 1
        if result:
            extracted += 1
        else:
            failed += 1

        elapsed = time.monotonic() - t0
        rate = completed / elapsed if elapsed > 0 else 0
        eta = (total - completed) / rate if rate > 0 else 0
        logger.info(
            "Progress %d/%d | extracted=%d failed=%d | rate=%.1f/min | eta=%.0fs",
            completed, total, extracted, failed, rate * 60, eta,
        )

    elapsed = time.monotonic() - t0
    logger.info(
        "Complete. total=%d extracted=%d failed=%d elapsed=%.0fs",
        total, extracted, failed, elapsed,
    )
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk GCS HLS trailer extraction")
    parser.add_argument("--start", type=int, default=DEFAULT_START,
                        help=f"Clip start offset in seconds (default: {DEFAULT_START})")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION,
                        help=f"Clip duration in seconds (default: {DEFAULT_DURATION})")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY,
                        help=f"Concurrent ffmpeg+upload workers (default: {DEFAULT_CONCURRENCY})")
    parser.add_argument("--dry-run", action="store_true",
                        help="List candidates without extracting or writing")
    args = parser.parse_args()
    asyncio.run(main(args.start, args.duration, args.concurrency, args.dry_run))
