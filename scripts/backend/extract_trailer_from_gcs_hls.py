#!/usr/bin/env python3
"""
Extract a trailer clip from a GCS HLS stream and upload it back to GCS.

Fetches content from MongoDB by partial title match, runs ffmpeg against
the HLS master.m3u8 URL to extract a clip, uploads the MP4 to the
trailers GCS prefix, and updates trailer_stream_url on the content doc.

Usage:
    cd backend
    poetry run python ../scripts/backend/extract_trailer_from_gcs_hls.py \
        --title "Fellowship" \
        --start 180 \
        --duration 150

    # Dry-run (no DB write, no GCS upload):
    poetry run python ../scripts/backend/extract_trailer_from_gcs_hls.py \
        --title "Fellowship" --dry-run
"""

import argparse
import asyncio
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Default clip parameters
DEFAULT_START_SECONDS = 180   # Skip opening credits (3 min in)
DEFAULT_DURATION_SECONDS = 150  # 2.5-minute trailer


def _slug(title: str) -> str:
    """Turn a title into a GCS-safe filename slug."""
    return re.sub(r"[^a-zA-Z0-9]+", "_", title).strip("_").lower()


def _build_public_url(gcs_path: str) -> str:
    return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{gcs_path}"


def _extract_clip(hls_url: str, start: int, duration: int, output_path: str) -> bool:
    """Run ffmpeg to extract a clip from an HLS URL into an MP4."""
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
    logger.info("Running ffmpeg clip extraction", extra={"url": hls_url, "start": start, "duration": duration})
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.error(
            "ffmpeg failed",
            extra={"stderr": result.stderr[-500:]},
        )
        return False
    if not os.path.isfile(output_path):
        logger.error("ffmpeg produced no output file", extra={"path": output_path})
        return False
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    logger.info("Clip extracted", extra={"path": output_path, "size_mb": round(size_mb, 1)})
    return True


def _upload_to_gcs(local_path: str, gcs_object: str) -> str:
    """Upload a local file to GCS via gsutil and return its public URL."""
    gcs_uri = f"gs://{settings.GCS_BUCKET_NAME}/{gcs_object}"

    # Check if already uploaded
    stat = subprocess.run(
        ["gsutil", "-q", "stat", gcs_uri],
        capture_output=True,
    )
    if stat.returncode == 0:
        logger.info("Trailer already in GCS, skipping upload", extra={"gcs_object": gcs_object})
        return _build_public_url(gcs_object)

    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    logger.info(
        "Uploading to GCS",
        extra={"gcs_object": gcs_object, "size_mb": round(size_mb, 1)},
    )
    result = subprocess.run(
        ["gsutil", "-h", "Content-Type:video/mp4", "cp", local_path, gcs_uri],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gsutil upload failed: {result.stderr.strip()}")
    return _build_public_url(gcs_object)


async def process_content(doc: dict, start: int, duration: int, dry_run: bool, db) -> bool:
    title = doc.get("title", "")
    content_id = str(doc["_id"])
    stream_url = doc.get("stream_url", "")
    existing_trailer = doc.get("trailer_stream_url")

    if existing_trailer:
        logger.info("Already has trailer_stream_url, skipping", extra={"title": title})
        return True

    if not stream_url:
        if not doc.get("is_collection_parent"):
            logger.warning("No stream_url on content, skipping", extra={"title": title, "id": content_id})
            return False

        # For collection parents, use the first child movie's stream_url
        first_child = await db["content"].find_one(
            {"collection_parent_id": content_id, "stream_url": {"$exists": True, "$ne": None}},
            sort=[("collection_order", 1)],
        )
        if not first_child or not first_child.get("stream_url"):
            logger.warning(
                "Collection has no child with stream_url, skipping",
                extra={"title": title, "id": content_id},
            )
            return False

        stream_url = first_child["stream_url"]
        logger.info(
            "Using first child stream_url for collection",
            extra={"collection": title, "child": first_child.get("title"), "stream_url": stream_url},
        )

    slug = _slug(title)
    gcs_object = f"{settings.TRAILER_GCS_PATH_PREFIX}/{slug}.mp4"

    logger.info("Processing", extra={"title": title, "id": content_id})

    with tempfile.TemporaryDirectory(prefix="trailer_clip_") as tmp:
        clip_path = os.path.join(tmp, f"{slug}.mp4")

        if dry_run:
            logger.info(
                "[DRY RUN] Would extract clip",
                extra={
                    "hls_url": stream_url,
                    "start": start,
                    "duration": duration,
                    "gcs_object": gcs_object,
                },
            )
            return True

        ok = _extract_clip(stream_url, start, duration, clip_path)
        if not ok:
            return False

        public_url = _upload_to_gcs(clip_path, gcs_object)

    await db["content"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"trailer_stream_url": public_url}},
    )
    logger.info(
        "trailer_stream_url updated",
        extra={"title": title, "id": content_id, "url": public_url},
    )
    return True


async def main(title_filter: str, start: int, duration: int, dry_run: bool) -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    query = {
        "title": {"$regex": title_filter, "$options": "i"},
        "is_published": True,
        "content_type": "movie",
    }
    docs = await db["content"].find(query).to_list(length=None)

    if not docs:
        logger.error("No published content matched", extra={"filter": title_filter})
        client.close()
        sys.exit(1)

    logger.info("Matched content", extra={"count": len(docs), "filter": title_filter})
    for doc in docs:
        logger.info("  - %s (id=%s)", doc.get("title"), doc.get("_id"))

    succeeded = 0
    failed = 0
    for doc in docs:
        ok = await process_content(doc, start, duration, dry_run, db)
        if ok:
            succeeded += 1
        else:
            failed += 1

    client.close()

    logger.info(
        "Done",
        extra={"total": len(docs), "succeeded": succeeded, "failed": failed},
    )
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract trailer clips from GCS HLS content")
    parser.add_argument("--title", required=True, help="Partial title to match (case-insensitive regex)")
    parser.add_argument("--start", type=int, default=DEFAULT_START_SECONDS, help=f"Clip start in seconds (default: {DEFAULT_START_SECONDS})")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION_SECONDS, help=f"Clip duration in seconds (default: {DEFAULT_DURATION_SECONDS})")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing anything")
    args = parser.parse_args()

    asyncio.run(main(args.title, args.start, args.duration, args.dry_run))
