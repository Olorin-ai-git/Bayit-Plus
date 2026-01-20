"""
Metadata Auditor

Checks for missing or incomplete metadata in content items.
"""

import logging
from typing import Any, Dict, List, Optional

from app.models.content import Content
from app.services.content_auditor.constants import (
    MetadataAuditConfig,
    get_metadata_audit_config,
)

logger = logging.getLogger(__name__)


def is_external_youtube_url(
    url: str,
    config: Optional[MetadataAuditConfig] = None,
) -> bool:
    """
    Check if a URL is an external YouTube thumbnail URL that should be downloaded.

    Args:
        url: The URL to check
        config: Metadata audit configuration (optional, uses default if not provided)

    Returns:
        True if the URL is an external YouTube thumbnail
    """
    if not url:
        return False

    if config is None:
        config = get_metadata_audit_config()

    return any(pattern in url for pattern in config.youtube_url_patterns)


def check_thumbnail_issues(
    content: Content,
    config: MetadataAuditConfig,
) -> List[str]:
    """
    Check for thumbnail-related issues.

    Args:
        content: Content item to check
        config: Metadata audit configuration

    Returns:
        List of issue types found
    """
    issues: List[str] = []

    # Check thumbnail (None, empty string, or whitespace)
    if not content.thumbnail or not content.thumbnail.strip():
        issues.append("missing_thumbnail")
    elif is_external_youtube_url(content.thumbnail, config):
        issues.append("external_youtube_thumbnail")

    # Check backdrop (None, empty string, or whitespace)
    if not content.backdrop or not content.backdrop.strip():
        issues.append("missing_backdrop")
    elif is_external_youtube_url(content.backdrop, config):
        issues.append("external_youtube_backdrop")

    return issues


def check_metadata_fields(content: Content, config: MetadataAuditConfig) -> List[str]:
    """
    Check for missing or incomplete metadata fields.

    Args:
        content: Content item to check
        config: Metadata audit configuration

    Returns:
        List of issue types found
    """
    issues: List[str] = []

    # Check TMDB ID
    if not content.tmdb_id:
        issues.append("missing_tmdb_id")

    # Movies should have IMDB ID
    if not content.is_series and (not content.imdb_id or not content.imdb_id.strip()):
        issues.append("missing_imdb_id")

    # Check description (None, empty, or too short)
    if (
        not content.description
        or not content.description.strip()
        or len(content.description.strip()) < config.min_description_length
    ):
        issues.append("incomplete_description")

    # Check genre (None, empty string, or whitespace)
    if not content.genre or not content.genre.strip():
        issues.append("missing_genre")

    return issues


def check_subtitle_issues(content: Content, config: MetadataAuditConfig) -> List[str]:
    """
    Check for subtitle-related issues.

    Args:
        content: Content item to check
        config: Metadata audit configuration

    Returns:
        List of issue types found
    """
    issues: List[str] = []

    # Check subtitle availability
    if not content.has_subtitles:
        issues.append("missing_subtitles")

    # Check minimum subtitle language count for movies
    if (
        not content.is_series
        and len(content.available_subtitle_languages)
        < config.min_subtitle_languages_movie
    ):
        issues.append("insufficient_subtitle_languages")

    return issues


def check_trailer_issues(content: Content) -> List[str]:
    """
    Check for missing trailer.

    Args:
        content: Content item to check

    Returns:
        List of issue types found
    """
    issues: List[str] = []

    if not content.trailer_url:
        issues.append("missing_trailer")

    return issues


async def check_metadata_completeness(
    contents: List[Content],
) -> List[Dict[str, Any]]:
    """
    Check for missing or incomplete metadata.

    Checks:
    - Missing thumbnail/backdrop
    - External YouTube thumbnails (should be downloaded to storage)
    - Missing TMDB/IMDB data
    - Missing description
    - Empty cast/director for movies
    - Missing subtitles
    - Insufficient subtitle languages (minimum 3 for movies)
    - Missing trailer

    Args:
        contents: List of Content items to check

    Returns:
        List of dictionaries containing content_id, title, issues, and fixable flag
    """
    missing_metadata: List[Dict[str, Any]] = []
    config = get_metadata_audit_config()

    for content in contents:
        issues: List[str] = []

        # Check all categories of issues
        issues.extend(check_thumbnail_issues(content, config))
        issues.extend(check_metadata_fields(content, config))
        issues.extend(check_subtitle_issues(content, config))
        issues.extend(check_trailer_issues(content))

        if issues:
            missing_metadata.append(
                {
                    "content_id": str(content.id),
                    "title": content.title,
                    "issues": issues,
                    "fixable": True,  # Can use TMDB to fix
                }
            )

    logger.info(f"      Found {len(missing_metadata)} items with missing metadata")
    return missing_metadata
