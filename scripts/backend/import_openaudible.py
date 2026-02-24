#!/usr/bin/env python3
"""
Import OpenAudible library into Bayit+ audiobook catalog.

Reads books.json from an OpenAudible directory, uploads m4b files and
cover art to GCS, and creates Content documents in MongoDB Atlas with
full Audible metadata (title, author, narrator, description, genre,
duration, publisher, rating, release date, ASIN).

Each audiobook is stored as a single Content document. Chapter offsets
are embedded in the m4b file and parsed at runtime by the iOS app's
ChapterMetadataParser (AVFoundation).

Reuses GCS upload, file hashing, and hash caching functions from
upload_audiobooks.py.
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_dir)

from beanie import init_beanie
from bson import ObjectId
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

from upload_audiobooks import (
    calculate_file_hash,
    get_cached_hash,
    save_hash_to_cache,
    upload_to_gcs,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def safe_path_segment(name: str) -> str:
    """Sanitize a name for use in GCS blob paths."""
    segment = re.sub(r'[^\w\s-]', '', name).replace(' ', '_')
    return segment[:120] if segment else 'unknown'


def parse_genre(genre_str: Optional[str]) -> List[str]:
    """
    Split OpenAudible genre string into topic_tags list.

    OpenAudible uses colon-delimited genres like:
      "Literature & Fiction:Horror"
      "Science Fiction & Fantasy:Science Fiction"
      "Bios & Memoirs"

    Returns deduplicated list of individual genre tags.
    """
    if not genre_str:
        return []
    tags = []
    for part in genre_str.split(':'):
        cleaned = part.strip()
        if cleaned and cleaned not in tags:
            tags.append(cleaned)
    return tags


def flatten_chapters(chapters: List[Dict]) -> List[Dict]:
    """
    Flatten nested Part>Chapter structure from OpenAudible into a
    single ordered list of chapter entries with absolute offsets.

    Handles both flat chapters (start_offset_ms, length_ms, title)
    and nested structures (Part with inner chapters list).

    Returns list of dicts: {title, start_offset_ms, length_ms, start_offset_sec}
    """
    flat = []
    for entry in chapters:
        inner = entry.get('chapters')
        if inner:
            # Nested: Part containing sub-chapters
            for ch in inner:
                flat.append({
                    'title': ch.get('title', ''),
                    'start_offset_ms': ch.get('start_offset_ms', 0),
                    'length_ms': ch.get('length_ms', 0),
                    'start_offset_sec': ch.get('start_offset_sec', 0),
                    'part_title': entry.get('title', ''),
                })
        else:
            # Flat chapter
            if entry.get('length_ms', 0) > 0:
                flat.append({
                    'title': entry.get('title', ''),
                    'start_offset_ms': entry.get('start_offset_ms', 0),
                    'length_ms': entry.get('length_ms', 0),
                    'start_offset_sec': entry.get('start_offset_sec', 0),
                })
    return flat


def find_m4b_file(openaudible_dir: str, entry: Dict) -> Optional[str]:
    """Locate the m4b file for a books.json entry."""
    filename = entry.get('filename', '')
    if not filename:
        return None

    m4b_path = os.path.join(openaudible_dir, 'books', f'{filename}.m4b')
    if os.path.isfile(m4b_path):
        return m4b_path

    # Check files list for alternative m4b name
    for f in entry.get('files', []):
        if f.get('type') == 'M4B' and f.get('kind') == 'audio':
            alt_path = os.path.join(openaudible_dir, 'books', f['path'])
            if os.path.isfile(alt_path):
                return alt_path

    return None


def find_cover_art(openaudible_dir: str, entry: Dict) -> Optional[str]:
    """Locate cover art JPG for a books.json entry."""
    filename = entry.get('filename', '')
    if not filename:
        return None

    # OpenAudible stores art in art/ subdirectory
    art_path = os.path.join(openaudible_dir, 'art', f'{filename}.jpg')
    if os.path.isfile(art_path):
        return art_path

    # Fallback: check books/ directory
    books_path = os.path.join(openaudible_dir, 'books', f'{filename}.jpg')
    if os.path.isfile(books_path):
        return books_path

    # Check files list for image entry
    for f in entry.get('files', []):
        if f.get('kind') == 'image':
            img_path = os.path.join(openaudible_dir, 'books', f['path'])
            if os.path.isfile(img_path):
                return img_path

    return None


async def upload_cover_to_gcs(
    file_path: str,
    destination_blob_name: str,
) -> Optional[str]:
    """Upload cover art to GCS with image/jpeg content type."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        if blob.exists():
            public_url = (
                f"https://storage.googleapis.com/"
                f"{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
            )
            logger.info(f"    Cover already in GCS: {public_url}")
            return public_url

        logger.info(
            f"    Uploading cover to GCS: "
            f"gs://{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
        )
        blob.upload_from_filename(file_path, content_type='image/jpeg')

        public_url = (
            f"https://storage.googleapis.com/"
            f"{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
        )
        logger.info("    Cover uploaded successfully")
        return public_url

    except Exception as e:
        logger.error(f"    Cover upload failed: {e}")
        return None


async def import_openaudible(
    openaudible_dir: str,
    dry_run: bool = True,
    limit: Optional[int] = None,
    author_filter: Optional[str] = None,
    save_hash: bool = False,
):
    """Import OpenAudible library into Bayit+ catalog."""

    books_json_path = os.path.join(openaudible_dir, 'books.json')
    if not os.path.isfile(books_json_path):
        logger.error(f"books.json not found at: {books_json_path}")
        return

    with open(books_json_path, 'r', encoding='utf-8') as f:
        books = json.load(f)

    logger.info(f"Loaded {len(books)} entries from books.json")
    logger.info(f"OpenAudible directory: {openaudible_dir}")
    logger.info(f"Dry run: {dry_run}")

    # Filter by author if specified
    if author_filter:
        books = [
            b for b in books
            if author_filter.lower() in b.get('author', '').lower()
        ]
        logger.info(
            f"Filtered to {len(books)} entries "
            f"matching author '{author_filter}'"
        )

    # Initialize database
    mongodb_url = os.environ.get('MONGODB_URI') or settings.MONGODB_URI
    if 'localhost' in mongodb_url:
        raise RuntimeError(
            "Cannot use localhost for production imports. "
            "Set MONGODB_URI to Atlas connection string."
        )

    client = AsyncIOMotorClient(mongodb_url)
    db = client['bayit_plus']
    try:
        await init_beanie(
            database=db,
            document_models=[Content, ContentSection]
        )
    except Exception as e:
        logger.warning(f"Beanie init had index issues (non-fatal): {e}")
        logger.info("Continuing with raw MongoDB operations")
    logger.info("Connected to MongoDB Atlas")

    # Get audiobooks section
    audiobooks_section = await db.content_taxonomy.find_one(
        {"slug": "audiobooks"}
    )
    if not audiobooks_section:
        logger.error(
            "Audiobooks section not found in content_taxonomy. "
            "Run upload_audiobooks.py first to create it."
        )
        return
    section_id = str(audiobooks_section['_id'])
    logger.info(f"Using Audiobooks section: {section_id}")

    # Process stats
    stats = {
        'processed': 0,
        'skipped_duplicate': 0,
        'skipped_no_file': 0,
        'failed': 0,
    }

    count = 0
    for entry in books:
        if limit and count >= limit:
            break

        title = entry.get('title_short') or entry.get('title', 'Unknown')
        author = entry.get('author', 'Unknown')
        asin = entry.get('asin', '')

        logger.info(f"\n{'='*70}")
        logger.info(f"[{count + 1}] {title} by {author}")
        logger.info(f"{'='*70}")

        # Find m4b file
        m4b_path = find_m4b_file(openaudible_dir, entry)
        if not m4b_path:
            logger.warning(f"    No m4b file found, skipping")
            stats['skipped_no_file'] += 1
            count += 1
            continue

        file_size = os.path.getsize(m4b_path)

        # Calculate or retrieve cached hash
        file_hash = await get_cached_hash(db, m4b_path, file_size)
        if file_hash:
            logger.info(f"    Using cached hash: {file_hash[:16]}...")
        else:
            file_hash = calculate_file_hash(m4b_path)
            if save_hash and not dry_run:
                await save_hash_to_cache(
                    db, m4b_path, file_hash, file_size
                )

        # Check for duplicate by file hash
        existing = await db.content.find_one({'file_hash': file_hash})
        if existing:
            logger.info(
                f"    Duplicate detected (hash match): "
                f"{existing.get('title', 'unknown')}"
            )
            stats['skipped_duplicate'] += 1
            count += 1
            continue

        # Also check by ASIN to catch re-imports
        if asin:
            existing_asin = await db.content.find_one({'asin': asin})
            if existing_asin:
                logger.info(
                    f"    Duplicate detected (ASIN match): "
                    f"{existing_asin.get('title', 'unknown')}"
                )
                stats['skipped_duplicate'] += 1
                count += 1
                continue

        # Build GCS paths
        safe_author = safe_path_segment(author)
        safe_title = safe_path_segment(title)
        m4b_filename = Path(m4b_path).name
        m4b_blob = f"audiobooks/{safe_author}/{safe_title}/{m4b_filename}"
        cover_blob = f"audiobooks/{safe_author}/{safe_title}/cover.jpg"

        # Upload m4b
        if dry_run:
            stream_url = f"gs://{settings.GCS_BUCKET_NAME}/{m4b_blob}"
            logger.info(f"    [DRY RUN] Would upload m4b: {m4b_filename}")
            logger.info(
                f"    [DRY RUN] File size: "
                f"{file_size / (1024**3):.2f} GB"
            )
        else:
            stream_url = await upload_to_gcs(m4b_path, m4b_blob)
            if not stream_url:
                logger.error("    Failed to upload m4b to GCS")
                stats['failed'] += 1
                count += 1
                continue

        # Upload cover art
        cover_path = find_cover_art(openaudible_dir, entry)
        thumbnail_url = None
        if cover_path:
            if dry_run:
                thumbnail_url = (
                    f"gs://{settings.GCS_BUCKET_NAME}/{cover_blob}"
                )
                logger.info("    [DRY RUN] Would upload cover art")
            else:
                thumbnail_url = await upload_cover_to_gcs(
                    cover_path, cover_blob
                )
        else:
            # Fallback to Audible image URL
            thumbnail_url = entry.get('image_url')
            if thumbnail_url:
                logger.info("    Using Audible image URL as thumbnail")

        # Parse metadata
        topic_tags = parse_genre(entry.get('genre'))
        duration = entry.get('duration')
        narrator = entry.get('narrated_by')
        description = entry.get('description', '')
        publisher = entry.get('publisher')
        release_date = entry.get('release_date', '')
        rating_str = entry.get('rating_average', '0')

        year = None
        if release_date and len(release_date) >= 4:
            try:
                year = int(release_date[:4])
            except ValueError:
                pass

        rating = 0.0
        try:
            rating = float(rating_str)
        except (ValueError, TypeError):
            pass

        # Build Content document
        now = datetime.now(UTC)
        audiobook_doc = {
            '_id': ObjectId(),
            'title': title,
            'author': author,
            'narrator': narrator,
            'description': description,
            'stream_url': stream_url,
            'stream_type': 'audio',
            'thumbnail': thumbnail_url,
            'duration': duration,
            'content_format': 'audiobook',
            'is_published': True,
            'is_featured': False,
            'section_ids': [section_id],
            'primary_section_id': section_id,
            'requires_subscription': 'basic',
            'visibility_mode': 'public',
            'file_hash': file_hash,
            'file_size': file_size,
            'publisher_name': publisher,
            'year': year,
            'rating': rating,
            'topic_tags': topic_tags,
            'asin': asin,
            'created_at': now,
            'updated_at': now,
        }

        if dry_run:
            logger.info(f"    [DRY RUN] Would create Content document:")
            logger.info(f"      Title: {title}")
            logger.info(f"      Author: {author}")
            logger.info(f"      Narrator: {narrator}")
            logger.info(f"      Duration: {duration}")
            logger.info(f"      Publisher: {publisher}")
            logger.info(f"      Year: {year}")
            logger.info(f"      Rating: {rating:.2f}")
            logger.info(f"      Tags: {topic_tags}")
            logger.info(f"      ASIN: {asin}")
        else:
            result = await db.content.insert_one(audiobook_doc)
            logger.info(f"    Created: {result.inserted_id}")

        stats['processed'] += 1
        count += 1

    # Summary
    logger.info(f"\n{'='*70}")
    logger.info("Import complete!")
    logger.info(f"  Processed:          {stats['processed']}")
    logger.info(f"  Skipped (duplicate): {stats['skipped_duplicate']}")
    logger.info(f"  Skipped (no file):   {stats['skipped_no_file']}")
    logger.info(f"  Failed:             {stats['failed']}")
    if dry_run:
        logger.info("  Mode: DRY RUN (no changes made)")
        logger.info("  Run with --apply to execute imports")
    logger.info(f"{'='*70}")


def main():
    default_dir = os.path.expanduser('~/Library/OpenAudible')

    parser = argparse.ArgumentParser(
        description='Import OpenAudible library into Bayit+ audiobook catalog'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Actually upload and insert (default is dry run)',
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Process only first N books',
    )
    parser.add_argument(
        '--author',
        type=str,
        help='Filter to specific author (partial match)',
    )
    parser.add_argument(
        '--save-hash',
        action='store_true',
        help='Cache file hashes to MongoDB for faster subsequent runs',
    )
    parser.add_argument(
        '--openaudible-dir',
        type=str,
        default=default_dir,
        help=f'OpenAudible directory (default: {default_dir})',
    )

    args = parser.parse_args()

    asyncio.run(import_openaudible(
        openaudible_dir=args.openaudible_dir,
        dry_run=not args.apply,
        limit=args.limit,
        author_filter=args.author,
        save_hash=args.save_hash,
    ))


if __name__ == '__main__':
    main()
