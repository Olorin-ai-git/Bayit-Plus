#!/usr/bin/env python3
"""
Extract character frames for Back to the Future interactive moments.

Extracts video frames at each interactive moment timestamp using ffmpeg,
uploads them to GCS via gsutil, and updates MongoDB with GCS URLs.

Usage:
    cd backend && poetry run python scripts/extract_bttf_character_frames.py
"""

import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF_IMDB_ID = "tt0088763"
GCS_BUCKET = "bayit-plus-media-new"


def extract_frame(video_url: str, timestamp: float) -> str:
    """Extract a single frame from video using ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        output_path = tmp.name

    cmd = [
        "ffmpeg",
        "-ss", str(timestamp),
        "-i", video_url,
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed at {timestamp}s: {result.stderr[:300]}"
        )

    return output_path


def upload_to_gcs(local_path: str, gcs_path: str) -> str:
    """Upload file to GCS using gsutil, return public URL."""
    gcs_uri = f"gs://{GCS_BUCKET}/{gcs_path}"
    cmd = ["gsutil", "cp", local_path, gcs_uri]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"gsutil upload failed: {result.stderr[:200]}")

    public_url = (
        f"https://storage.googleapis.com/{GCS_BUCKET}/{gcs_path}"
    )
    return public_url


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error("Back to the Future not found (imdb_id=%s)", BTTF_IMDB_ID)
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    stream_url = content.get("stream_url")
    moments = content.get("interactive_moments", [])

    logger.info(
        "Found BTTF: id=%s, stream_url=%s, moments=%d",
        content_id,
        stream_url[:80] if stream_url else "MISSING",
        len(moments),
    )

    if not stream_url:
        logger.error("No stream_url for Back to the Future")
        client.close()
        sys.exit(1)

    if not moments:
        logger.error("No interactive moments found")
        client.close()
        sys.exit(1)

    updated_count = 0
    for idx, moment in enumerate(moments):
        ts = moment["timestamp"]
        char_name = moment["character_name"]
        existing_frame = moment.get("character_frame_url")

        if existing_frame and existing_frame.startswith("https://"):
            logger.info(
                "Moment %d (%s at %.0fs): already has GCS frame_url",
                idx, char_name, ts,
            )
            continue

        logger.info(
            "Extracting frame for moment %d: %s at %.0fs",
            idx, char_name, ts,
        )

        try:
            frame_path = extract_frame(stream_url, ts)

            gcs_path = (
                f"interactive-moments/{content_id}/"
                f"character_frame_{int(ts)}.jpg"
            )
            gcs_url = upload_to_gcs(frame_path, gcs_path)

            os.unlink(frame_path)

            moment["character_frame_url"] = gcs_url
            updated_count += 1

            logger.info(
                "Uploaded frame for %s at %.0fs: %s",
                char_name, ts, gcs_url,
            )
        except Exception as e:
            logger.error(
                "Failed for %s at %.0fs: %s", char_name, ts, e,
            )

    if updated_count > 0:
        result = await db.content.update_one(
            {"_id": content["_id"]},
            {"$set": {"interactive_moments": moments}},
        )
        logger.info(
            "Updated %d moments with character_frame_url (modified=%d)",
            updated_count,
            result.modified_count,
        )
    else:
        logger.info("No moments needed frame extraction")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
