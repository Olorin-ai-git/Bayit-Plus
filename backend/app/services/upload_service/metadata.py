"""
Metadata Extraction Module - Extract metadata from uploaded files

Handles metadata extraction for movies, series, and podcasts
including TMDB lookups and filename parsing.
"""

import re
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from app.services.tmdb_service import TMDBService
from app.models.upload import UploadJob

logger = logging.getLogger(__name__)


class MetadataExtractor:
    """Extracts metadata from uploaded content files."""

    def __init__(self, tmdb_service: Optional[TMDBService] = None):
        self.tmdb_service = tmdb_service or TMDBService()

    async def extract_movie_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a movie file."""
        filename = Path(job.filename).stem

        # Remove quality indicators
        title = re.sub(r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?', '', filename, flags=re.IGNORECASE)
        title = re.sub(r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?', '', title, flags=re.IGNORECASE)

        # Extract year
        year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', title)
        year = int(year_match.group(1)) if year_match else None

        if year:
            title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', title)

        # Clean up title
        title = re.sub(r'[._]', ' ', title)
        title = re.sub(r'\s+', ' ', title).strip()

        metadata = {
            'title': title,
            'year': year,
        }

        # Fetch from TMDB if available
        if title:
            try:
                tmdb_data = await self.tmdb_service.search_movie(title, year)
                if tmdb_data:
                    metadata.update(tmdb_data)
            except Exception as e:
                logger.warning(f"TMDB lookup failed for '{title}': {e}")

        return metadata

    async def extract_series_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a series file."""
        filename = Path(job.filename).stem

        # Remove quality indicators
        title = re.sub(r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?', '', filename, flags=re.IGNORECASE)
        title = re.sub(r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?', '', title, flags=re.IGNORECASE)

        # Try to extract season/episode info (S01E01, 1x01, etc.)
        season_ep_match = re.search(r'[Ss](\d{1,2})[Ee](\d{1,2})', title)
        season = int(season_ep_match.group(1)) if season_ep_match else None
        episode = int(season_ep_match.group(2)) if season_ep_match else None

        # Remove season/episode from title
        if season_ep_match:
            title = title[:season_ep_match.start()]

        # Alternative format: 1x01
        if not season:
            alt_match = re.search(r'(\d{1,2})x(\d{1,2})', title)
            if alt_match:
                season = int(alt_match.group(1))
                episode = int(alt_match.group(2))
                title = title[:alt_match.start()]

        # Extract year
        year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', title)
        year = int(year_match.group(1)) if year_match else None

        if year:
            title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', title)

        # Clean up title
        title = re.sub(r'[._]', ' ', title)
        title = re.sub(r'\s+', ' ', title).strip()

        metadata = {
            'title': title,
            'year': year,
            'season': season,
            'episode': episode,
        }

        # Fetch from TMDB if available
        if title:
            try:
                tmdb_data = await self.tmdb_service.enrich_series_content(title, year)
                if tmdb_data:
                    metadata.update(tmdb_data)
            except Exception as e:
                logger.warning(f"TMDB lookup failed for series '{title}': {e}")

        return metadata

    async def extract_podcast_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a podcast episode file."""
        filename = Path(job.filename).stem

        return {
            'title': filename,
        }


# Global metadata extractor instance
metadata_extractor = MetadataExtractor()
