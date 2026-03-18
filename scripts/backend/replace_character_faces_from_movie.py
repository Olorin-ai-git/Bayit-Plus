#!/usr/bin/env python3
"""
Replace character face images with authentic movie frames.

Extracts a video frame at each character's first interactive moment timestamp,
uploads to GCS, and updates both the content.interactive_characters array
and the standalone characters collection.

Usage:
    cd backend && poetry run python ../scripts/backend/replace_character_faces_from_movie.py
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
GCS_PREFIX = "vod-interactions/character-faces"


# Map character name -> best timestamp (seconds) where they have a clear face shot.
# These are manually picked from the interactive_moments list.
CHARACTER_TIMESTAMPS = {
    "Marty McFly": 5100,
    "Emmett Brown": 1080,
    "George McFly": 2670,
    "Lorraine Baines": 1680,
    "Jennifer Parker": 300,
    "Biff Tannen": 3120,
}

# Map interactive_characters name -> characters collection name
COLLECTION_NAME_MAP = {
    "Emmett Brown": "Doc Brown",
}


def extract_frame(stream_url: str, timestamp: float) -> str:
    """Extract a single frame from HLS stream using ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        output_path = tmp.name

    cmd = [
        "ffmpeg",
        "-ss", str(timestamp),
        "-i", stream_url,
        "-frames:v", "1",
        "-q:v", "1",
        "-vf", "scale=480:-1",
        "-y",
        output_path,
    ]

    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed at {timestamp}s: {result.stderr[:300]}"
        )

    size = os.path.getsize(output_path)
    logger.info("Extracted frame: %s (%d bytes)", output_path, size)
    return output_path


def upload_to_gcs(local_path: str, filename: str) -> str:
    """Upload file to GCS, return public URL."""
    gcs_path = f"{GCS_PREFIX}/{filename}"
    gcs_uri = f"gs://{GCS_BUCKET}/{gcs_path}"

    cmd = [
        "gsutil", "-h", "Cache-Control:public, max-age=86400",
        "cp", local_path, gcs_uri,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"gsutil upload failed: {result.stderr[:200]}")

    public_url = f"https://storage.googleapis.com/{GCS_BUCKET}/{gcs_path}"
    return public_url


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error("BTTF not found (imdb_id=%s)", BTTF_IMDB_ID)
        client.close()
        sys.exit(1)

    stream_url = content.get("stream_url")
    if not stream_url:
        logger.error("No stream_url for BTTF")
        client.close()
        sys.exit(1)

    interactive_chars = content.get("interactive_characters", [])
    logger.info(
        "Found %d interactive characters, stream: %s",
        len(interactive_chars),
        stream_url[:80],
    )

    updated_urls = {}

    for char in interactive_chars:
        name = char["name"]
        ts = CHARACTER_TIMESTAMPS.get(name)
        if ts is None:
            logger.warning("No timestamp mapping for %s, skipping", name)
            continue

        slug = name.lower().replace(" ", "_").replace("'", "")
        filename = f"{slug}_movie_frame.jpg"

        logger.info("Extracting %s at %ds from movie...", name, ts)
        try:
            frame_path = extract_frame(stream_url, ts)
            gcs_url = upload_to_gcs(frame_path, filename)
            os.unlink(frame_path)

            updated_urls[name] = gcs_url
            logger.info("Uploaded movie frame for %s: %s", name, gcs_url)
        except Exception as exc:
            logger.error("Failed for %s: %s", name, exc)

    if not updated_urls:
        logger.info("No frames extracted, nothing to update")
        client.close()
        return

    # Update interactive_characters in content document
    for char in interactive_chars:
        if char["name"] in updated_urls:
            char["frame_url"] = updated_urls[char["name"]]

    result = await db.content.update_one(
        {"_id": content["_id"]},
        {"$set": {"interactive_characters": interactive_chars}},
    )
    logger.info(
        "Updated content.interactive_characters (modified=%d)",
        result.modified_count,
    )

    # Update standalone characters collection
    for ic_name, url in updated_urls.items():
        collection_name = COLLECTION_NAME_MAP.get(ic_name, ic_name)
        result = await db.characters.update_one(
            {"name": collection_name},
            {"$set": {"face_url": url}},
        )
        if result.modified_count > 0:
            logger.info(
                "Updated characters.%s face_url", collection_name,
            )
        else:
            logger.warning(
                "No match in characters collection for %s", collection_name,
            )

    client.close()
    logger.info("Done. Replaced %d character faces with movie frames.", len(updated_urls))


if __name__ == "__main__":
    asyncio.run(main())
