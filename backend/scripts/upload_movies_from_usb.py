#!/usr/bin/env python3
"""
Upload movies from USB drive to MongoDB.

This script scans a directory of movie files, extracts metadata,
optionally uses TMDB API, and uploads them to the MongoDB content collection.

Usage:
    python upload_movies_from_usb.py [--dry-run] [--source=/path/to/movies]
"""

import os
import sys
import re
import asyncio
from pathlib import Path
from typing import Optional, Dict
import logging
from datetime import datetime
import argparse

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content, Category
from app.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def extract_movie_metadata(filename: str) -> Dict[str, any]:
    """
    Extract title and year from movie filename.

    Examples:
        "3.10.To.Yuma.mp4" -> title="3:10 to Yuma", year=None
        "A Man Called Otto (2022) [1080p]" -> title="A Man Called Otto", year=2022
        "57.Seconds.2023.720p.WEBRip..." -> title="57 Seconds", year=2023
    """
    # Remove file extension
    name = Path(filename).stem

    # Extract year (4 digits in brackets/parentheses or standalone)
    year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', name)
    year = int(year_match.group(1)) if year_match else None

    # Remove year from title
    title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', name)

    # Remove quality indicators and release group tags
    quality_patterns = [
        r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?',
        r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?',
        r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?',
        r'\[?(YTS|YIFY|GalaxyRG|TGx|RARBG|TorrentGalaxy)\]?',
        r'\[?(AAC|AC3|DTS|5\.1|7\.1)\]?',
    ]
    for pattern in quality_patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)

    # Remove any remaining bracketed content
    title = re.sub(r'\[.*?\]', '', title)
    title = re.sub(r'\(.*?\)', '', title)

    # Replace dots and underscores with spaces
    title = title.replace('.', ' ').replace('_', ' ')

    # Normalize whitespace
    title = ' '.join(title.split()).strip()

    return {
        'title': title,
        'year': year,
    }


async def get_tmdb_metadata(title: str, year: Optional[int] = None) -> Optional[Dict]:
    """Fetch movie metadata from TMDB API."""
    if not settings.TMDB_API_KEY:
        logger.debug("TMDB API key not configured, skipping metadata fetch")
        return None

    try:
        import httpx

        # Search for movie
        params = {
            'api_key': settings.TMDB_API_KEY,
            'query': title,
        }
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
                logger.debug(f"No TMDB results for: {title}")
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


async def upload_movies_from_directory(source_dir: str, dry_run: bool = False):
    """
    Upload movies from a directory to MongoDB.

    Args:
        source_dir: Path to directory containing movie files
        dry_run: If True, only print what would be done without making changes
    """
    source_path = Path(source_dir)

    if not source_path.exists():
        logger.error(f"Source directory not found: {source_dir}")
        return

    logger.info(f"Scanning directory: {source_dir}")
    logger.info(f"Dry run: {dry_run}")

    # Initialize database connection
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category]
    )
    logger.info("Connected to MongoDB")

    # Get or create Movies category
    movies_category = await Category.find_one(Category.name == "Movies")
    if not movies_category:
        if dry_run:
            logger.info("[DRY RUN] Would create 'Movies' category")
            category_id = "dry-run-category-id"
        else:
            movies_category = Category(
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

    # Collect all movie files
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

    logger.info(f"Found {len(movie_files)} movie files")

    # Process each movie
    stats = {'processed': 0, 'skipped': 0, 'failed': 0}

    for directory, filename in movie_files:
        try:
            # Extract metadata from filename
            file_metadata = extract_movie_metadata(filename)
            title = file_metadata['title']
            year = file_metadata['year']

            logger.info(f"Processing: {title} ({year if year else 'unknown year'})")

            # Check if already exists
            existing = await Content.find_one(
                Content.title == title,
                Content.category_id == category_id
            )
            if existing:
                logger.info(f"  Skipped: Already exists in database")
                stats['skipped'] += 1
                continue

            # Get metadata from TMDB
            tmdb_data = await get_tmdb_metadata(title, year)
            if tmdb_data:
                logger.info(f"  Found TMDB metadata: {tmdb_data['title']}")

            # Prepare content document
            full_path = os.path.join(directory, filename)

            # For now, we'll store the local file path
            # In a production setup, you'd upload to GCS here
            stream_url = f"file://{full_path}"

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
            }

            if dry_run:
                logger.info(f"  [DRY RUN] Would add: {content_data['title']}")
            else:
                content = Content(**content_data)
                await content.insert()
                logger.info(f"  Added to database: {content.id}")

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


def main():
    parser = argparse.ArgumentParser(
        description='Upload movies from directory to MongoDB'
    )
    parser.add_argument(
        '--source',
        default='/Volumes/USB Drive/Movies',
        help='Source directory containing movie files'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only show what would be done, without making changes'
    )

    args = parser.parse_args()

    asyncio.run(upload_movies_from_directory(
        source_dir=args.source,
        dry_run=args.dry_run
    ))


if __name__ == '__main__':
    main()
