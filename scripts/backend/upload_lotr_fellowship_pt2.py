#!/usr/bin/env python3
"""Upload LOTR: The Fellowship of the Ring (Extended) Part 2 from local MKV to HLS."""

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

SOURCE_FILE = "/Users/olorin/Movies/THE LORD OF THE RINGS- THE FELLOWSHIP OF THE RING (EXT.) - PT.2/THE LORD OF THE RINGS- THE FELLOWSHIP OF THE RING (EXT.) - PT.2_t00.mkv"
GCS_PATH = "movies/The_Lord_of_the_Rings_The_Fellowship_of_the_Ring_Extended_Part_2/hls"
CONTENT_TITLE = "The Lord of the Rings: The Fellowship of the Ring (Extended) - Part 2"
IMDB_ID = "tt0120737"


def probe_video(file_path: str) -> dict:
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", file_path]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout) if result.returncode == 0 else {}


async def convert_to_hls(input_path: str, output_dir: str) -> dict:
    os.makedirs(output_dir, exist_ok=True)
    playlist_path = os.path.join(output_dir, "playlist.m3u8")
    segment_pattern = os.path.join(output_dir, "segment_%04d.ts")
    cmd = [
        "ffmpeg", "-i", input_path, "-map", "0:v:0", "-map", "0:a:0",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k", "-ac", "2",
        "-hls_time", "10", "-hls_list_size", "0",
        "-hls_segment_filename", segment_pattern, "-f", "hls", "-y", playlist_path,
    ]
    logger.info("Starting ffmpeg HLS conversion...")
    process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    _, stderr = await process.communicate()
    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode()[-1000:]}")
    segments = [f for f in os.listdir(output_dir) if f.endswith(".ts")]
    total_size = sum(os.path.getsize(os.path.join(output_dir, f)) for f in os.listdir(output_dir))
    master_path = os.path.join(output_dir, "master.m3u8")
    with open(master_path, "w") as f:
        f.write("#EXTM3U\n#EXT-X-VERSION:3\n\n#EXT-X-STREAM-INF:BANDWIDTH=5000000\nplaylist.m3u8\n")
    return {"segment_count": len(segments), "total_size_mb": total_size / (1024 * 1024)}


async def upload_hls_to_gcs(hls_dir: str, gcs_path: str, bucket_name: str) -> str:
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    files = sorted(Path(hls_dir).glob("*"))
    total = len([f for f in files if f.is_file()])
    uploaded = 0
    content_types = {".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/MP2T"}
    master_url = None
    for file_path in files:
        if not file_path.is_file():
            continue
        blob_name = f"{gcs_path}/{file_path.name}"
        blob = bucket.blob(blob_name)
        ct = content_types.get(file_path.suffix.lower(), "application/octet-stream")
        for attempt in range(3):
            try:
                blob.upload_from_filename(str(file_path), content_type=ct)
                break
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"Upload failed for {file_path.name}: {e}")
                await asyncio.sleep(2 ** attempt)
        uploaded += 1
        if file_path.name == "master.m3u8":
            master_url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
        if uploaded % 100 == 0 or uploaded == total:
            logger.info("  Uploaded %d/%d files (%.0f%%)", uploaded, total, (uploaded / total) * 100)
    return master_url


async def get_tmdb_metadata(title: str, api_key: str) -> dict | None:
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.themoviedb.org/3/search/movie", params={"api_key": api_key, "query": title}, timeout=10.0)
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if not results:
                return None
            m = results[0]
            year = int(m["release_date"][:4]) if m.get("release_date") else None
            return {
                "title": m.get("title"), "description": m.get("overview"), "year": year,
                "rating": m.get("vote_average"), "tmdb_id": m.get("id"),
                "thumbnail": f"https://image.tmdb.org/t/p/w500{m['poster_path']}" if m.get("poster_path") else None,
                "backdrop": f"https://image.tmdb.org/t/p/original{m['backdrop_path']}" if m.get("backdrop_path") else None,
            }
    except Exception as e:
        logger.warning("TMDB error: %s", e)
        return None


async def main():
    settings = get_settings()
    correct_creds = str(PROJECT_ROOT / "backend" / "credentials" / "bayit-plus-7c3927963c21.json")
    if not os.path.exists(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")) and os.path.exists(correct_creds):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = correct_creds

    logger.info("=" * 70)
    logger.info("LOTR: Fellowship of the Ring (Extended) Part 2 - HLS Upload Pipeline")
    logger.info("=" * 70)

    probe = probe_video(SOURCE_FILE)
    fmt = probe.get("format", {})
    duration_s = float(fmt.get("duration", 0))
    file_size_mb = int(fmt.get("size", 0)) / (1024 * 1024)
    logger.info("  Source: %.0f MB, %.0f min, 1080p MKV (H.264)", file_size_mb, duration_s / 60)

    temp_dir = tempfile.mkdtemp(prefix="hls_lotr_fotr_pt2_")
    hls_dir = os.path.join(temp_dir, "hls")

    try:
        logger.info("STAGE 1: Converting to HLS...")
        result = await convert_to_hls(SOURCE_FILE, hls_dir)
        logger.info("  HLS complete: %d segments, %.0f MB", result["segment_count"], result["total_size_mb"])

        logger.info("STAGE 2: Uploading to GCS...")
        master_url = await upload_hls_to_gcs(hls_dir, GCS_PATH, settings.GCS_BUCKET_NAME)
        logger.info("  GCS URL: %s", master_url)

        logger.info("STAGE 3: TMDB metadata...")
        tmdb = await get_tmdb_metadata("The Lord of the Rings: The Fellowship of the Ring", settings.TMDB_API_KEY)
        if tmdb:
            logger.info("  TMDB: %s (%s, rating: %s)", tmdb["title"], tmdb.get("year"), tmdb.get("rating"))

        logger.info("STAGE 4: Creating MongoDB entry...")
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB_NAME]
        movies_section = await db.content_sections.find_one({"name": "Movies"})
        section_id = str(movies_section["_id"]) if movies_section else None

        content_data = {
            "_id": ObjectId(),
            "title": CONTENT_TITLE,
            "description": tmdb.get("description", "") if tmdb else "",
            "content_type": "movie", "stream_url": master_url,
            "thumbnail": tmdb.get("thumbnail") if tmdb else None,
            "backdrop": tmdb.get("backdrop") if tmdb else None,
            "category_name": "Movies", "is_published": True, "is_featured": True, "is_series": False,
            "year": int(tmdb["year"]) if (tmdb and tmdb.get("year")) else 2001,
            "rating": tmdb.get("rating") if tmdb else None,
            "tmdb_id": tmdb.get("tmdb_id") if tmdb else None, "imdb_id": IMDB_ID,
            "has_subtitles": False, "available_subtitle_languages": [],
            "metadata": {
                "hls_migrated_at": datetime.now(UTC).isoformat()[:10],
                "source_format": "mkv", "source_codec": "h264",
                "source_size_mb": round(file_size_mb), "duration_seconds": round(duration_s),
                "hls_segment_count": result["segment_count"],
            },
            "created_at": datetime.now(UTC), "updated_at": datetime.now(UTC),
        }
        if section_id:
            content_data["section_ids"] = [section_id]
            content_data["primary_section_id"] = section_id

        await db.content.insert_one(content_data)
        logger.info("  Created: %s", content_data["_id"])
        client.close()

        logger.info("=" * 70)
        logger.info("SUCCESS! Content ID: %s", content_data["_id"])
        logger.info("  Title: %s | IMDB: %s | Segments: %d | Duration: %.0f min",
                     content_data["title"], IMDB_ID, result["segment_count"], duration_s / 60)
        logger.info("=" * 70)

    except Exception as e:
        logger.error("Pipeline failed: %s", e)
        logger.error("Temp directory preserved: %s", temp_dir)
        import traceback; traceback.print_exc()
        sys.exit(1)
    else:
        logger.info("Cleaning up: %s", temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
