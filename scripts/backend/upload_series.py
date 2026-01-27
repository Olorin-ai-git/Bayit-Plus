#!/usr/bin/env python3
"""
Upload TV series from USB drive to GCS and MongoDB Atlas.

This script:
1. Scans series files from USB drive (organized by series/season/episode)
2. Extracts series metadata from directory structure and filenames
3. Uploads videos to Google Cloud Storage
4. Fetches metadata from TMDB
5. Creates series parent and episode entries in MongoDB Atlas
6. Links episodes to series parents

Directory structure expected:
  /Volumes/USB Drive/Series/
    ├── Game of Thrones/
    │   ├── Season 1/
    │   │   ├── Game.of.Thrones.S01E01.1080p.mkv
    │   │   ├── Game.of.Thrones.S01E02.1080p.mkv
    │   │   └── ...
    │   └── Season 2/
    │       └── ...
    └── Breaking Bad/
        └── ...
"""

import os
import sys
import re
import asyncio
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import logging
from datetime import datetime, UTC
import argparse
import tempfile
import shutil
from dataclasses import dataclass
from enum import Enum

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, 'backend')
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


class StructureType(Enum):
    """Directory structure types supported by the upload script."""
    TYPE_A_LEGACY_SEASONS = "legacy_seasons"  # SeriesName/Season N/filename
    TYPE_B_FLAT = "flat"  # SeriesName/filename
    TYPE_C_EPISODE_GROUPED = "episode_grouped"  # SeriesName/S##E##-Title/video
    TYPE_D_MIXED = "mixed"  # Mixed structures detected


@dataclass
class DirectoryAnalysis:
    """Analysis results of directory structure."""
    structure_type: StructureType
    confidence: str  # "high", "medium", "low"
    series_boundaries: Dict[str, List[str]]  # {series_name: [file_paths]}
    sample_files_analyzed: int
    total_files: int
    detection_notes: str


class DirectoryStructureDetector:
    """Detects and analyzes TV series directory structures."""

    def __init__(self, source_dir: str):
        self.source_dir = source_dir
        self.sample_size = 10  # Analyze only first 10 files for O(1) performance

    def analyze_directory_structure(self) -> DirectoryAnalysis:
        """Analyze directory structure and detect type."""
        video_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'}
        all_files = []

        for root, dirs, files in os.walk(self.source_dir):
            for file in files:
                if Path(file).suffix.lower() in video_extensions:
                    full_path = os.path.join(root, file)
                    all_files.append(full_path)

        if not all_files:
            return DirectoryAnalysis(
                structure_type=StructureType.TYPE_D_MIXED,
                confidence="low",
                series_boundaries={},
                sample_files_analyzed=0,
                total_files=0,
                detection_notes="No video files found in directory"
            )

        sample_files = all_files[:self.sample_size]
        structure_type = self._classify_structure_type(sample_files)
        series_boundaries = self._detect_series_boundaries(all_files, structure_type)
        confidence = self._calculate_confidence(sample_files, structure_type)
        notes = self._generate_detection_notes(structure_type, len(sample_files))

        return DirectoryAnalysis(
            structure_type=structure_type,
            confidence=confidence,
            series_boundaries=series_boundaries,
            sample_files_analyzed=len(sample_files),
            total_files=len(all_files),
            detection_notes=notes
        )

    def _classify_structure_type(self, sample_files: List[str]) -> StructureType:
        """Classify directory structure type based on file samples."""
        structure_votes = {
            StructureType.TYPE_A_LEGACY_SEASONS: 0,
            StructureType.TYPE_B_FLAT: 0,
            StructureType.TYPE_C_EPISODE_GROUPED: 0,
        }

        for file_path in sample_files:
            rel_path = self._get_relative_path(file_path)
            parts = rel_path.split(os.sep)

            if len(parts) >= 3:
                second_level = parts[1]
                if self._is_season_directory(second_level):
                    structure_votes[StructureType.TYPE_A_LEGACY_SEASONS] += 1
                elif self._is_episode_grouped_directory(second_level):
                    structure_votes[StructureType.TYPE_C_EPISODE_GROUPED] += 1
                else:
                    structure_votes[StructureType.TYPE_B_FLAT] += 1
            elif len(parts) == 2:
                structure_votes[StructureType.TYPE_B_FLAT] += 1

        max_votes = max(structure_votes.values())
        if max_votes == 0:
            return StructureType.TYPE_D_MIXED

        primary_type = [k for k, v in structure_votes.items() if v == max_votes][0]

        mixed_types = sum(1 for v in structure_votes.values() if v > 0)
        if mixed_types > 1:
            logger.warning(f"Mixed structures detected; using {primary_type.value}")
            return StructureType.TYPE_D_MIXED

        return primary_type

    def _detect_series_boundaries(self, all_files: List[str], structure_type: StructureType) -> Dict[str, List[str]]:
        """Map series names to their episode files."""
        series_map = {}

        for file_path in all_files:
            rel_path = self._get_relative_path(file_path)
            parts = rel_path.split(os.sep)

            if not parts:
                continue

            series_name = parts[0]

            if series_name not in series_map:
                series_map[series_name] = []

            series_map[series_name].append(file_path)

        return series_map

    def _is_season_directory(self, dir_name: str) -> bool:
        """Check if directory name matches season pattern."""
        patterns = [
            r'^[Ss]eason[\s\._]?\d+$',
            r'^[Ss]\d+$',
            r'^S\d{2}$',
        ]
        return any(re.match(pattern, dir_name) for pattern in patterns)

    def _is_episode_grouped_directory(self, dir_name: str) -> bool:
        """Check if directory name matches episode-grouped pattern."""
        pattern = r'^[Ss]\d{2}[Ee]\d{2}'
        return bool(re.match(pattern, dir_name))

    def _get_relative_path(self, file_path: str) -> str:
        """Get relative path from source directory."""
        try:
            path_obj = Path(file_path)
            source_obj = Path(self.source_dir)
            rel_path = path_obj.relative_to(source_obj)
            return str(rel_path)
        except ValueError:
            return file_path

    def _calculate_confidence(self, sample_files: List[str], structure_type: StructureType) -> str:
        """Calculate detection confidence level."""
        if structure_type == StructureType.TYPE_D_MIXED:
            return "low"

        consistent_matches = 0
        for file_path in sample_files:
            rel_path = self._get_relative_path(file_path)
            parts = rel_path.split(os.sep)

            if structure_type == StructureType.TYPE_A_LEGACY_SEASONS:
                if len(parts) >= 3 and self._is_season_directory(parts[1]):
                    consistent_matches += 1
            elif structure_type == StructureType.TYPE_B_FLAT:
                if len(parts) == 2:
                    consistent_matches += 1
            elif structure_type == StructureType.TYPE_C_EPISODE_GROUPED:
                if len(parts) >= 3 and self._is_episode_grouped_directory(parts[1]):
                    consistent_matches += 1

        ratio = consistent_matches / len(sample_files) if sample_files else 0
        if ratio >= 0.8:
            return "high"
        elif ratio >= 0.5:
            return "medium"
        return "low"

    def _generate_detection_notes(self, structure_type: StructureType, sample_count: int) -> str:
        """Generate human-readable detection notes."""
        type_descriptions = {
            StructureType.TYPE_A_LEGACY_SEASONS: "Legacy Season directories (SeriesName/Season N/files)",
            StructureType.TYPE_B_FLAT: "Flat structure (SeriesName/episode_files)",
            StructureType.TYPE_C_EPISODE_GROUPED: "Episode-grouped structure (SeriesName/S##E##-Title/files)",
            StructureType.TYPE_D_MIXED: "Mixed structures detected; using legacy format",
        }
        return f"Detected: {type_descriptions.get(structure_type, 'Unknown')} (sampled {sample_count} files)"


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


def extract_episode_info(filename: str) -> Tuple[Optional[int], Optional[int]]:
    """Extract season and episode numbers from filename."""
    # Pattern: S01E01, s01e01, 1x01, etc.
    patterns = [
        r'[Ss](\d+)[Ee](\d+)',  # S01E01
        r'(\d+)x(\d+)',          # 1x01
        r'[Ss]eason[\s\._]?(\d+)[\s\._]?[Ee]pisode[\s\._]?(\d+)',  # Season 1 Episode 1
    ]

    for pattern in patterns:
        match = re.search(pattern, filename)
        if match:
            season = int(match.group(1))
            episode = int(match.group(2))
            return season, episode

    return None, None


def extract_series_metadata(path: str, series_dir: str, structure_type: StructureType = StructureType.TYPE_A_LEGACY_SEASONS) -> Dict:
    """Extract series name, season, and episode from path structure."""
    path_obj = Path(path)

    try:
        rel_path = path_obj.relative_to(series_dir)
        parts = rel_path.parts
    except ValueError:
        parts = path_obj.parts

    metadata = {
        'series_name': None,
        'season': None,
        'episode': None,
        'filename': path_obj.name,
        'extraction_source': 'unknown',
    }

    if len(parts) < 2:
        return metadata

    metadata['series_name'] = parts[0]

    if structure_type == StructureType.TYPE_A_LEGACY_SEASONS:
        metadata.update(_extract_type_a_metadata(parts, path_obj))
    elif structure_type == StructureType.TYPE_B_FLAT:
        metadata.update(_extract_type_b_metadata(path_obj))
    elif structure_type == StructureType.TYPE_C_EPISODE_GROUPED:
        metadata.update(_extract_type_c_metadata(parts, path_obj))
    elif structure_type == StructureType.TYPE_D_MIXED:
        metadata.update(_extract_type_a_metadata(parts, path_obj))

    _clean_series_name(metadata)

    return metadata


def _extract_type_a_metadata(parts: Tuple, path_obj: Path) -> Dict:
    """Extract metadata for Type A (Legacy Season) structure."""
    extraction = {
        'season': None,
        'episode': None,
        'extraction_source': 'type_a_legacy',
    }

    if len(parts) >= 3:
        season_dir = parts[1]
        season_match = re.search(r'[Ss]eason[\s\._]?(\d+)', season_dir)
        if season_match:
            extraction['season'] = int(season_match.group(1))
        else:
            season_match = re.search(r'[Ss](\d+)', season_dir)
            if season_match:
                extraction['season'] = int(season_match.group(1))

    season_file, episode_file = extract_episode_info(path_obj.name)
    if season_file is not None:
        extraction['season'] = season_file
    if episode_file is not None:
        extraction['episode'] = episode_file

    return extraction


def _extract_type_b_metadata(path_obj: Path) -> Dict:
    """Extract metadata for Type B (Flat) structure."""
    extraction = {
        'season': None,
        'episode': None,
        'extraction_source': 'type_b_flat',
    }

    season_file, episode_file = extract_episode_info(path_obj.name)
    extraction['season'] = season_file
    extraction['episode'] = episode_file

    return extraction


def _extract_type_c_metadata(parts: Tuple, path_obj: Path) -> Dict:
    """Extract metadata for Type C (Episode-grouped) structure."""
    extraction = {
        'season': None,
        'episode': None,
        'extraction_source': 'type_c_episode_grouped',
    }

    if len(parts) >= 2:
        episode_dir = parts[1]
        match = re.match(r'[Ss](\d+)[Ee](\d+)', episode_dir)
        if match:
            extraction['season'] = int(match.group(1))
            extraction['episode'] = int(match.group(2))

    return extraction


def _clean_series_name(metadata: Dict):
    """Clean series name in metadata."""
    if metadata['series_name']:
        metadata['series_name'] = metadata['series_name'].replace('.', ' ').replace('_', ' ')
        metadata['series_name'] = ' '.join(metadata['series_name'].split()).strip()


async def get_tmdb_series_metadata(title: str, year: Optional[int] = None) -> Optional[Dict]:
    """Fetch TV series metadata from TMDB API."""
    if not settings.TMDB_API_KEY:
        logger.debug("TMDB API key not configured")
        return None

    try:
        import httpx

        params = {'api_key': settings.TMDB_API_KEY, 'query': title}
        if year:
            params['first_air_date_year'] = year

        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.themoviedb.org/3/search/tv',
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            results = response.json().get('results', [])

            if not results:
                return None

            series = results[0]
            tmdb_id = series.get('id')

            # Get detailed info
            detail_response = await client.get(
                f'https://api.themoviedb.org/3/tv/{tmdb_id}',
                params={'api_key': settings.TMDB_API_KEY},
                timeout=10.0
            )
            detail_response.raise_for_status()
            details = detail_response.json()

            return {
                'title': details.get('name'),
                'description': details.get('overview'),
                'year': details.get('first_air_date', '')[:4] if details.get('first_air_date') else None,
                'rating': details.get('vote_average'),
                'tmdb_id': tmdb_id,
                'thumbnail': f"https://image.tmdb.org/t/p/w500{series['poster_path']}" if series.get('poster_path') else None,
                'backdrop': f"https://image.tmdb.org/t/p/original{series['backdrop_path']}" if series.get('backdrop_path') else None,
                'total_seasons': details.get('number_of_seasons'),
                'total_episodes': details.get('number_of_episodes'),
                'genres': [g['name'] for g in details.get('genres', [])],
                'status': details.get('status'),
            }
    except Exception as e:
        logger.warning(f"TMDB API error for '{title}': {e}")
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
                logger.info(f"      Hashing: {bytes_read / (1024**3):.1f}GB / {file_size / (1024**3):.1f}GB ({pct:.0f}%)")
                last_progress = progress

    return sha256_hash.hexdigest()


async def upload_to_gcs(file_path: str, destination_blob_name: str) -> str:
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

        content_type = 'video/mp4'
        if file_path.endswith('.mkv'):
            content_type = 'video/x-matroska'
        elif file_path.endswith('.avi'):
            content_type = 'video/x-msvideo'

        blob.upload_from_filename(file_path, content_type=content_type)

        public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
        logger.info(f"    Uploaded successfully")
        return public_url

    except Exception as e:
        logger.error(f"    GCS upload failed: {e}")
        return None


async def find_or_create_series_parent(
    db,
    series_name: str,
    category_id: str,
    tmdb_data: Optional[Dict] = None,
) -> str:
    """Find existing series parent or create new one."""

    # Check if series parent exists
    existing = await db.content.find_one({
        'title': series_name,
        'is_series': True,
        'content_type': 'series',
        'season': None,
        'episode': None,
    })

    if existing:
        logger.info(f"    Found existing series parent: {existing['_id']}")
        return str(existing['_id'])

    # Create new series parent
    logger.info(f"    Creating series parent for '{series_name}'")

    from bson import ObjectId
    now = datetime.now(UTC)

    series_doc = {
        '_id': ObjectId(),
        'title': tmdb_data.get('title') if tmdb_data else series_name,
        'description': tmdb_data.get('description', '') if tmdb_data else '',
        'category_id': category_id,
        'category_name': 'Series',
        'is_series': True,
        'is_published': True,
        'is_featured': False,
        'content_type': 'series',
        'season': None,
        'episode': None,
        'stream_url': '',
        'created_at': now,
        'updated_at': now,
    }

    if tmdb_data:
        series_doc.update({
            'thumbnail': tmdb_data.get('thumbnail'),
            'backdrop': tmdb_data.get('backdrop'),
            'year': int(tmdb_data['year']) if tmdb_data.get('year') else None,
            'rating': tmdb_data.get('rating'),
            'tmdb_id': tmdb_data.get('tmdb_id'),
            'total_seasons': tmdb_data.get('total_seasons'),
            'total_episodes': tmdb_data.get('total_episodes'),
            'genres': tmdb_data.get('genres'),
            'status': tmdb_data.get('status'),
        })

    result = await db.content.insert_one(series_doc)
    logger.info(f"    Created series parent: {result.inserted_id}")
    return str(result.inserted_id)


async def upload_series(source_dir: str = None, source_url: str = None, dry_run: bool = False, limit: Optional[int] = None, series_filter: Optional[str] = None, save_hash: bool = False):
    """Upload TV series from directory or URL to GCS and MongoDB Atlas."""

    # Handle URL source
    temp_dir = None
    if source_url:
        logger.info("URL source detected - downloading file...")
        temp_dir = tempfile.mkdtemp(prefix='olorin_series_upload_')

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

    # Detect directory structure
    detector = DirectoryStructureDetector(source_dir)
    analysis = detector.analyze_directory_structure()
    logger.info(f"Structure detection: {analysis.detection_notes}")
    logger.info(f"  Type: {analysis.structure_type.value}")
    logger.info(f"  Confidence: {analysis.confidence}")
    logger.info(f"  Total files analyzed: {analysis.total_files}")

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

    # Get or create Series category
    series_category = await ContentSection.find_one({"name": "Series"})
    if not series_category:
        if dry_run:
            logger.info("[DRY RUN] Would create 'Series' category")
            category_id = "dry-run-category-id"
        else:
            series_category = ContentSection(
                name="Series",
                name_he="סדרות",
                slug="series",
                icon="tv",
                is_active=True,
                order=2,
            )
            await series_category.insert()
            category_id = str(series_category.id)
            logger.info(f"Created 'Series' category: {category_id}")
    else:
        category_id = str(series_category.id)
        logger.info(f"Using existing 'Series' category: {category_id}")

    # Scan for video files
    video_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'}
    episode_files = []

    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if Path(file).suffix.lower() in video_extensions:
                full_path = os.path.join(root, file)
                episode_files.append(full_path)

    logger.info(f"Found {len(episode_files)} video files")

    # Group by series
    series_episodes = {}
    for file_path in episode_files:
        metadata = extract_series_metadata(file_path, source_dir, analysis.structure_type)
        series_name = metadata['series_name']

        if not series_name:
            logger.warning(f"Could not extract series name from: {file_path}")
            continue

        if series_name not in series_episodes:
            series_episodes[series_name] = []

        series_episodes[series_name].append({
            'path': file_path,
            'metadata': metadata,
        })

    logger.info(f"Found {len(series_episodes)} series")

    # Filter by series name if specified
    if series_filter:
        filtered = {k: v for k, v in series_episodes.items() if series_filter.lower() in k.lower()}
        series_episodes = filtered
        logger.info(f"Filtered to {len(series_episodes)} series matching '{series_filter}'")

    # Process each series
    stats = {
        'series_processed': 0,
        'episodes_processed': 0,
        'episodes_skipped': 0,
        'episodes_failed': 0,
    }

    series_count = 0
    for series_name, episodes in sorted(series_episodes.items()):
        if limit and series_count >= limit:
            break

        series_count += 1
        logger.info(f"\n{'='*80}")
        logger.info(f"Processing series: {series_name} ({len(episodes)} episodes)")
        logger.info(f"{'='*80}")

        # Get TMDB metadata for series
        tmdb_data = await get_tmdb_series_metadata(series_name)
        if tmdb_data:
            logger.info(f"  Found TMDB metadata: {tmdb_data['title']}")

        # Find or create series parent
        if dry_run:
            series_id = "dry-run-series-id"
        else:
            series_id = await find_or_create_series_parent(
                db, series_name, category_id, tmdb_data
            )

        # Process episodes
        for ep_data in episodes:
            try:
                file_path = ep_data['path']
                metadata = ep_data['metadata']

                season = metadata['season']
                episode = metadata['episode']
                filename = metadata['filename']

                if season is None or episode is None:
                    logger.warning(f"  Skipped: Could not extract S/E from {filename}")
                    stats['episodes_skipped'] += 1
                    continue

                logger.info(f"  Processing: S{season:02d}E{episode:02d} - {filename}")

                # Check file size
                file_size = os.path.getsize(file_path)
                file_size_gb = file_size / (1024 ** 3)
                if file_size_gb > 10:
                    logger.info(f"    Skipped: File too large ({file_size_gb:.1f}GB)")
                    stats['episodes_skipped'] += 1
                    continue

                # Get or calculate hash
                file_hash = await get_cached_hash(db, file_path, file_size)
                if file_hash:
                    logger.info(f"    Using cached hash: {file_hash[:16]}...")
                else:
                    file_hash = calculate_file_hash(file_path)
                    logger.info(f"    File hash: {file_hash[:16]}...")
                    if save_hash:
                        await save_hash_to_cache(db, file_path, file_hash, file_size)
                        logger.info(f"    Saved hash to cache")

                # Check for duplicates
                existing = await db.content.find_one({'file_hash': file_hash})
                if existing:
                    logger.info(f"    Skipped: Duplicate file")
                    stats['episodes_skipped'] += 1
                    continue

                # Upload to GCS
                if dry_run:
                    stream_url = f"gs://{settings.GCS_BUCKET_NAME}/series/{series_name}/S{season:02d}/{filename}"
                    logger.info(f"    [DRY RUN] Would upload to: {stream_url}")
                else:
                    safe_name = re.sub(r'[^\w\s-]', '', series_name).replace(' ', '_')
                    blob_name = f"series/{safe_name}/Season_{season:02d}/{filename}"

                    stream_url = await upload_to_gcs(file_path, blob_name)
                    if not stream_url:
                        logger.error(f"    Failed to upload to GCS")
                        stats['episodes_failed'] += 1
                        continue

                # Create episode document
                episode_title = f"{series_name} S{season:02d}E{episode:02d}"

                from bson import ObjectId
                now = datetime.now(UTC)

                episode_doc = {
                    '_id': ObjectId(),
                    'title': episode_title,
                    'description': '',
                    'stream_url': stream_url,
                    'category_id': category_id,
                    'category_name': 'Series',
                    'is_series': True,
                    'is_published': True,
                    'is_featured': False,
                    'content_type': 'episode',
                    'series_id': series_id,
                    'season': season,
                    'episode': episode,
                    'file_hash': file_hash,
                    'created_at': now,
                    'updated_at': now,
                }

                # Add series metadata to episode
                if tmdb_data:
                    episode_doc.update({
                        'thumbnail': tmdb_data.get('thumbnail'),
                        'backdrop': tmdb_data.get('backdrop'),
                        'year': int(tmdb_data['year']) if tmdb_data.get('year') else None,
                        'rating': tmdb_data.get('rating'),
                        'genres': tmdb_data.get('genres'),
                    })

                if dry_run:
                    logger.info(f"    [DRY RUN] Would add episode to database")
                else:
                    result = await db.content.insert_one(episode_doc)
                    logger.info(f"    Added to database: {result.inserted_id}")

                stats['episodes_processed'] += 1

            except Exception as e:
                logger.error(f"  Failed to process {ep_data['path']}: {e}")
                stats['episodes_failed'] += 1

        stats['series_processed'] += 1

        # Rate limit TMDB calls
        await asyncio.sleep(0.5)

    # Print summary
    logger.info("\n" + "="*80)
    logger.info("Upload complete!")
    logger.info(f"  Series processed:   {stats['series_processed']}")
    logger.info(f"  Episodes processed: {stats['episodes_processed']}")
    logger.info(f"  Episodes skipped:   {stats['episodes_skipped']}")
    logger.info(f"  Episodes failed:    {stats['episodes_failed']}")
    if save_hash:
        logger.info(f"  Hashes saved to MongoDB - subsequent runs will use cached hashes")
    logger.info("="*80)

    # Cleanup temporary directory if used
    if temp_dir:
        logger.info(f"Cleaning up temporary directory: {temp_dir}")
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='Upload TV series from USB drive or URL to GCS and MongoDB Atlas'
    )
    parser.add_argument(
        '--source',
        help='Source directory containing series folders'
    )
    parser.add_argument(
        '--url',
        help='URL to download series episode from'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only show what would be done, without uploading'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of series to process (for testing)'
    )
    parser.add_argument(
        '--series',
        type=str,
        help='Filter to specific series name (partial match)'
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
        args.source = '/Volumes/USB Drive/Series'

    asyncio.run(upload_series(
        source_dir=args.source,
        source_url=args.url,
        dry_run=args.dry_run,
        limit=args.limit,
        series_filter=args.series,
        save_hash=args.save_hash
    ))


if __name__ == '__main__':
    main()
