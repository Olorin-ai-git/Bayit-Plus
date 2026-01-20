"""
YouTube Link Validator Service

Validates YouTube video links to detect broken, removed, or private videos.
Uses YouTube oEmbed API (no API key required) for basic validation,
and YouTube Data API v3 (requires API key) for detailed video info.

Supports:
- Embed URLs: https://www.youtube.com/embed/{video_id}
- Watch URLs: https://www.youtube.com/watch?v={video_id}
- Short URLs: https://youtu.be/{video_id}
- Thumbnail URLs: https://img.youtube.com/vi/{video_id}/...
"""

import asyncio
import logging
import re
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

import httpx

from app.core.config import settings
from app.models.content import Content
from app.models.librarian import StreamValidationCache

logger = logging.getLogger(__name__)

# Constants
CONCURRENT_LIMIT = 5  # Lower limit for YouTube to avoid rate limiting
VALIDATION_TIMEOUT = 10.0
CACHE_TTL_HOURS_VALID = 72  # Cache valid YouTube videos for 72 hours
CACHE_TTL_HOURS_INVALID = 12  # Recheck invalid videos after 12 hours

# YouTube URL patterns
YOUTUBE_PATTERNS = [
    re.compile(r"youtube\.com/embed/([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtu\.be/([a-zA-Z0-9_-]{11})"),
    re.compile(r"img\.youtube\.com/vi/([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtube\.com/v/([a-zA-Z0-9_-]{11})"),
]

# oEmbed endpoint (no API key required)
OEMBED_URL = "https://www.youtube.com/oembed"

# YouTube Data API v3 endpoint
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


@dataclass
class YouTubeValidationResult:
    """Result of YouTube video validation."""
    url: str
    video_id: str
    is_valid: bool
    status: str  # "available", "unavailable", "private", "removed", "error"
    title: Optional[str] = None
    author: Optional[str] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.

    Args:
        url: YouTube URL in any format

    Returns:
        11-character video ID or None if not found
    """
    if not url:
        return None

    for pattern in YOUTUBE_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)

    return None


def is_youtube_url(url: str) -> bool:
    """Check if URL is a YouTube video URL."""
    if not url:
        return False
    return any(domain in url.lower() for domain in ["youtube.com", "youtu.be"])


async def validate_youtube_video(
    url: str,
    use_api: bool = False
) -> YouTubeValidationResult:
    """
    Validate a single YouTube video URL.

    Uses oEmbed by default (no API key required).
    Set use_api=True to use YouTube Data API v3 for more detailed info.

    Args:
        url: YouTube video URL
        use_api: Whether to use YouTube Data API v3 (requires YOUTUBE_API_KEY)

    Returns:
        YouTubeValidationResult with validation details
    """
    video_id = extract_video_id(url)

    if not video_id:
        return YouTubeValidationResult(
            url=url,
            video_id="",
            is_valid=False,
            status="error",
            error_message="Could not extract video ID from URL"
        )

    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=VALIDATION_TIMEOUT) as client:
            if use_api and settings.YOUTUBE_API_KEY:
                result = await _validate_with_api(client, url, video_id)
            else:
                result = await _validate_with_oembed(client, url, video_id)

            result.response_time_ms = int((time.time() - start_time) * 1000)
            return result

    except httpx.TimeoutException:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="error",
            error_message="Request timeout",
            response_time_ms=int((time.time() - start_time) * 1000)
        )
    except httpx.ConnectError:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="error",
            error_message="Connection failed",
            response_time_ms=int((time.time() - start_time) * 1000)
        )
    except Exception as e:
        logger.error(f"Error validating YouTube video {video_id}: {e}")
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="error",
            error_message=str(e),
            response_time_ms=int((time.time() - start_time) * 1000)
        )


async def _validate_with_oembed(
    client: httpx.AsyncClient,
    url: str,
    video_id: str
) -> YouTubeValidationResult:
    """Validate using YouTube oEmbed API (no API key required)."""
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    params = {"url": watch_url, "format": "json"}

    response = await client.get(OEMBED_URL, params=params)

    if response.status_code == 200:
        data = response.json()
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=True,
            status="available",
            title=data.get("title"),
            author=data.get("author_name")
        )
    elif response.status_code == 401:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="private",
            error_message="Video is private or requires authentication"
        )
    elif response.status_code == 404:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="removed",
            error_message="Video not found or has been removed"
        )
    elif response.status_code == 403:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="unavailable",
            error_message="Video is not available (may be region-locked or restricted)"
        )
    else:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="error",
            error_message=f"HTTP {response.status_code}"
        )


async def _validate_with_api(
    client: httpx.AsyncClient,
    url: str,
    video_id: str
) -> YouTubeValidationResult:
    """Validate using YouTube Data API v3 (requires API key)."""
    params = {
        "key": settings.YOUTUBE_API_KEY,
        "id": video_id,
        "part": "snippet,status"
    }

    response = await client.get(f"{YOUTUBE_API_BASE}/videos", params=params)

    if response.status_code != 200:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="error",
            error_message=f"API error: HTTP {response.status_code}"
        )

    data = response.json()
    items = data.get("items", [])

    if not items:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="removed",
            error_message="Video not found or has been removed"
        )

    video = items[0]
    snippet = video.get("snippet", {})
    status = video.get("status", {})

    privacy_status = status.get("privacyStatus", "public")
    embeddable = status.get("embeddable", True)

    if privacy_status == "private":
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="private",
            title=snippet.get("title"),
            author=snippet.get("channelTitle"),
            error_message="Video is private"
        )

    if not embeddable:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status="unavailable",
            title=snippet.get("title"),
            author=snippet.get("channelTitle"),
            error_message="Video embedding is disabled"
        )

    return YouTubeValidationResult(
        url=url,
        video_id=video_id,
        is_valid=True,
        status="available",
        title=snippet.get("title"),
        author=snippet.get("channelTitle")
    )


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
    logger.info("🎬 Starting YouTube link validation...")

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

    logger.info(f"   Found {len(contents)} items with YouTube URLs")

    if not contents:
        return {
            "success": True,
            "total_checked": 0,
            "valid_videos": 0,
            "broken_videos": [],
            "message": "No YouTube content found"
        }

    # Prepare URLs for validation
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

    # Check cache and filter
    if use_cache:
        uncached, cached_results = await _filter_cached_youtube(urls_to_validate)
    else:
        uncached = urls_to_validate
        cached_results = []

    logger.info(f"   Using cache for {len(cached_results)} URLs")
    logger.info(f"   Validating {len(uncached)} URLs")

    # Initialize results
    results = {
        "success": True,
        "total_checked": len(urls_to_validate),
        "valid_videos": 0,
        "broken_videos": [],
        "cached_results": len(cached_results)
    }

    # Process cached results
    for cached in cached_results:
        if cached.get("is_valid"):
            results["valid_videos"] += 1
        else:
            results["broken_videos"].append(cached)

    # Validate uncached URLs with concurrency limit
    if uncached:
        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)

        async def validate_with_semaphore(item: Dict[str, Any]) -> Tuple[Dict[str, Any], YouTubeValidationResult]:
            async with semaphore:
                result = await validate_youtube_video(item["url"])
                # Cache the result
                await _cache_youtube_result(result)
                return item, result

        validation_tasks = [validate_with_semaphore(item) for item in uncached]
        validation_results = await asyncio.gather(*validation_tasks, return_exceptions=True)

        for result in validation_results:
            if isinstance(result, Exception):
                logger.error(f"Validation error: {result}")
                continue

            item, validation = result

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

    logger.info(f"   ✅ YouTube validation complete:")
    logger.info(f"      Valid: {results['valid_videos']}")
    logger.info(f"      Broken: {len(results['broken_videos'])}")

    results["message"] = (
        f"Validated {results['total_checked']} YouTube URLs: "
        f"{results['valid_videos']} valid, {len(results['broken_videos'])} broken"
    )

    return results


async def _filter_cached_youtube(
    urls: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Filter URLs based on cache, return (uncached, cached_results)."""
    uncached = []
    cached_results = []
    now = datetime.utcnow()

    for item in urls:
        cached = await StreamValidationCache.find_one({
            "stream_url": item["url"],
            "expires_at": {"$gt": now}
        })

        if cached:
            if not cached.is_valid:
                cached_results.append({
                    "content_id": item["content_id"],
                    "title": item["title"],
                    "field": item["field"],
                    "url": item["url"],
                    "status": "cached_invalid",
                    "error": cached.error_message,
                    "is_valid": False,
                    "from_cache": True
                })
            else:
                cached_results.append({"is_valid": True})
        else:
            uncached.append(item)

    return uncached, cached_results


async def _cache_youtube_result(result: YouTubeValidationResult):
    """Cache a YouTube validation result."""
    try:
        if result.is_valid:
            ttl = timedelta(hours=CACHE_TTL_HOURS_VALID)
        else:
            ttl = timedelta(hours=CACHE_TTL_HOURS_INVALID)

        cache_entry = StreamValidationCache(
            stream_url=result.url,
            last_validated=datetime.utcnow(),
            is_valid=result.is_valid,
            status_code=200 if result.is_valid else 404,
            response_time_ms=result.response_time_ms,
            error_message=result.error_message,
            stream_type="youtube",
            content_type="video/youtube",
            expires_at=datetime.utcnow() + ttl
        )

        # Upsert (replace if exists)
        existing = await StreamValidationCache.find_one({"stream_url": result.url})
        if existing:
            await existing.delete()

        await cache_entry.insert()

    except Exception as e:
        logger.warning(f"Failed to cache YouTube validation result: {e}")


# YouTube thumbnail quality options (best to worst)
YOUTUBE_THUMBNAIL_QUALITIES = [
    "maxresdefault.jpg",  # 1280x720 - not always available
    "sddefault.jpg",      # 640x480 - usually available
    "hqdefault.jpg",      # 480x360 - always available
    "mqdefault.jpg",      # 320x180 - always available
]


def get_youtube_thumbnail_url(video_id: str, quality: str = "hqdefault.jpg") -> str:
    """
    Get YouTube thumbnail URL for a video ID.

    Args:
        video_id: 11-character YouTube video ID
        quality: Thumbnail quality (maxresdefault, sddefault, hqdefault, mqdefault)

    Returns:
        Thumbnail URL
    """
    return f"https://img.youtube.com/vi/{video_id}/{quality}"


async def get_best_youtube_thumbnail(video_id: str) -> Optional[str]:
    """
    Get the best available YouTube thumbnail URL.

    Tries highest quality first and falls back to lower qualities.
    Returns None if video doesn't exist.

    Args:
        video_id: 11-character YouTube video ID

    Returns:
        Best available thumbnail URL or None
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            for quality in YOUTUBE_THUMBNAIL_QUALITIES:
                url = get_youtube_thumbnail_url(video_id, quality)
                try:
                    response = await client.head(url)
                    if response.status_code == 200:
                        # Verify it's not the default "no thumbnail" placeholder
                        # by checking content-length (placeholder is very small)
                        content_length = response.headers.get("content-length", "0")
                        if int(content_length) > 1000:  # Real thumbnails are > 1KB
                            return url
                except Exception:
                    continue

            # Fallback to hqdefault which always exists
            return get_youtube_thumbnail_url(video_id, "hqdefault.jpg")

    except Exception as e:
        logger.warning(f"Failed to get YouTube thumbnail for {video_id}: {e}")
        return get_youtube_thumbnail_url(video_id, "hqdefault.jpg")


async def fix_youtube_thumbnails(
    limit: int = 100,
    category_id: Optional[str] = None,
    include_kids: bool = True,
    dry_run: bool = True
) -> Dict[str, Any]:
    """
    Fix missing or low-quality thumbnails for YouTube content.

    Fetches high-quality thumbnails from YouTube and updates content records.

    Args:
        limit: Maximum number of items to process
        category_id: Optional category filter
        include_kids: Include kids content
        dry_run: If True, only report what would be fixed

    Returns:
        Summary of fixes applied
    """
    logger.info("🖼️ Fixing YouTube thumbnails...")

    # Build query for YouTube content with missing or placeholder thumbnails
    query: Dict[str, Any] = {
        "is_published": True,
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}},
        ]
    }

    if category_id:
        query["category_id"] = category_id

    if not include_kids:
        query["is_kids_content"] = {"$ne": True}

    # Fetch YouTube content
    contents = await Content.find(query).limit(limit).to_list()

    logger.info(f"   Found {len(contents)} YouTube items to check")

    results = {
        "success": True,
        "dry_run": dry_run,
        "total_checked": len(contents),
        "thumbnails_fixed": 0,
        "already_good": 0,
        "failed": 0,
        "fixed_items": [],
        "errors": []
    }

    for content in contents:
        try:
            video_id = extract_video_id(content.stream_url)
            if not video_id:
                results["errors"].append({
                    "content_id": str(content.id),
                    "title": content.title,
                    "error": "Could not extract video ID"
                })
                results["failed"] += 1
                continue

            # Check if thumbnail needs fixing
            current_thumbnail = content.thumbnail or ""
            needs_fix = False

            # Needs fix if: no thumbnail, or using low-quality thumbnail
            if not current_thumbnail:
                needs_fix = True
            elif "youtube.com/vi" in current_thumbnail or "img.youtube.com" in current_thumbnail:
                # Already has YouTube thumbnail, check if it's the best quality
                if "maxresdefault" not in current_thumbnail and "sddefault" not in current_thumbnail:
                    needs_fix = True
            elif not current_thumbnail.startswith("http"):
                needs_fix = True

            if not needs_fix:
                results["already_good"] += 1
                continue

            # Get best thumbnail
            best_thumbnail = await get_best_youtube_thumbnail(video_id)

            if not best_thumbnail:
                results["errors"].append({
                    "content_id": str(content.id),
                    "title": content.title,
                    "error": "Could not fetch thumbnail"
                })
                results["failed"] += 1
                continue

            if dry_run:
                results["fixed_items"].append({
                    "content_id": str(content.id),
                    "title": content.title,
                    "video_id": video_id,
                    "old_thumbnail": current_thumbnail or "(none)",
                    "new_thumbnail": best_thumbnail,
                    "would_fix": True
                })
                results["thumbnails_fixed"] += 1
            else:
                # Apply the fix
                content.thumbnail = best_thumbnail
                content.backdrop = best_thumbnail  # Use same for backdrop
                content.poster_url = best_thumbnail
                content.updated_at = datetime.utcnow()
                await content.save()

                results["fixed_items"].append({
                    "content_id": str(content.id),
                    "title": content.title,
                    "video_id": video_id,
                    "old_thumbnail": current_thumbnail or "(none)",
                    "new_thumbnail": best_thumbnail,
                    "fixed": True
                })
                results["thumbnails_fixed"] += 1

                logger.info(f"   Fixed thumbnail for: {content.title[:50]}...")

        except Exception as e:
            results["errors"].append({
                "content_id": str(content.id),
                "title": content.title,
                "error": str(e)
            })
            results["failed"] += 1

    action = "would fix" if dry_run else "fixed"
    results["message"] = (
        f"YouTube thumbnails: {action} {results['thumbnails_fixed']}, "
        f"already good {results['already_good']}, failed {results['failed']}"
    )

    logger.info(f"   ✅ YouTube thumbnail fix complete: {results['message']}")

    return results


async def find_youtube_content_missing_posters(
    limit: int = 100,
    include_kids: bool = True
) -> Dict[str, Any]:
    """
    Find YouTube content items that are missing proper thumbnails/posters.

    Args:
        limit: Maximum number of items to return
        include_kids: Include kids content

    Returns:
        List of content items needing poster fixes
    """
    logger.info("🔍 Finding YouTube content with missing posters...")

    # Query for YouTube content
    base_query: Dict[str, Any] = {
        "is_published": True,
        "$or": [
            {"stream_url": {"$regex": "youtube\\.com|youtu\\.be"}},
        ]
    }

    if not include_kids:
        base_query["is_kids_content"] = {"$ne": True}

    # Find items with missing or bad thumbnails
    missing_query = {
        **base_query,
        "$or": [
            {"thumbnail": None},
            {"thumbnail": ""},
            {"thumbnail": {"$exists": False}},
            {"poster_url": None},
            {"poster_url": ""},
            {"poster_url": {"$exists": False}},
        ]
    }

    missing_items = await Content.find(missing_query).limit(limit).to_list()

    results = []
    for item in missing_items:
        video_id = extract_video_id(item.stream_url) if item.stream_url else None
        results.append({
            "content_id": str(item.id),
            "title": item.title,
            "video_id": video_id,
            "current_thumbnail": item.thumbnail,
            "current_poster": item.poster_url,
            "is_kids": item.is_kids_content,
            "category_id": item.category_id
        })

    return {
        "success": True,
        "total_found": len(results),
        "items": results,
        "message": f"Found {len(results)} YouTube items with missing posters"
    }
