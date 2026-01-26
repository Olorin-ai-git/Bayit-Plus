"""
Metadata Verification and Rehydration

Validates metadata completeness and re-fetches from TMDB when needed.
"""

import logging
from typing import TYPE_CHECKING

from app.models.content import Content
from app.services.tmdb_service import TMDBService

from ..models import MetadataVerificationResult, RehydrationResult

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


async def verify_metadata_completeness(
    content: Content,
) -> MetadataVerificationResult:
    """
    Validate metadata completeness.

    Required fields:
    - title (always present)
    - description
    - poster_url or thumbnail
    - year
    - stream_url (always present)

    Args:
        content: Content item to check

    Returns:
        MetadataVerificationResult
    """
    missing_fields = []

    if not content.description:
        missing_fields.append("description")
    if not content.poster_url and not content.thumbnail:
        missing_fields.append("poster/thumbnail")
    if not content.year:
        missing_fields.append("year")

    return MetadataVerificationResult(
        complete=len(missing_fields) == 0,
        missing_fields=missing_fields,
        last_updated=content.updated_at if hasattr(content, "updated_at") else None,
    )


async def rehydrate_metadata_from_tmdb(
    content: Content, tmdb_service: TMDBService, dry_run: bool = True
) -> RehydrationResult:
    """
    Re-fetch metadata from TMDB and update content.

    Args:
        content: Content item to rehydrate
        tmdb_service: TMDB service instance
        dry_run: If True, don't save changes

    Returns:
        RehydrationResult with updated fields
    """
    result = RehydrationResult(success=False)
    fields_updated = []

    try:
        # Search TMDB
        if content.is_series:
            tmdb_data = await tmdb_service.search_tv_series(content.title, content.year)
        else:
            tmdb_data = await tmdb_service.search_movie(content.title, content.year)

        if not tmdb_data:
            result.error = "No TMDB match found"
            return result

        # Get details
        tmdb_id = tmdb_data.get("id")
        if content.is_series:
            details = await tmdb_service.get_tv_series_details(tmdb_id)
        else:
            details = await tmdb_service.get_movie_details(tmdb_id)

        if not details:
            result.error = "Failed to fetch TMDB details"
            return result

        # Update fields (only if not dry-run)
        if not dry_run:
            if not content.description and details.get("overview"):
                content.description = details["overview"]
                fields_updated.append("description")

            if not content.poster_url and details.get("poster_path"):
                content.poster_url = (
                    f"{tmdb_service.IMAGE_BASE_URL}/w500{details['poster_path']}"
                )
                fields_updated.append("poster_url")

            if not content.year:
                if content.is_series and details.get("first_air_date"):
                    year_str = details["first_air_date"][:4]
                    content.year = int(year_str)
                    fields_updated.append("year")
                elif details.get("release_date"):
                    year_str = details["release_date"][:4]
                    content.year = int(year_str)
                    fields_updated.append("year")

            if fields_updated:
                await content.save()

        result.success = True
        result.fields_updated = fields_updated

    except Exception as e:
        result.error = str(e)
        logger.error(f"TMDB rehydration failed for {content.title}: {e}")

    return result
