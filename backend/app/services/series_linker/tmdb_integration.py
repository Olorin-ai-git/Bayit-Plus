"""
TMDB Integration Module

Provides TMDB API integration for series discovery and matching.
"""

import logging
from typing import Optional

from app.core.config import settings
from app.models.content import Content

logger = logging.getLogger(__name__)


async def find_series_via_tmdb(
    series_name: str,
    create_missing: Optional[bool] = None,
) -> Optional[Content]:
    """
    Search TMDB for a series and check if we have a matching tmdb_id.

    If the series is found in TMDB but not in our database, and
    SERIES_LINKER_CREATE_MISSING_SERIES is enabled, a new series
    will be created from TMDB data.

    Args:
        series_name: The series name to search
        create_missing: Whether to create new series from TMDB data if not found locally.
                       Uses SERIES_LINKER_CREATE_MISSING_SERIES from settings if not provided.

    Returns:
        Matching Content if found, None otherwise
    """
    if create_missing is None:
        create_missing = settings.SERIES_LINKER_CREATE_MISSING_SERIES

    try:
        from app.services.tmdb_service import TMDBService

        if not settings.TMDB_API_KEY:
            logger.warning("TMDB_API_KEY not configured, skipping TMDB search")
            return None

        tmdb = TMDBService()
        search_result = await tmdb.search_tv_series(series_name)

        if not search_result:
            logger.debug(f"No TMDB results for series: '{series_name}'")
            return None

        tmdb_id = search_result.get("id")

        # Check if we have a series with this TMDB ID
        existing = await Content.find_one(
            {
                "is_series": True,
                "tmdb_id": tmdb_id,
            }
        )

        if existing:
            logger.info(f"Found series via TMDB ID {tmdb_id}: '{existing.title}'")
            return existing

        # If CREATE_MISSING_SERIES is enabled, create the series
        if create_missing:
            details = await tmdb.get_tv_series_details(tmdb_id)
            if details:
                from app.services.series_linker.series_creator import (
                    create_series_from_tmdb,
                )

                new_series = await create_series_from_tmdb(
                    details,
                    series_name,
                )
                if new_series:
                    return new_series

    except Exception as e:
        logger.error(f"Error searching TMDB for series: {e}")

    return None
