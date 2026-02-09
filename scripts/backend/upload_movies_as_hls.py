#!/usr/bin/env python3
"""
Upload movies from USB as HLS with TMDB metadata.

Pipeline for each movie:
1. Probe source file for codec info
2. Convert to HLS locally (ffmpeg: H.264 + AAC, 10s segments)
3. Generate master.m3u8 manifest
4. Upload HLS directory to GCS
5. Fetch TMDB metadata
6. Create MongoDB content entry with HLS URL

Usage:
    # Dry run
    python scripts/backend/upload_movies_as_hls.py --dry-run

    # Convert and upload all missing movies
    python scripts/backend/upload_movies_as_hls.py

    # Limit to first N
    python scripts/backend/upload_movies_as_hls.py --limit 2

    # Resume (skip already-completed)
    python scripts/backend/upload_movies_as_hls.py --resume
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Dict, List, Optional

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from bson import ObjectId
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Movies to process - from ~/Downloads/Movies (not yet HLS)
TARGET_MOVIES = [
    "A_Christmas_Carol.mp4",
    "Coco.mkv",
    "Hotel_Transylvania_2.mp4",
    "I_Dont_Know_How_She_Does_It.mp4",
    "Jackie.mp4",
    "Justice_League_2017.mp4",
    "Ted.avi",
]

# State directory for resume support
STATE_DIR = SCRIPT_DIR / ".hls_upload_state"


def extract_movie_metadata(filename: str) -> Dict[str, object]:
    """Extract title and year from movie filename."""
    name = Path(filename).stem
    year_match = re.search(r"[\(\[]?(\d{4})[\)\]]?", name)
    year = int(year_match.group(1)) if year_match else None
    title = re.sub(r"[\(\[]?\d{4}[\)\]]?", "", name)
    title = re.sub(r"\(?\bIsraeli\b\)?", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\bHebrew\b", "", title, flags=re.IGNORECASE)
    title = " ".join(title.split()).strip()
    return {"title": title, "year": year}


def sanitize_title(title: str) -> str:
    """Create a safe directory/file name from title."""
    safe = re.sub(r"[^\w\s\-]", "", title)
    return safe.replace(" ", "_")[:100]


async def get_tmdb_metadata(
    title: str, year: Optional[int], api_key: str
) -> Optional[Dict]:
    """Fetch movie metadata from TMDB API."""
    try:
        import httpx

        params = {"api_key": api_key, "query": title}
        if year:
            params["year"] = year

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.themoviedb.org/3/search/movie",
                params=params,
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
        logger.warning("TMDB API error for '%s': %s", title, e)
        return None


def probe_video(file_path: str) -> Dict:
    """Get video file info via ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout) if result.returncode == 0 else {}


async def convert_to_hls(
    input_path: str,
    output_dir: str,
    timeout: int = 14400,
) -> Dict:
    """Convert video to HLS format using ffmpeg."""
    os.makedirs(output_dir, exist_ok=True)
    playlist_path = os.path.join(output_dir, "playlist.m3u8")
    segment_pattern = os.path.join(output_dir, "segment_%03d.ts")

    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ac", "2",
        "-hls_time", "10",
        "-hls_list_size", "0",
        "-hls_segment_filename", segment_pattern,
        "-f", "hls",
        "-y",
        playlist_path,
    ]

    logger.info("  Starting ffmpeg HLS conversion...")
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        _, stderr = await asyncio.wait_for(
            process.communicate(), timeout=timeout
        )
    except asyncio.TimeoutError:
        process.kill()
        raise RuntimeError(
            f"HLS conversion timed out after {timeout}s"
        )

    if process.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed: {stderr.decode()[-500:]}"
        )

    if not os.path.exists(playlist_path):
        raise RuntimeError("playlist.m3u8 was not created")

    segments = [f for f in os.listdir(output_dir) if f.endswith(".ts")]
    total_size = sum(
        os.path.getsize(os.path.join(output_dir, f))
        for f in os.listdir(output_dir)
    )

    # Generate master.m3u8
    master_path = os.path.join(output_dir, "master.m3u8")
    with open(master_path, "w") as f:
        f.write("#EXTM3U\n#EXT-X-VERSION:3\n\n")
        f.write("#EXT-X-STREAM-INF:BANDWIDTH=2000000\n")
        f.write("playlist.m3u8\n")

    return {
        "playlist_path": playlist_path,
        "master_path": master_path,
        "segment_count": len(segments),
        "total_size_mb": total_size / (1024 * 1024),
    }


async def upload_hls_to_gcs(
    hls_dir: str,
    gcs_path: str,
    bucket_name: str,
) -> str:
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
                    raise RuntimeError(
                        f"Upload failed for {file_path.name}: {e}"
                    )
                logger.warning(
                    "  Retry %d for %s", attempt + 1, file_path.name
                )
                await asyncio.sleep(2**attempt)

        uploaded += 1
        url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"

        if file_path.name == "master.m3u8":
            master_url = url

        if uploaded % 50 == 0 or uploaded == total:
            logger.info(
                "  Uploaded %d/%d files (%.0f%%)",
                uploaded, total, (uploaded / total) * 100,
            )

    return master_url


def load_state() -> Dict:
    """Load batch state for resume."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / "batch.json"
    if state_file.exists():
        with open(state_file) as f:
            return json.load(f)
    return {"completed": [], "failed": []}


def save_state(state: Dict):
    """Save batch state."""
    state_file = STATE_DIR / "batch.json"
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)


async def process_movie(
    filename: str,
    source_dir: str,
    settings,
    collection,
    dry_run: bool = False,
) -> bool:
    """Process a single movie: convert to HLS, upload, create DB entry."""
    full_path = os.path.join(source_dir, filename)

    if not os.path.exists(full_path):
        logger.warning("File not found: %s", full_path)
        return False

    meta = extract_movie_metadata(filename)
    title = meta["title"]
    year = meta["year"]
    safe_title = sanitize_title(title)

    logger.info("Processing: %s (%s)", title, year or "unknown")

    # Check if already in DB
    existing = await collection.find_one(
        {"title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}}
    )
    if existing:
        existing_url = existing.get("stream_url", "")
        if ".m3u8" in existing_url:
            logger.info("  Already in DB as HLS: %s", existing.get("title"))
            return True
        logger.info(
            "  Exists but not HLS: %s (url: %s)",
            existing.get("title"),
            existing_url[:60],
        )

    # Probe source
    probe = probe_video(full_path)
    if not probe:
        logger.error("  ffprobe failed for %s", filename)
        return False

    fmt = probe.get("format", {})
    duration_s = float(fmt.get("duration", 0))
    file_size_mb = int(fmt.get("size", 0)) / (1024 * 1024)
    logger.info(
        "  Source: %.0fMB, %.0f min, %s",
        file_size_mb,
        duration_s / 60,
        Path(filename).suffix,
    )

    if dry_run:
        logger.info("  [DRY RUN] Would convert to HLS and upload")
        return True

    # Convert to HLS in temp dir
    temp_dir = tempfile.mkdtemp(prefix=f"hls_{safe_title}_")
    hls_dir = os.path.join(temp_dir, "hls")

    try:
        result = await convert_to_hls(full_path, hls_dir)
        logger.info(
            "  HLS: %d segments, %.0fMB total",
            result["segment_count"],
            result["total_size_mb"],
        )

        # Upload to GCS
        gcs_path = f"movies/{safe_title}/hls"
        logger.info("  Uploading to GCS: %s", gcs_path)
        master_url = await upload_hls_to_gcs(
            hls_dir, gcs_path, settings.GCS_BUCKET_NAME
        )

        if not master_url:
            logger.error("  No master.m3u8 URL returned")
            return False

        logger.info("  GCS URL: %s", master_url)

        # Get TMDB metadata
        tmdb = await get_tmdb_metadata(title, year, settings.TMDB_API_KEY)
        if tmdb:
            logger.info("  TMDB: %s (%s)", tmdb["title"], tmdb.get("year"))

        # Get Movies section
        movies_section = await collection.database.content_sections.find_one(
            {"name": "Movies"}
        )
        section_id = str(movies_section["_id"]) if movies_section else None

        # Create or update DB entry
        content_data = {
            "title": tmdb["title"] if tmdb else title,
            "description": tmdb.get("description", "") if tmdb else "",
            "content_type": "movie",
            "stream_url": master_url,
            "thumbnail": tmdb.get("thumbnail") if tmdb else None,
            "backdrop": tmdb.get("backdrop") if tmdb else None,
            "category_name": "Movies",
            "is_published": True,
            "is_featured": False,
            "is_series": False,
            "year": (
                int(tmdb["year"])
                if (tmdb and tmdb.get("year"))
                else year
            ),
            "rating": tmdb.get("rating") if tmdb else None,
            "tmdb_id": tmdb.get("tmdb_id") if tmdb else None,
            "has_subtitles": False,
            "available_subtitle_languages": [],
            "metadata": {
                "hls_migrated_at": datetime.now(UTC).isoformat()[:10],
                "hls_has_embedded_subtitles": False,
                "source_format": Path(filename).suffix.lstrip("."),
                "source_size_mb": round(file_size_mb),
                "duration_seconds": round(duration_s),
                "hls_segment_count": result["segment_count"],
            },
            "updated_at": datetime.now(UTC),
        }

        if section_id:
            content_data["section_ids"] = [section_id]
            content_data["primary_section_id"] = section_id

        if existing:
            # Update existing entry
            await collection.update_one(
                {"_id": existing["_id"]},
                {"$set": content_data},
            )
            logger.info("  Updated existing DB entry: %s", existing["_id"])
        else:
            # Create new entry
            content_data["_id"] = ObjectId()
            content_data["created_at"] = datetime.now(UTC)
            result_db = await collection.insert_one(content_data)
            logger.info("  Created DB entry: %s", result_db.inserted_id)

        return True

    except Exception as e:
        logger.error("  Failed: %s", e)
        return False

    finally:
        # Clean up temp dir
        shutil.rmtree(temp_dir, ignore_errors=True)


async def main():
    parser = argparse.ArgumentParser(
        description="Upload movies from USB as HLS to GCS and MongoDB"
    )
    parser.add_argument(
        "--source",
        default="/Volumes/USB Drive/Movies",
        help="Source directory",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without changes",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of movies",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip already-completed movies",
    )
    args = parser.parse_args()

    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    state = load_state()
    movies = TARGET_MOVIES[:]

    if args.resume:
        movies = [m for m in movies if m not in state["completed"]]
        logger.info(
            "Resuming: %d remaining (%d completed, %d failed)",
            len(movies),
            len(state["completed"]),
            len(state["failed"]),
        )

    if args.limit:
        movies = movies[: args.limit]

    logger.info("=" * 60)
    logger.info("HLS Upload Pipeline")
    logger.info("  Source: %s", args.source)
    logger.info("  Movies: %d", len(movies))
    logger.info("  Mode: %s", "DRY RUN" if args.dry_run else "LIVE")
    logger.info("=" * 60)

    for i, filename in enumerate(movies, 1):
        logger.info("")
        logger.info("[%d/%d] %s", i, len(movies), filename)

        success = await process_movie(
            filename, args.source, settings, collection, args.dry_run
        )

        if not args.dry_run:
            if success:
                if filename not in state["completed"]:
                    state["completed"].append(filename)
                if filename in state["failed"]:
                    state["failed"].remove(filename)
            else:
                if filename not in state["failed"]:
                    state["failed"].append(filename)
            save_state(state)

    # Summary
    logger.info("")
    logger.info("=" * 60)
    mode = "DRY RUN" if args.dry_run else "COMPLETE"
    logger.info("HLS Upload Pipeline %s", mode)
    logger.info("  Completed: %d", len(state["completed"]))
    logger.info("  Failed: %d", len(state["failed"]))
    if state["failed"]:
        for f in state["failed"]:
            logger.info("    - %s", f)
    logger.info("=" * 60)

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
