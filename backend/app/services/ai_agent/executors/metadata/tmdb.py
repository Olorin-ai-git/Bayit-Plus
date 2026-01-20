"""
AI Agent Executors - TMDB Metadata Operations

Functions for searching TMDB and applying metadata to content.
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


async def execute_search_tmdb(
    title: str,
    year: Optional[int] = None,
    content_type: str = "movie"
) -> Dict[str, Any]:
    """
    Search TMDB for content metadata.

    Args:
        title: The title to search for
        year: Optional release year to narrow results
        content_type: Type of content ("movie" or "series")

    Returns:
        Dict with success status and TMDB data if found
    """
    try:
        from app.core.config import settings
        from app.services.tmdb_service import TMDBService

        if not settings.TMDB_API_KEY:
            return {"success": False, "error": "TMDB API key not configured"}

        tmdb = TMDBService()
        is_movie = content_type in ("movie", "film")
        search_result = await (
            tmdb.search_movie(title, year) if is_movie
            else tmdb.search_tv_series(title, year)
        )

        if not search_result:
            return {
                "success": True,
                "found": False,
                "message": f"No results found for '{title}'"
            }

        tmdb_id = search_result.get("id")
        details = await (
            tmdb.get_movie_details(tmdb_id) if is_movie
            else tmdb.get_tv_series_details(tmdb_id)
        )

        if not details:
            return {
                "success": True,
                "found": False,
                "message": f"Could not fetch details for TMDB ID {tmdb_id}"
            }

        release_date = details.get("release_date") or details.get("first_air_date", "")
        return {
            "success": True,
            "found": True,
            "tmdb_data": {
                "tmdb_id": details.get("id"),
                "title": details.get("title") or details.get("name"),
                "description": details.get("overview"),
                "poster_path": details.get("poster_path"),
                "backdrop_path": details.get("backdrop_path"),
                "release_year": release_date[:4] if release_date else None,
                "imdb_rating": details.get("vote_average"),
                "genres": [g.get("name") for g in details.get("genres", [])]
            }
        }
    except Exception as e:
        logger.error(f"Error in search_tmdb: {e}")
        return {"success": False, "error": str(e)}
