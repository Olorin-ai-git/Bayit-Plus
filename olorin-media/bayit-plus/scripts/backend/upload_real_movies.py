#!/usr/bin/env python3
"""
Upload real movies from USB drive to GCS and MongoDB Atlas.

This script:
1. Scans movie files from USB drive
2. Uploads videos to Google Cloud Storage
3. Fetches metadata from TMDB
4. Creates content entries in MongoDB Atlas
"""

import os
import sys
import re
import asyncio
import hashlib
from pathlib import Path
from typing import Optional, Dict
import logging
from datetime import datetime
import argparse
import tempfile
import shutil

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))  # scripts/backend
project_root = os.path.dirname(os.path.dirname(script_dir))  # bayit-plus
backend_dir = os.path.join(project_root, 'backend')  # bayit-plus/backend
sys.path.insert(0, backend_dir)

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.core.config import settings
from google.cloud import storage

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def download_from_url(url: str, dest_dir: str) -> Optional[str]:
    """Download file from URL to destination directory."""
    try:
        import httpx

        logger.info(f"Downloading from URL: {url}")

        # Extract filename from URL
        filename = url.split('/')[-1].split('?')[0]
        if not filename:
            filename = f"download_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"

        dest_path = os.path.join(dest_dir, filename)

        async with httpx.AsyncClient(timeout=600.0) as client:
            async with client.stream('GET', url) as response:
                response.raise_for_status()

                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0

                with open(dest_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)

                        # Progress update every 10MB
                        if total_size > 0 and downloaded % (10 * 1024 * 1024) < 8192:
                            progress = (downloaded / total_size) * 100
                            logger.info(f"  Downloaded: {downloaded / (1024**2):.1f}MB / {total_size / (1024**2):.1f}MB ({progress:.1f}%)")

        logger.info(f"  Download complete: {dest_path}")
        return dest_path

    except Exception as e:
        logger.error(f"  Failed to download from URL: {e}")
        return None


def extract_movie_metadata(filename: str) -> Dict[str, any]:
    """Extract title and year from movie filename."""
    name = Path(filename).stem

    # Extract year
    year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', name)
    year = int(year_match.group(1)) if year_match else None

    # Remove year from title
    title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', name)

    # Remove quality indicators
    quality_patterns = [
        r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?',
        r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?',
        r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?',
        r'\[?(YTS|YIFY|GalaxyRG|TGx|RARBG)\]?',
        r'\[?(AAC|AC3|DTS|5\.1|7\.1)\]?',
    ]
    for pattern in quality_patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)

    # Remove bracketed content
    title = re.sub(r'\[.*?\]', '', title)
    title = re.sub(r'\(.*?\)', '', title)

    # Replace dots and underscores with spaces
    title = title.replace('.', ' ').replace('_', ' ')

    # Normalize whitespace
    title = ' '.join(title.split()).strip()

    return {'title': title, 'year': year}


async def get_tmdb_metadata(title: str, year: Optional[int] = None) -> Optional[Dict]:
    """Fetch movie metadata from TMDB API."""
    if not settings.TMDB_API_KEY:
        logger.debug("TMDB API key not configured")
        return None

    try:
        import httpx

        params = {'api_key': settings.TMDB_API_KEY, 'query': title}
        if year:
            params['year'] = year

        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.themoviedb.org/3/search/movie',
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            results = response.json().get('results', [])

            if not results:
                return None

            movie = results[0]
            return {
                'title': movie.get('title'),
                'description': movie.get('overview'),
                'year': movie.get('release_date', '')[:4] if movie.get('release_date') else None,
                'rating': movie.get('vote_average'),
                'tmdb_id': movie.get('id'),
                'thumbnail': f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                'backdrop': f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}" if movie.get('backdrop_path') else None,
            }
    except Exception as e:
        logger.warning(f"TMDB API error for '{title}': {e}")
        return None


def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read file in chunks to handle large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


async def upload_to_gcs(file_path: str, destination_blob_name: str) -> str:
    """Upload file to Google Cloud Storage and return public URL."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        # Check if blob already exists
        if blob.exists():
            public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
            logger.info(f"  File already exists in GCS, skipping upload: {public_url}")
            return public_url

        logger.info(f"  Uploading to GCS: gs://{settings.GCS_BUCKET_NAME}/{destination_blob_name}")

        # Upload with content type
        content_type = 'video/mp4'
        if file_path.endswith('.mkv'):
            content_type = 'video/x-matroska'
        elif file_path.endswith('.avi'):
            content_type = 'video/x-msvideo'

        blob.upload_from_filename(file_path, content_type=content_type)

        # Get public URL (bucket should already be public via IAM)
        public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
        logger.info(f"  Uploaded successfully: {public_url}")
        return public_url

    except Exception as e:
        logger.error(f"  GCS upload failed: {e}")
        return None


async def upload_movies(source_dir: str = None, source_url: str = None, dry_run: bool = False, limit: Optional[int] = None, start_from: Optional[str] = None):
    """Upload movies from directory or URL to GCS and MongoDB Atlas."""

    # Handle URL source
    temp_dir = None
    if source_url:
        logger.info("URL source detected - downloading file...")
        temp_dir = tempfile.mkdtemp(prefix='olorin_upload_')

        downloaded_file = await download_from_url(source_url, temp_dir)
        if not downloaded_file:
            logger.error("Failed to download from URL")
            shutil.rmtree(temp_dir, ignore_errors=True)
            return

        source_dir = temp_dir
        logger.info(f"Using temporary directory: {source_dir}")

    source_path = Path(source_dir)

    if not source_path.exists():
        logger.error(f"Source directory not found: {source_dir}")
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)
        return

    logger.info(f"Scanning directory: {source_dir}")
    logger.info(f"Dry run: {dry_run}")

    # Initialize database - use Atlas connection string from environment
    mongodb_url = os.environ.get('MONGODB_URL') or settings.MONGODB_URL
    if 'localhost' in mongodb_url:
        # Require proper Atlas credentials from environment
        raise RuntimeError(
            "Cannot use localhost for production uploads. "
            "Please set MONGODB_URL environment variable to Atlas connection string"
        )

    client = AsyncIOMotorClient(mongodb_url)
    db = client['bayit_plus']  # Always use bayit_plus database
    await init_beanie(
        database=db,
        document_models=[Content, ContentSection]
    )
    logger.info("Connected to MongoDB Atlas")

    # Get or create Movies category
    movies_category = await ContentSection.find_one({"name": "Movies"})
    if not movies_category:
        if dry_run:
            logger.info("[DRY RUN] Would create 'Movies' category")
            category_id = "dry-run-category-id"
        else:
            movies_category = ContentSection(
                name="Movies",
                name_he="סרטים",
                slug="movies",
                icon="film",
                is_active=True,
                order=1,
            )
            await movies_category.insert()
            category_id = str(movies_category.id)
            logger.info(f"Created 'Movies' category: {category_id}")
    else:
        category_id = str(movies_category.id)
        logger.info(f"Using existing 'Movies' category: {category_id}")

    # Collect movie files
    video_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'}
    movie_files = []

    for item in os.listdir(source_dir):
        item_path = os.path.join(source_dir, item)

        if os.path.isdir(item_path):
            # Look for video files in subdirectory
            for subitem in os.listdir(item_path):
                if Path(subitem).suffix.lower() in video_extensions:
                    movie_files.append((item_path, subitem))
                    break
        elif Path(item).suffix.lower() in video_extensions:
            # Direct video file
            movie_files.append((source_dir, item))

    total_files = len(movie_files)

    # Filter by starting letter if specified
    if start_from:
        start_letter = start_from.upper()
        logger.info(f"Filtering movies starting from letter '{start_letter}'")
        filtered_files = []
        for directory, filename in movie_files:
            # Extract title from filename or directory name
            folder_name = os.path.basename(directory) if os.path.isdir(directory) else filename
            first_char = folder_name[0].upper()

            # Include if first character is >= start_letter (alphabetically)
            if first_char >= start_letter or not first_char.isalpha():
                filtered_files.append((directory, filename))

        movie_files = filtered_files
        logger.info(f"Found {total_files} total movies, {len(movie_files)} starting from '{start_letter}'")

    if limit:
        movie_files = movie_files[:limit]
        logger.info(f"Processing first {limit} movies")
    elif not start_from:
        logger.info(f"Found {total_files} movie files")

    # Process each movie
    stats = {'processed': 0, 'skipped': 0, 'failed': 0}

    for directory, filename in movie_files:
        try:
            # Extract metadata from filename
            file_metadata = extract_movie_metadata(filename)
            title = file_metadata['title']
            year = file_metadata['year']

            logger.info(f"Processing: {title} ({year if year else 'unknown year'})")

            full_path = os.path.join(directory, filename)

            # Check file size - skip files larger than 10GB
            file_size = os.path.getsize(full_path)
            file_size_gb = file_size / (1024 ** 3)
            if file_size_gb > 10:
                logger.info(f"  Skipped: File too large ({file_size_gb:.1f}GB, max 10GB)")
                stats['skipped'] += 1
                continue

            # Calculate file hash for duplicate detection
            file_hash = calculate_file_hash(full_path)
            logger.info(f"  File hash: {file_hash[:16]}...")

            # Check if file with this hash already exists
            existing = await db.content.find_one({'file_hash': file_hash})
            if existing:
                logger.info(f"  Skipped: File already exists in database (same hash)")
                stats['skipped'] += 1
                continue

            # Get metadata from TMDB
            tmdb_data = await get_tmdb_metadata(title, year)
            if tmdb_data:
                logger.info(f"  Found TMDB metadata: {tmdb_data['title']}")

            # Upload to GCS
            if dry_run:
                stream_url = f"gs://{settings.GCS_BUCKET_NAME}/movies/{title.replace(' ', '_')}/{filename}"
                logger.info(f"  [DRY RUN] Would upload to: {stream_url}")
            else:
                # Create blob name
                safe_title = re.sub(r'[^\w\s-]', '', title).replace(' ', '_')
                blob_name = f"movies/{safe_title}/{filename}"

                stream_url = await upload_to_gcs(full_path, blob_name)
                if not stream_url:
                    logger.error(f"  Failed to upload to GCS")
                    stats['failed'] += 1
                    continue

            # Prepare content document
            content_data = {
                'title': tmdb_data['title'] if tmdb_data else title,
                'description': tmdb_data.get('description', '') if tmdb_data else '',
                'stream_url': stream_url,
                'thumbnail': tmdb_data.get('thumbnail') if tmdb_data else None,
                'backdrop': tmdb_data.get('backdrop') if tmdb_data else None,
                'category_id': category_id,
                'category_name': 'Movies',
                'is_published': True,
                'is_featured': False,
                'is_series': False,
                'year': int(tmdb_data['year']) if (tmdb_data and tmdb_data.get('year')) else year,
                'rating': tmdb_data.get('rating') if tmdb_data else None,
                'tmdb_id': tmdb_data.get('tmdb_id') if tmdb_data else None,
                'file_hash': file_hash,
            }

            if dry_run:
                logger.info(f"  [DRY RUN] Would add to database: {content_data['title']}")
            else:
                # Add timestamps
                from datetime import datetime, UTC
                content_data['created_at'] = datetime.now(UTC)
                content_data['updated_at'] = datetime.now(UTC)

                # Insert using motor directly (Beanie insert has issues)
                from bson import ObjectId
                content_data['_id'] = ObjectId()
                result = await db.content.insert_one(content_data)
                logger.info(f"  Added to database: {result.inserted_id}")

            stats['processed'] += 1

        except Exception as e:
            logger.error(f"Failed to process {filename}: {e}")
            stats['failed'] += 1

    # Print summary
    logger.info("="*60)
    logger.info(f"Upload complete!")
    logger.info(f"  Processed: {stats['processed']}")
    logger.info(f"  Skipped:   {stats['skipped']}")
    logger.info(f"  Failed:    {stats['failed']}")
    logger.info("="*60)

    # Cleanup temporary directory if used
    if temp_dir:
        logger.info(f"Cleaning up temporary directory: {temp_dir}")
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='Upload movies from USB drive or URL to GCS and MongoDB Atlas'
    )
    parser.add_argument(
        '--source',
        help='Source directory containing movie files'
    )
    parser.add_argument(
        '--url',
        help='URL to download movie file from'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only show what would be done, without uploading'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of movies to process (for testing)'
    )
    parser.add_argument(
        '--start-from',
        type=str,
        help='Start processing from movies beginning with this letter (e.g., "T")'
    )

    args = parser.parse_args()

    # Validate input
    if args.url and args.source:
        logger.error("Cannot specify both --source and --url")
        sys.exit(1)

    if not args.url and not args.source:
        args.source = '/Volumes/USB Drive/Movies'

    asyncio.run(upload_movies(
        source_dir=args.source,
        source_url=args.url,
        dry_run=args.dry_run,
        limit=args.limit,
        start_from=args.start_from
    ))


if __name__ == '__main__':
    main()
