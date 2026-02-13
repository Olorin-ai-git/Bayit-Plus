#!/usr/bin/env python3
"""
Upload Minority Report from local MKV to HLS.

Pipeline:
1. Convert MKV to HLS (H.264 + AAC, 10s segments)
2. Create master.m3u8 manifest
3. Upload HLS directory to GCS
4. Fetch TMDB metadata
5. Create MongoDB content entry
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from bson import ObjectId
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SOURCE_FILE = "/Users/olorin/Movies/Minority Report/Minority Report_t00.mkv"
GCS_PATH = "movies/Minority_Report/hls"
CONTENT_TITLE = "Minority Report"


def probe_video(file_path: str) -> dict:
    """Get video file info via ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        return {}
    return json.loads(result.stdout)


async def convert_to_hls(input_path: str, output_dir: str) -> dict:
    """Convert video to HLS format using ffmpeg."""
    os.makedirs(output_dir, exist_ok=True)
    playlist_path = os.path.join(output_dir, "playlist.m3u8")
    segment_pattern = os.path.join(output_dir, "segment_%04d.ts")

    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-map", "0:v:0",
        "-map", "0:a:0",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ac", "2",
        "-hls_time", "10",
        "-hls_list_size", "0",
        "-hls_segment_filename", segment_pattern,
        "-f", "hls",
        "-y",
        playlist_path,
    ]

    logger.info("Starting ffmpeg HLS conversion...")
    logger.info("  Input: %s", input_path)
    logger.info("  Output: %s", output_dir)

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode()[-1000:]
        raise RuntimeError(f"ffmpeg failed (exit {process.returncode}): {error_msg}")

    if not os.path.exists(playlist_path):
        raise RuntimeError("playlist.m3u8 was not created")

    segments = [f for f in os.listdir(output_dir) if f.endswith(".ts")]
    total_size = sum(
        os.path.getsize(os.path.join(output_dir, f))
        for f in os.listdir(output_dir)
    )

    master_path = os.path.join(output_dir, "master.m3u8")
    with open(master_path, "w") as f:
        f.write("#EXTM3U\n#EXT-X-VERSION:3\n\n")
        f.write("#EXT-X-STREAM-INF:BANDWIDTH=5000000\n")
        f.write("playlist.m3u8\n")

    return {
        "playlist_path": playlist_path,
        "master_path": master_path,
        "segment_count": len(segments),
        "total_size_mb": total_size / (1024 * 1024),
    }


async def upload_hls_to_gcs(hls_dir: str, gcs_path: str, bucket_name: str) -> str:
    """Upload HLS directory to GCS. Returns master.m3u8 URL."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    files = sorted(Path(hls_dir).glob("*"))
    total = len([f for f in files if f.is_file()])
    uploaded = 0

    content_types = {
        ".m3u8": "application/vnd.apple.mpegurl",
        ".ts": "video/MP2T",
        ".vtt": "text/vtt",
    }

    master_url = None

    for file_path in files:
        if not file_path.is_file():
            continue

        blob_name = f"{gcs_path}/{file_path.name}"
        blob = bucket.blob(blob_name)
        ext = file_path.suffix.lower()
        ct = content_types.get(ext, "application/octet-stream")

        for attempt in range(3):
            try:
                blob.upload_from_filename(str(file_path), content_type=ct)
                break
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"Upload failed for {file_path.name}: {e}")
                logger.warning("  Retry %d for %s", attempt + 1, file_path.name)
                await asyncio.sleep(2 ** attempt)

        uploaded += 1
        url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"

        if file_path.name == "master.m3u8":
            master_url = url

        if uploaded % 100 == 0 or uploaded == total:
            logger.info(
                "  Uploaded %d/%d files (%.0f%%)",
                uploaded, total, (uploaded / total) * 100,
            )

    return master_url


async def get_tmdb_metadata(title: str, api_key: str) -> dict | None:
    """Fetch movie metadata from TMDB API."""
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.themoviedb.org/3/search/movie",
                params={"api_key": api_key, "query": title},
                timeout=10.0,
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            if not results:
                return None

            movie = results[0]
            release_year = None
            if movie.get("release_date"):
                try:
                    release_year = int(movie["release_date"][:4])
                except (ValueError, IndexError):
                    pass

            return {
                "title": movie.get("title"),
                "description": movie.get("overview"),
                "year": release_year,
                "rating": movie.get("vote_average"),
                "tmdb_id": movie.get("id"),
                "thumbnail": (
                    f"https://image.tmdb.org/t/p/w500{movie['poster_path']}"
                    if movie.get("poster_path")
                    else None
                ),
                "backdrop": (
                    f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                    if movie.get("backdrop_path")
                    else None
                ),
            }
    except Exception as e:
        logger.warning("TMDB API error: %s", e)
        return None


async def main():
    settings = get_settings()

    # Fix credentials path if pointing to stale location
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    correct_creds = str(PROJECT_ROOT / "backend" / "credentials" / "bayit-plus-7c3927963c21.json")
    if not os.path.exists(creds_path) and os.path.exists(correct_creds):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = correct_creds
        logger.info("Fixed GOOGLE_APPLICATION_CREDENTIALS -> %s", correct_creds)

    logger.info("=" * 70)
    logger.info("Minority Report - HLS Upload Pipeline")
    logger.info("=" * 70)

    if not os.path.exists(SOURCE_FILE):
        logger.error("Source file not found: %s", SOURCE_FILE)
        sys.exit(1)

    # Probe source
    logger.info("Probing source file...")
    probe = probe_video(SOURCE_FILE)
    fmt = probe.get("format", {})
    duration_s = float(fmt.get("duration", 0))
    file_size_mb = int(fmt.get("size", 0)) / (1024 * 1024)
    logger.info(
        "  Source: %.0f MB, %.0f min, 1080p MKV",
        file_size_mb, duration_s / 60,
    )

    # Create temp directory for HLS output
    temp_dir = tempfile.mkdtemp(prefix="hls_minority_report_")
    hls_dir = os.path.join(temp_dir, "hls")
    logger.info("Working directory: %s", temp_dir)

    try:
        # Stage 1: Convert to HLS
        logger.info("")
        logger.info("=" * 70)
        logger.info("STAGE 1: Converting to HLS (this will take 50-70 minutes)...")
        logger.info("=" * 70)
        result = await convert_to_hls(SOURCE_FILE, hls_dir)
        logger.info(
            "  HLS complete: %d segments, %.0f MB total",
            result["segment_count"], result["total_size_mb"],
        )

        # Stage 2: Upload to GCS
        logger.info("")
        logger.info("=" * 70)
        logger.info("STAGE 2: Uploading to GCS...")
        logger.info("=" * 70)
        master_url = await upload_hls_to_gcs(
            hls_dir, GCS_PATH, settings.GCS_BUCKET_NAME,
        )
        if not master_url:
            logger.error("No master.m3u8 URL returned")
            sys.exit(1)
        logger.info("  GCS URL: %s", master_url)

        # Stage 3: TMDB metadata
        logger.info("")
        logger.info("=" * 70)
        logger.info("STAGE 3: Fetching TMDB metadata...")
        logger.info("=" * 70)
        tmdb = await get_tmdb_metadata(CONTENT_TITLE, settings.TMDB_API_KEY)
        if tmdb:
            logger.info(
                "  TMDB: %s (%s, rating: %s)",
                tmdb["title"], tmdb.get("year"), tmdb.get("rating"),
            )
        else:
            logger.warning("  No TMDB metadata found, using defaults")

        # Stage 4: Create MongoDB entry
        logger.info("")
        logger.info("=" * 70)
        logger.info("STAGE 4: Creating MongoDB entry...")
        logger.info("=" * 70)
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB_NAME]

        movies_section = await db.content_sections.find_one({"name": "Movies"})
        section_id = str(movies_section["_id"]) if movies_section else None

        content_data = {
            "_id": ObjectId(),
            "title": tmdb["title"] if tmdb else CONTENT_TITLE,
            "description": (
                tmdb.get("description", "")
                if tmdb
                else "Minority Report (2002) - Steven Spielberg"
            ),
            "content_type": "movie",
            "stream_url": master_url,
            "thumbnail": tmdb.get("thumbnail") if tmdb else None,
            "backdrop": tmdb.get("backdrop") if tmdb else None,
            "category_name": "Movies",
            "is_published": True,
            "is_featured": False,
            "is_series": False,
            "year": int(tmdb["year"]) if (tmdb and tmdb.get("year")) else 2002,
            "rating": tmdb.get("rating") if tmdb else None,
            "tmdb_id": tmdb.get("tmdb_id") if tmdb else None,
            "has_subtitles": False,
            "available_subtitle_languages": [],
            "metadata": {
                "hls_migrated_at": datetime.now(UTC).isoformat()[:10],
                "hls_has_embedded_subtitles": False,
                "source_format": "mkv",
                "source_size_mb": round(file_size_mb),
                "duration_seconds": round(duration_s),
                "hls_segment_count": result["segment_count"],
            },
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }

        if section_id:
            content_data["section_ids"] = [section_id]
            content_data["primary_section_id"] = section_id

        insert_result = await db.content.insert_one(content_data)
        logger.info("  Created DB entry: %s", insert_result.inserted_id)

        client.close()

        # Done
        logger.info("")
        logger.info("=" * 70)
        logger.info("SUCCESS!")
        logger.info("=" * 70)
        logger.info("  Content ID: %s", content_data["_id"])
        logger.info("  Title: %s", content_data["title"])
        logger.info("  HLS URL: %s", master_url)
        logger.info("  Segments: %d", result["segment_count"])
        logger.info("  Duration: %.0f min", duration_s / 60)
        logger.info("")
        logger.info(
            "  Next: Run /bayit-add-subtitles %s to add subtitles",
            content_data["_id"],
        )
        logger.info("=" * 70)

    except Exception as e:
        logger.error("Pipeline failed: %s", e)
        logger.error("Temp directory preserved for retry: %s", temp_dir)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    else:
        # Only clean up on success
        logger.info("Cleaning up temp directory: %s", temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
