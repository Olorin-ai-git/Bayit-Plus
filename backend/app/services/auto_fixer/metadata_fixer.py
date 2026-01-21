"""
Metadata Fixer

Functions for fixing missing metadata using TMDB and other sources.
"""

import logging
import re
from typing import Any, Dict

from app.models.content import Content

logger = logging.getLogger(__name__)


def clean_title(title: str) -> str:
    """Clean title by removing year, resolution, quality markers."""
    if not title:
        return title

    # Remove year patterns (2020), [2020], etc
    title = re.sub(r"[\(\[]?\d{4}[\)\]]?", "", title)
    # Remove resolution/quality markers
    title = re.sub(
        r"\b(1080p|720p|480p|4K|HD|WEB-DL|BluRay|x264|x265)\b", "", title, flags=re.I
    )
    # Remove special chars and extra spaces
    title = re.sub(r"[_\.]", " ", title)
    title = re.sub(r"\s+", " ", title)

    return title.strip()


def is_youtube_thumbnail_url(url: str) -> bool:
    """Check if URL is a YouTube thumbnail."""
    return bool(url and ("youtube.com" in url or "ytimg.com" in url))


async def fix_missing_metadata(content_id: str) -> Dict[str, Any]:
    """Fix missing metadata for content using TMDB."""
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": "Content not found"}

        from app.core.config import settings
        from app.services.tmdb_service import TMDBService

        if not settings.TMDB_API_KEY:
            return {"success": False, "error": "TMDB API key not configured"}

        tmdb = TMDBService()
        fields_updated = []

        # Search for content on TMDB
        is_movie = content.content_type in ("movie", "vod")
        search_result = await (
            tmdb.search_movie(content.title, content.year)
            if is_movie
            else tmdb.search_tv_series(content.title, content.year)
        )

        if not search_result:
            return {"success": False, "error": f"No TMDB results for '{content.title}'"}

        # Get full details
        tmdb_id = search_result.get("id")
        details = await (
            tmdb.get_movie_details(tmdb_id)
            if is_movie
            else tmdb.get_tv_series_details(tmdb_id)
        )

        if not details:
            return {"success": False, "error": "Could not fetch TMDB details"}

        # Update missing fields using TMDBService's IMAGE_BASE_URL constant
        fields_updated = _update_content_from_tmdb(
            content, details, tmdb_id, TMDBService.IMAGE_BASE_URL
        )

        # Save updates
        if fields_updated:
            await content.save()
            logger.info(f"Fixed metadata for '{content.title}': {fields_updated}")

        return {"success": True, "fixed": True, "fields_updated": fields_updated}

    except Exception as e:
        logger.error(f"Error fixing metadata for {content_id}: {e}")
        return {"success": False, "error": str(e)}


def _update_content_from_tmdb(
    content: Content, details: Dict[str, Any], tmdb_id: int, image_base_url: str
) -> list[str]:
    """Update content fields from TMDB details. Returns list of updated fields."""
    fields_updated = []

    if not content.description and details.get("overview"):
        content.description = details["overview"]
        content.description_en = details["overview"]
        fields_updated.append("description")

    if not content.poster_url and details.get("poster_path"):
        content.poster_url = f"{image_base_url}/w500{details['poster_path']}"
        content.thumbnail = content.poster_url
        fields_updated.append("poster")

    if not content.backdrop and details.get("backdrop_path"):
        content.backdrop = f"{image_base_url}/original{details['backdrop_path']}"
        fields_updated.append("backdrop")

    if not content.tmdb_id:
        content.tmdb_id = str(tmdb_id)
        fields_updated.append("tmdb_id")

    if details.get("vote_average") and not content.imdb_rating:
        content.imdb_rating = details["vote_average"]
        fields_updated.append("rating")

    return fields_updated
