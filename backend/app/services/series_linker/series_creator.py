"""
Series Creator Module

Provides series container creation from TMDB data.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.models.content import Content

logger = logging.getLogger(__name__)


async def create_series_from_tmdb(
    tmdb_data: Dict[str, Any],
    fallback_title: str,
) -> Optional[Content]:
    """
    Create a new series Content from TMDB data.

    Extracts metadata from TMDB TV series details including:
    - Title (Hebrew/English)
    - Description/overview
    - Poster and backdrop images
    - Year of first air date
    - External IDs (IMDB)
    - Ratings and vote counts
    - Genres
    - Season/episode counts

    Args:
        tmdb_data: TMDB series details dictionary
        fallback_title: Title to use if TMDB doesn't have one

    Returns:
        The created Content object, or None if creation failed
    """
    try:
        from app.services.tmdb_service import TMDBService

        tmdb = TMDBService()

        # Get poster URL
        poster_url = None
        if tmdb_data.get("poster_path"):
            poster_url = tmdb.get_image_url(tmdb_data["poster_path"], "w500")

        backdrop_url = None
        if tmdb_data.get("backdrop_path"):
            backdrop_url = tmdb.get_image_url(tmdb_data["backdrop_path"], "w1280")

        # Extract first air date year
        first_air_date = tmdb_data.get("first_air_date", "")
        year = None
        if first_air_date:
            try:
                year = int(first_air_date.split("-")[0])
            except (ValueError, IndexError):
                pass

        # Get external IDs
        external_ids = tmdb_data.get("external_ids", {})

        # Find the appropriate category for series
        from app.models.content_taxonomy import ContentSection as Category
        series_category = await Category.find_one({"slug": "series"})
        if not series_category:
            series_category = await Category.find_one({"slug": "tv"})
        if not series_category:
            series_category = await Category.find_one({})  # Fallback to any category

        category_id = str(series_category.id) if series_category else ""

        new_series = Content(
            title=tmdb_data.get("name") or fallback_title,
            title_en=tmdb_data.get("original_name"),
            description=tmdb_data.get("overview"),
            poster_url=poster_url,
            thumbnail=poster_url,
            backdrop=backdrop_url,
            year=year,
            tmdb_id=tmdb_data.get("id"),
            imdb_id=external_ids.get("imdb_id"),
            imdb_rating=tmdb_data.get("vote_average"),
            imdb_votes=tmdb_data.get("vote_count"),
            genres=[g.get("name") for g in tmdb_data.get("genres", [])],
            total_seasons=tmdb_data.get("number_of_seasons"),
            total_episodes=tmdb_data.get("number_of_episodes"),
            is_series=True,
            content_type="series",
            is_published=True,
            category_id=category_id,
            stream_url="",  # Series container doesn't need a stream URL
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        await new_series.insert()
        logger.info(f"Created new series from TMDB: '{new_series.title}' (ID: {new_series.id})")

        return new_series

    except Exception as e:
        logger.error(f"Error creating series from TMDB: {e}", exc_info=True)
        return None
