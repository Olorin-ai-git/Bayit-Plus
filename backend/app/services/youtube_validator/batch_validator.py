"""
YouTube Batch Validator

Functions for validating YouTube content in bulk.
Handles concurrent validation with rate limiting and caching.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple

from app.models.content import Content
from app.services.youtube_validator.constants import get_concurrent_limit
from app.services.youtube_validator.models import YouTubeValidationResult
from app.services.youtube_validator.url_parser import is_youtube_url
from app.services.youtube_validator.video_validator import validate_youtube_video
from app.services.youtube_validator.cache import (
    filter_cached_youtube,
    cache_youtube_result,
)


logger = logging.getLogger(__name__)


async def validate_youtube_content(
    limit: int = 100,
    category_id: Optional[str] = None,
    include_kids: bool = True,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Validate all YouTube content in the database.

    Args:
        limit: Maximum number of items to validate
        category_id: Optional category filter
        include_kids: Include kids content in validation
        use_cache: Use cached validation results

    Returns:
        Validation summary with broken links list
    """
    logger.info("Starting YouTube link validation...")

    # Build query for YouTube content
    query: Dict[str, Any] = {
        "is_published": True,
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}},
            {"trailer_url": {"$regex": "youtube\\.com|youtu\\.be"}}
        ]
    }

    if category_id:
        query["category_id"] = category_id

    if not include_kids:
        query["is_kids_content"] = {"$ne": True}

    # Fetch content with YouTube URLs
    contents = await Content.find(query).limit(limit).to_list()

    logger.info(f"Found {len(contents)} items with YouTube URLs")

    if not contents:
        return {
            "success": True,
            "total_checked": 0,
            "valid_videos": 0,
            "broken_videos": [],
            "message": "No YouTube content found"
        }

    # Prepare URLs for validation
    urls_to_validate = _extract_youtube_urls(contents)

    # Check cache and filter
    if use_cache:
        uncached, cached_results = await filter_cached_youtube(urls_to_validate)
    else:
        uncached = urls_to_validate
        cached_results = []

    logger.info(f"Using cache for {len(cached_results)} URLs")
    logger.info(f"Validating {len(uncached)} URLs")

    # Initialize results
    results = {
        "success": True,
        "total_checked": len(urls_to_validate),
        "valid_videos": 0,
        "broken_videos": [],
        "cached_results": len(cached_results)
    }

    # Process cached results
    _process_cached_results(results, cached_results)

    # Validate uncached URLs with concurrency limit
    if uncached:
        await _validate_uncached_urls(results, uncached)

    logger.info(f"YouTube validation complete: Valid: {results['valid_videos']}")
    logger.info(f"Broken: {len(results['broken_videos'])}")

    results["message"] = (
        f"Validated {results['total_checked']} YouTube URLs: "
        f"{results['valid_videos']} valid, {len(results['broken_videos'])} broken"
    )

    return results


def _extract_youtube_urls(contents: List[Content]) -> List[Dict[str, Any]]:
    """Extract YouTube URLs from content items."""
    urls_to_validate: List[Dict[str, Any]] = []

    for content in contents:
        if content.stream_url and is_youtube_url(content.stream_url):
            urls_to_validate.append({
                "url": content.stream_url,
                "content_id": str(content.id),
                "title": content.title,
                "field": "stream_url"
            })

        if content.trailer_url and is_youtube_url(content.trailer_url):
            urls_to_validate.append({
                "url": content.trailer_url,
                "content_id": str(content.id),
                "title": content.title,
                "field": "trailer_url"
            })

    return urls_to_validate


def _process_cached_results(
    results: Dict[str, Any],
    cached_results: List[Dict[str, Any]]
) -> None:
    """Process cached validation results."""
    for cached in cached_results:
        if cached.get("is_valid"):
            results["valid_videos"] += 1
        else:
            results["broken_videos"].append(cached)


async def _validate_uncached_urls(
    results: Dict[str, Any],
    uncached: List[Dict[str, Any]]
) -> None:
    """Validate uncached URLs with concurrency limit."""
    concurrent_limit = get_concurrent_limit()
    semaphore = asyncio.Semaphore(concurrent_limit)

    async def validate_with_semaphore(
        item: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], YouTubeValidationResult]:
        async with semaphore:
            result = await validate_youtube_video(item["url"])
            # Cache the result
            await cache_youtube_result(result)
            return item, result

    validation_tasks = [validate_with_semaphore(item) for item in uncached]
    validation_results = await asyncio.gather(*validation_tasks, return_exceptions=True)

    for result in validation_results:
        if isinstance(result, Exception):
            logger.error(f"Validation error: {result}")
            continue

        item, validation = result
        _process_validation_result(results, item, validation)


def _process_validation_result(
    results: Dict[str, Any],
    item: Dict[str, Any],
    validation: YouTubeValidationResult
) -> None:
    """Process a single validation result."""
    if validation.is_valid:
        results["valid_videos"] += 1
    else:
        results["broken_videos"].append({
            "content_id": item["content_id"],
            "title": item["title"],
            "field": item["field"],
            "url": item["url"],
            "video_id": validation.video_id,
            "status": validation.status,
            "error": validation.error_message,
            "response_time_ms": validation.response_time_ms
        })
