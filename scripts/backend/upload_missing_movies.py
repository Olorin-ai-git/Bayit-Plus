#!/usr/bin/env python3
"""
Upload specific missing movies from USB drive to GCS and MongoDB Atlas.

Targeted upload for 11 movies that failed during the bulk upload
because their filenames were renamed from Hebrew to English on the USB
while the upload was running.
"""

import asyncio
import hashlib
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Dict, Optional

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, "backend")
sys.path.insert(0, backend_dir)

from bson import ObjectId
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

MISSING_MOVIES = [
    "Alex Holeh Ahava (2012).avi",
    "Avengers Infinity War (2018).avi",
    "Back to the Future Part III (1990).avi",
    "Dumbo (2019).mkv",
    "Godzilla King of the Monsters (2019).mp4",
    "How to Train Your Dragon 2 (2014).mp4",
    "I Remember (Israeli).mp4",
    "Jumanji The Next Level (2019).mp4",
    "Mary Poppins Returns (2018).mkv",
    "Spider-Man Into the Spider-Verse (2018).mkv",
    "The Diary of Anne Frank (1959).avi",
]


def extract_movie_metadata(filename: str) -> Dict[str, object]:
    """Extract title and year from movie filename."""
    name = Path(filename).stem
    year_match = re.search(r"[\(\[]?(\d{4})[\)\]]?", name)
    year = int(year_match.group(1)) if year_match else None
    title = re.sub(r"[\(\[]?\d{4}[\)\]]?", "", name)
    title = re.sub(r"\[?(Israeli)\]?", "", title, flags=re.IGNORECASE)
    title = " ".join(title.split()).strip()
    return {"title": title, "year": year}


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


def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    file_size = os.path.getsize(file_path)
    bytes_read = 0
    last_progress = 0

    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(8192), b""):
            sha256_hash.update(byte_block)
            bytes_read += len(byte_block)
            progress = int(bytes_read / (500 * 1024 * 1024))
            if progress > last_progress and file_size > 500 * 1024 * 1024:
                pct = (bytes_read / file_size) * 100
                logger.info(
                    "    Hashing: %.1fGB / %.1fGB (%.0f%%)",
                    bytes_read / (1024**3),
                    file_size / (1024**3),
                    pct,
                )
                last_progress = progress

    return sha256_hash.hexdigest()


async def upload_missing_movies(
    source_dir: str, dry_run: bool = False
):
    """Upload the specific missing movies."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    storage_client = storage.Client()
    bucket_name = settings.GCS_BUCKET_NAME

    # Get Movies section_id
    movies_section = await db.content_sections.find_one({"name": "Movies"})
    movies_section_id = str(movies_section["_id"]) if movies_section else None
    logger.info("Movies section_id: %s", movies_section_id)

    stats = {"processed": 0, "skipped": 0, "failed": 0}

    for filename in MISSING_MOVIES:
        full_path = os.path.join(source_dir, filename)

        if not os.path.exists(full_path):
            logger.warning("File not found: %s", full_path)
            stats["failed"] += 1
            continue

        file_metadata = extract_movie_metadata(filename)
        title = file_metadata["title"]
        year = file_metadata["year"]

        logger.info("Processing: %s (%s)", title, year or "unknown year")

        # Check if already exists by title match
        existing = await collection.find_one(
            {"title": {"$regex": re.escape(title), "$options": "i"}}
        )
        if existing:
            logger.info(
                "  Skipped: Already exists in DB as '%s' (id: %s)",
                existing.get("title"),
                existing["_id"],
            )
            stats["skipped"] += 1
            continue

        # Calculate hash
        logger.info("  Calculating hash...")
        file_hash = calculate_file_hash(full_path)
        logger.info("  Hash: %s", file_hash[:16])

        # Check by hash
        existing_hash = await collection.find_one({"file_hash": file_hash})
        if existing_hash:
            logger.info(
                "  Skipped: Same hash exists as '%s'",
                existing_hash.get("title"),
            )
            stats["skipped"] += 1
            continue

        # Get TMDB metadata
        tmdb_data = await get_tmdb_metadata(title, year, settings.TMDB_API_KEY)
        if tmdb_data:
            logger.info("  TMDB: %s (%s)", tmdb_data["title"], tmdb_data.get("year"))

        # Build GCS blob name
        safe_title = re.sub(r"[^\w\s-]", "", title).replace(" ", "_")
        blob_name = f"movies/{safe_title}/{filename}"

        if dry_run:
            logger.info("  [DRY RUN] Would upload to: %s", blob_name)
            stats["processed"] += 1
            continue

        # Upload to GCS
        try:
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)

            if blob.exists():
                stream_url = (
                    f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
                )
                logger.info("  GCS blob already exists, using existing URL")
            else:
                content_type = "video/mp4"
                if filename.endswith(".mkv"):
                    content_type = "video/x-matroska"
                elif filename.endswith(".avi"):
                    content_type = "video/x-msvideo"

                logger.info("  Uploading to GCS: %s", blob_name)
                blob.upload_from_filename(full_path, content_type=content_type)
                stream_url = (
                    f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
                )
                logger.info("  Uploaded: %s", stream_url)

        except Exception as e:
            logger.error("  GCS upload failed: %s", e)
            stats["failed"] += 1
            continue

        # Create MongoDB entry
        content_data = {
            "_id": ObjectId(),
            "title": tmdb_data["title"] if tmdb_data else title,
            "description": (
                tmdb_data.get("description", "") if tmdb_data else ""
            ),
            "content_type": "movie",
            "stream_url": stream_url,
            "thumbnail": tmdb_data.get("thumbnail") if tmdb_data else None,
            "backdrop": tmdb_data.get("backdrop") if tmdb_data else None,
            "category_name": "Movies",
            "is_published": True,
            "is_featured": False,
            "is_series": False,
            "year": (
                int(tmdb_data["year"])
                if (tmdb_data and tmdb_data.get("year"))
                else year
            ),
            "rating": tmdb_data.get("rating") if tmdb_data else None,
            "tmdb_id": tmdb_data.get("tmdb_id") if tmdb_data else None,
            "file_hash": file_hash,
            "has_subtitles": False,
            "available_subtitle_languages": [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }

        if movies_section_id:
            content_data["section_ids"] = [movies_section_id]
            content_data["primary_section_id"] = movies_section_id

        try:
            result = await collection.insert_one(content_data)
            logger.info("  Added to DB: %s", result.inserted_id)
            stats["processed"] += 1
        except Exception as e:
            logger.error("  DB insert failed: %s", e)
            stats["failed"] += 1

    logger.info("=" * 60)
    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info("Upload missing movies complete (%s)", mode)
    logger.info("  Processed: %d", stats["processed"])
    logger.info("  Skipped:   %d", stats["skipped"])
    logger.info("  Failed:    %d", stats["failed"])
    logger.info("=" * 60)

    client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Upload specific missing movies from USB drive"
    )
    parser.add_argument(
        "--source",
        default="/Volumes/USB Drive/Movies",
        help="Source directory containing movie files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without uploading",
    )
    args = parser.parse_args()

    asyncio.run(upload_missing_movies(source_dir=args.source, dry_run=args.dry_run))
