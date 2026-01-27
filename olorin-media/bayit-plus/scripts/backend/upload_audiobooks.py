#!/usr/bin/env python3
"""
Upload audiobooks from USB drive to GCS and MongoDB Atlas.

This script:
1. Scans audiobook files from USB drive (organized by author/book or flat)
2. Extracts audiobook metadata from directory structure and filenames
3. Uploads audio to Google Cloud Storage
4. Fetches metadata from Google Books API or Open Library
5. Creates audiobook entries in MongoDB Atlas

Directory structure expected:
  /Volumes/USB Drive/Audiobooks/
    ├── Stephen King/
    │   ├── The Shining/
    │   │   ├── Chapter01.mp3
    │   │   └── ...
    │   └── It/
    │       └── It.m4b
    └── J.K. Rowling/
        └── ...

OR flat structure:
  /Volumes/USB Drive/Audiobooks/
    ├── The Shining - Stephen King.m4b
    └── ...
"""

import argparse
import asyncio
import hashlib
import logging
import os
import re
import shutil
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_dir)

from beanie import init_beanie
from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

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

        filename = url.split('/')[-1].split('?')[0]
        if not filename:
            filename = f"audiobook_{datetime.now().strftime('%Y%m%d_%H%M%S')}.m4b"

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

                        if total_size > 0 and downloaded % (10 * 1024 * 1024) < 8192:
                            progress = (downloaded / total_size) * 100
                            logger.info(
                                f"  Downloaded: {downloaded / (1024**2):.1f}MB / "
                                f"{total_size / (1024**2):.1f}MB ({progress:.1f}%)"
                            )

        logger.info(f"  Download complete: {dest_path}")
        return dest_path

    except Exception as e:
        logger.error(f"  Failed to download from URL: {e}")
        return None


def extract_audiobook_metadata(path: str, source_dir: str) -> Dict:
    """
    Extract audiobook metadata from path structure.

    Handles multiple structures:
    1. Author/Book Title/files
    2. Book Title - Author.ext (flat)
    3. Author - Book Title.ext (flat)
    """
    path_obj = Path(path)

    try:
        rel_path = path_obj.relative_to(source_dir)
        parts = rel_path.parts
    except ValueError:
        parts = path_obj.parts

    metadata = {
        'title': None,
        'author': None,
        'filename': path_obj.name,
    }

    # Try hierarchical structure: Author/Book Title/files
    if len(parts) >= 3:
        metadata['author'] = parts[0]
        metadata['title'] = parts[1]
    elif len(parts) == 2:
        # Could be Author/BookFile.ext or BookTitle/ChapterFile.ext
        parent_name = parts[0]
        # If parent looks like an author name, use it
        metadata['author'] = parent_name
        # Use filename (without extension) as title
        metadata['title'] = path_obj.stem
    else:
        # Flat structure: try to parse from filename
        stem = path_obj.stem
        # Common patterns: "Title - Author", "Author - Title"
        if ' - ' in stem:
            parts_split = stem.split(' - ', 1)
            # Heuristic: if second part looks like a name, it's "Title - Author"
            # Otherwise assume "Author - Title"
            if _looks_like_author_name(parts_split[1]):
                metadata['title'] = parts_split[0].strip()
                metadata['author'] = parts_split[1].strip()
            else:
                metadata['author'] = parts_split[0].strip()
                metadata['title'] = parts_split[1].strip()
        else:
            # Just use filename as title
            metadata['title'] = stem

    # Clean up metadata
    if metadata['title']:
        metadata['title'] = _clean_title(metadata['title'])
    if metadata['author']:
        metadata['author'] = _clean_author(metadata['author'])

    return metadata


def _looks_like_author_name(text: str) -> bool:
    """Heuristic to determine if text looks like an author name."""
    # Author names typically:
    # - Start with capital letter
    # - Contain at most 4-5 words
    # - May have periods (J.K. Rowling)
    words = text.strip().split()
    if len(words) > 5:
        return False
    if not text[0].isupper():
        return False
    # Check for common title words that indicate it's NOT an author
    title_words = {'the', 'a', 'an', 'of', 'and', 'in', 'to', 'for'}
    first_word = words[0].lower()
    if first_word in title_words:
        return False
    return True


def _clean_title(title: str) -> str:
    """Clean audiobook title."""
    # Remove common suffixes
    title = re.sub(r'\s*\(?(Unabridged|Abridged)\)?$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\[?(Audiobook)\]?$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Audiobook$', '', title, flags=re.IGNORECASE)
    # Clean up whitespace
    title = ' '.join(title.split())
    return title.strip()


def _clean_author(author: str) -> str:
    """Clean author name."""
    # Remove common prefixes/suffixes
    author = re.sub(r'^(by|written by|narrated by)\s+', '', author, flags=re.IGNORECASE)
    # Clean up whitespace
    author = ' '.join(author.split())
    return author.strip()


def get_audio_duration(file_path: str) -> Optional[str]:
    """Get audio duration using mutagen or ffprobe."""
    try:
        from mutagen import File as MutagenFile
        audio = MutagenFile(file_path)
        if audio is not None and audio.info:
            duration_seconds = int(audio.info.length)
            hours = duration_seconds // 3600
            minutes = (duration_seconds % 3600) // 60
            seconds = duration_seconds % 60
            if hours > 0:
                return f"{hours}:{minutes:02d}:{seconds:02d}"
            return f"{minutes}:{seconds:02d}"
    except ImportError:
        logger.debug("mutagen not available, skipping duration extraction")
    except Exception as e:
        logger.debug(f"Could not extract duration: {e}")
    return None


async def get_google_books_metadata(
    title: str,
    author: Optional[str] = None
) -> Optional[Dict]:
    """Fetch audiobook metadata from Google Books API."""
    api_key = os.environ.get('GOOGLE_BOOKS_API_KEY') or getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)

    try:
        import httpx

        query = f'intitle:{title}'
        if author:
            query += f'+inauthor:{author}'

        params = {'q': query, 'maxResults': 1}
        if api_key:
            params['key'] = api_key

        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/books/v1/volumes',
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            if not data.get('items'):
                return None

            book = data['items'][0]['volumeInfo']

            # Get thumbnail
            thumbnail = None
            if 'imageLinks' in book:
                thumbnail = book['imageLinks'].get('thumbnail') or book['imageLinks'].get('smallThumbnail')
                # Use higher quality image
                if thumbnail:
                    thumbnail = thumbnail.replace('zoom=1', 'zoom=2')

            return {
                'title': book.get('title'),
                'author': ', '.join(book.get('authors', [])) if book.get('authors') else None,
                'description': book.get('description'),
                'year': int(book.get('publishedDate', '')[:4]) if book.get('publishedDate') else None,
                'thumbnail': thumbnail,
                'isbn': _extract_isbn(book.get('industryIdentifiers', [])),
                'publisher_name': book.get('publisher'),
                'categories': book.get('categories', []),
                'rating': book.get('averageRating'),
            }
    except Exception as e:
        logger.warning(f"Google Books API error for '{title}': {e}")
        return None


async def get_open_library_metadata(
    title: str,
    author: Optional[str] = None
) -> Optional[Dict]:
    """Fetch audiobook metadata from Open Library API (fallback)."""
    try:
        import httpx

        query = title
        if author:
            query += f' {author}'

        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://openlibrary.org/search.json',
                params={'q': query, 'limit': 1},
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            if not data.get('docs'):
                return None

            book = data['docs'][0]

            # Get cover
            cover_id = book.get('cover_i')
            thumbnail = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None

            return {
                'title': book.get('title'),
                'author': ', '.join(book.get('author_name', [])) if book.get('author_name') else None,
                'description': None,  # Open Library doesn't return descriptions in search
                'year': book.get('first_publish_year'),
                'thumbnail': thumbnail,
                'isbn': book.get('isbn', [None])[0] if book.get('isbn') else None,
                'publisher_name': book.get('publisher', [None])[0] if book.get('publisher') else None,
                'categories': book.get('subject', [])[:5] if book.get('subject') else [],
                'rating': None,
            }
    except Exception as e:
        logger.warning(f"Open Library API error for '{title}': {e}")
        return None


def _extract_isbn(identifiers: List[Dict]) -> Optional[str]:
    """Extract ISBN from Google Books industry identifiers."""
    for identifier in identifiers:
        if identifier.get('type') in ('ISBN_13', 'ISBN_10'):
            return identifier.get('identifier')
    return None


async def get_cached_hash(db, file_path: str, file_size: int) -> Optional[str]:
    """Get cached hash from MongoDB if file hasn't changed."""
    try:
        cached = await db.hash_cache.find_one({
            'file_path': file_path,
            'file_size': file_size,
        })
        if cached:
            return cached.get('file_hash')
    except Exception as e:
        logger.warning(f"Could not check hash cache: {e}")
    return None


async def save_hash_to_cache(db, file_path: str, file_hash: str, file_size: int):
    """Save computed hash to MongoDB cache."""
    try:
        await db.hash_cache.update_one(
            {'file_path': file_path},
            {
                '$set': {
                    'file_path': file_path,
                    'file_hash': file_hash,
                    'file_size': file_size,
                    'updated_at': datetime.now(UTC),
                },
                '$setOnInsert': {
                    'created_at': datetime.now(UTC),
                }
            },
            upsert=True
        )
    except Exception as e:
        logger.warning(f"Could not save hash to cache: {e}")


def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    logger.info(f"    Calculating hash...")
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
                    f"      Hashing: {bytes_read / (1024**3):.1f}GB / "
                    f"{file_size / (1024**3):.1f}GB ({pct:.0f}%)"
                )
                last_progress = progress

    return sha256_hash.hexdigest()


async def upload_to_gcs(file_path: str, destination_blob_name: str) -> Optional[str]:
    """Upload file to Google Cloud Storage and return public URL."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        if blob.exists():
            public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
            logger.info(f"    File already exists in GCS: {public_url}")
            return public_url

        logger.info(f"    Uploading to GCS: gs://{settings.GCS_BUCKET_NAME}/{destination_blob_name}")

        # Determine content type
        ext = Path(file_path).suffix.lower()
        content_types = {
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.m4b': 'audio/mp4',
            '.aac': 'audio/aac',
            '.flac': 'audio/flac',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
        }
        content_type = content_types.get(ext, 'audio/mpeg')

        blob.upload_from_filename(file_path, content_type=content_type)

        public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
        logger.info(f"    Uploaded successfully")
        return public_url

    except Exception as e:
        logger.error(f"    GCS upload failed: {e}")
        return None


def group_audiobook_files(files: List[str], source_dir: str) -> Dict[str, List[str]]:
    """
    Group audiobook files by book.

    Handles:
    - Single file per book (e.g., .m4b files)
    - Multiple chapters per book (e.g., Author/Book/Chapter*.mp3)
    """
    books = {}

    for file_path in files:
        metadata = extract_audiobook_metadata(file_path, source_dir)
        book_key = f"{metadata.get('author', 'Unknown')}|{metadata.get('title', 'Unknown')}"

        if book_key not in books:
            books[book_key] = {
                'files': [],
                'metadata': metadata,
            }

        books[book_key]['files'].append(file_path)

    # Sort files within each book (for multi-chapter audiobooks)
    for book_data in books.values():
        book_data['files'].sort()

    return books


async def upload_audiobooks(
    source_dir: Optional[str] = None,
    source_url: Optional[str] = None,
    dry_run: bool = False,
    limit: Optional[int] = None,
    author_filter: Optional[str] = None,
    title_filter: Optional[str] = None,
    save_hash: bool = False
):
    """Upload audiobooks from directory or URL to GCS and MongoDB Atlas."""

    temp_dir = None
    if source_url:
        logger.info("URL source detected - downloading file...")
        temp_dir = tempfile.mkdtemp(prefix='olorin_audiobook_upload_')

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

    # Initialize database
    mongodb_url = os.environ.get('MONGODB_URI') or settings.MONGODB_URI
    if 'localhost' in mongodb_url:
        raise RuntimeError(
            "Cannot use localhost for production uploads. "
            "Please set MONGODB_URI environment variable to Atlas connection string"
        )

    client = AsyncIOMotorClient(mongodb_url)
    db = client['bayit_plus']
    await init_beanie(
        database=db,
        document_models=[Content, ContentSection]
    )
    logger.info("Connected to MongoDB Atlas")

    # Get or create Audiobooks section
    audiobooks_section = await ContentSection.find_one({"slug": "audiobooks"})
    if not audiobooks_section:
        if dry_run:
            logger.info("[DRY RUN] Would create 'Audiobooks' section")
            section_id = "dry-run-section-id"
        else:
            audiobooks_section = ContentSection(
                slug="audiobooks",
                name_key="taxonomy.sections.audiobooks",
                description_key="taxonomy.sections.audiobooks.description",
                icon="book-audio",
                color="#8B7355",
                order=5,
                is_active=True,
                show_on_homepage=True,
                show_on_nav=True,
                supports_subcategories=False,
                default_content_format="audiobook",
            )
            await audiobooks_section.insert()
            section_id = str(audiobooks_section.id)
            logger.info(f"Created 'Audiobooks' section: {section_id}")
    else:
        section_id = str(audiobooks_section.id)
        logger.info(f"Using existing 'Audiobooks' section: {section_id}")

    # Scan for audio files
    audio_extensions = {'.mp3', '.m4a', '.m4b', '.aac', '.flac', '.wav', '.ogg'}
    audio_files = []

    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if Path(file).suffix.lower() in audio_extensions:
                full_path = os.path.join(root, file)
                audio_files.append(full_path)

    logger.info(f"Found {len(audio_files)} audio files")

    # Group files by book
    books = group_audiobook_files(audio_files, source_dir)
    logger.info(f"Found {len(books)} audiobooks")

    # Apply filters
    if author_filter:
        books = {k: v for k, v in books.items() if author_filter.lower() in k.lower().split('|')[0]}
        logger.info(f"Filtered to {len(books)} audiobooks matching author '{author_filter}'")

    if title_filter:
        books = {k: v for k, v in books.items() if title_filter.lower() in k.lower().split('|')[1]}
        logger.info(f"Filtered to {len(books)} audiobooks matching title '{title_filter}'")

    # Process audiobooks
    stats = {
        'audiobooks_processed': 0,
        'audiobooks_skipped': 0,
        'audiobooks_failed': 0,
    }

    book_count = 0
    for book_key, book_data in sorted(books.items()):
        if limit and book_count >= limit:
            break

        book_count += 1
        metadata = book_data['metadata']
        files = book_data['files']

        author = metadata.get('author', 'Unknown')
        title = metadata.get('title', 'Unknown')

        logger.info(f"\n{'='*80}")
        logger.info(f"Processing: {title} by {author} ({len(files)} file(s))")
        logger.info(f"{'='*80}")

        try:
            # Use primary file (first file, or single file)
            primary_file = files[0]
            file_size = os.path.getsize(primary_file)
            file_size_gb = file_size / (1024 ** 3)

            if file_size_gb > 5:
                logger.info(f"    Skipped: File too large ({file_size_gb:.1f}GB)")
                stats['audiobooks_skipped'] += 1
                continue

            # Get or calculate hash
            file_hash = await get_cached_hash(db, primary_file, file_size)
            if file_hash:
                logger.info(f"    Using cached hash: {file_hash[:16]}...")
            else:
                file_hash = calculate_file_hash(primary_file)
                logger.info(f"    File hash: {file_hash[:16]}...")
                if save_hash:
                    await save_hash_to_cache(db, primary_file, file_hash, file_size)
                    logger.info(f"    Saved hash to cache")

            # Check for duplicates
            existing = await db.content.find_one({'file_hash': file_hash})
            if existing:
                logger.info(f"    Skipped: Duplicate file")
                stats['audiobooks_skipped'] += 1
                continue

            # Get book metadata from APIs
            api_metadata = await get_google_books_metadata(title, author)
            if not api_metadata:
                api_metadata = await get_open_library_metadata(title, author)

            if api_metadata:
                logger.info(f"    Found metadata: {api_metadata.get('title')}")
            else:
                logger.info(f"    No API metadata found, using extracted metadata")

            # Get audio duration
            duration = get_audio_duration(primary_file)
            if duration:
                logger.info(f"    Duration: {duration}")

            # Upload to GCS
            if dry_run:
                safe_author = re.sub(r'[^\w\s-]', '', author).replace(' ', '_')
                safe_title = re.sub(r'[^\w\s-]', '', title).replace(' ', '_')
                filename = Path(primary_file).name
                stream_url = f"gs://{settings.GCS_BUCKET_NAME}/audiobooks/{safe_author}/{safe_title}/{filename}"
                logger.info(f"    [DRY RUN] Would upload to: {stream_url}")
            else:
                safe_author = re.sub(r'[^\w\s-]', '', author).replace(' ', '_')
                safe_title = re.sub(r'[^\w\s-]', '', title).replace(' ', '_')
                filename = Path(primary_file).name
                blob_name = f"audiobooks/{safe_author}/{safe_title}/{filename}"

                stream_url = await upload_to_gcs(primary_file, blob_name)
                if not stream_url:
                    logger.error(f"    Failed to upload to GCS")
                    stats['audiobooks_failed'] += 1
                    continue

            # Create audiobook document
            from bson import ObjectId
            now = datetime.now(UTC)

            final_title = api_metadata.get('title') if api_metadata else title
            final_author = api_metadata.get('author') if api_metadata else author

            audiobook_doc = {
                '_id': ObjectId(),
                'title': final_title,
                'author': final_author,
                'description': api_metadata.get('description', '') if api_metadata else '',
                'stream_url': stream_url,
                'stream_type': 'audio',
                'section_ids': [section_id],
                'primary_section_id': section_id,
                'content_format': 'audiobook',
                'is_published': True,
                'is_featured': False,
                'file_hash': file_hash,
                'file_size': file_size,
                'requires_subscription': 'basic',
                'visibility_mode': 'public',
                'created_at': now,
                'updated_at': now,
            }

            # Add optional metadata
            if duration:
                audiobook_doc['duration'] = duration
            if api_metadata:
                if api_metadata.get('thumbnail'):
                    audiobook_doc['thumbnail'] = api_metadata['thumbnail']
                if api_metadata.get('year'):
                    audiobook_doc['year'] = api_metadata['year']
                if api_metadata.get('rating'):
                    audiobook_doc['rating'] = api_metadata['rating']
                if api_metadata.get('isbn'):
                    audiobook_doc['isbn'] = api_metadata['isbn']
                if api_metadata.get('publisher_name'):
                    audiobook_doc['publisher_name'] = api_metadata['publisher_name']
                if api_metadata.get('categories'):
                    audiobook_doc['topic_tags'] = api_metadata['categories'][:5]

            if dry_run:
                logger.info(f"    [DRY RUN] Would add audiobook to database")
            else:
                result = await db.content.insert_one(audiobook_doc)
                logger.info(f"    Added to database: {result.inserted_id}")

            stats['audiobooks_processed'] += 1

        except Exception as e:
            logger.error(f"  Failed to process {title}: {e}")
            stats['audiobooks_failed'] += 1

        # Rate limit API calls
        await asyncio.sleep(0.5)

    # Print summary
    logger.info("\n" + "="*80)
    logger.info("Upload complete!")
    logger.info(f"  Audiobooks processed: {stats['audiobooks_processed']}")
    logger.info(f"  Audiobooks skipped:   {stats['audiobooks_skipped']}")
    logger.info(f"  Audiobooks failed:    {stats['audiobooks_failed']}")
    if save_hash:
        logger.info(f"  Hashes saved to MongoDB - subsequent runs will use cached hashes")
    logger.info("="*80)

    # Cleanup
    if temp_dir:
        logger.info(f"Cleaning up temporary directory: {temp_dir}")
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='Upload audiobooks from USB drive or URL to GCS and MongoDB Atlas'
    )
    parser.add_argument(
        '--source',
        help='Source directory containing audiobook files'
    )
    parser.add_argument(
        '--url',
        help='URL to download audiobook from'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only show what would be done, without uploading'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of audiobooks to process (for testing)'
    )
    parser.add_argument(
        '--author',
        type=str,
        help='Filter to specific author name (partial match)'
    )
    parser.add_argument(
        '--title',
        type=str,
        help='Filter to specific book title (partial match)'
    )
    parser.add_argument(
        '--save-hash',
        action='store_true',
        help='Save computed file hashes to MongoDB cache (useful with --dry-run)'
    )

    args = parser.parse_args()

    # Validate input
    if args.url and args.source:
        logger.error("Cannot specify both --source and --url")
        sys.exit(1)

    if not args.url and not args.source:
        args.source = '/Volumes/USB Drive/Audiobooks'

    asyncio.run(upload_audiobooks(
        source_dir=args.source,
        source_url=args.url,
        dry_run=args.dry_run,
        limit=args.limit,
        author_filter=args.author,
        title_filter=args.title,
        save_hash=args.save_hash
    ))


if __name__ == '__main__':
    main()
