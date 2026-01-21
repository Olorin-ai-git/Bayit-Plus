"""
YouTube Validator Module

Validates YouTube video links to detect broken, removed, or private videos.
Uses YouTube oEmbed API (no API key required) for basic validation,
and YouTube Data API v3 (requires API key) for detailed video info.

Supports:
- Embed URLs: https://www.youtube.com/embed/{video_id}
- Watch URLs: https://www.youtube.com/watch?v={video_id}
- Short URLs: https://youtu.be/{video_id}
- Thumbnail URLs: https://img.youtube.com/vi/{video_id}/...

Re-exports all public functions for backward compatibility.
"""

# Batch validation functions
from app.services.youtube_validator.batch_validator import \
    validate_youtube_content
# Cache functions
from app.services.youtube_validator.cache import (cache_youtube_result,
                                                  filter_cached_youtube,
                                                  get_cached_validation,
                                                  invalidate_cache)
# Constants (for backward compatibility with direct imports)
from app.services.youtube_validator.constants import (  # Configuration getters
    OEMBED_URL, THUMBNAIL_QUALITIES, VIDEO_STATUS_AVAILABLE,
    VIDEO_STATUS_ERROR, VIDEO_STATUS_PRIVATE, VIDEO_STATUS_REMOVED,
    VIDEO_STATUS_UNAVAILABLE, YOUTUBE_API_BASE_URL, YOUTUBE_DOMAINS,
    YOUTUBE_URL_PATTERNS, get_cache_ttl_invalid_hours,
    get_cache_ttl_valid_hours, get_concurrent_limit,
    get_thumbnail_min_size_bytes, get_thumbnail_timeout,
    get_validation_timeout)
# Models
from app.services.youtube_validator.models import YouTubeValidationResult
# Poster finder functions
from app.services.youtube_validator.poster_finder import \
    find_youtube_content_missing_posters
# Thumbnail fixer functions
from app.services.youtube_validator.thumbnail_fixer import (
    fix_youtube_thumbnails, thumbnail_needs_fix)
# URL parsing functions
from app.services.youtube_validator.url_parser import (
    build_embed_url, build_watch_url, extract_video_id, get_thumbnail_url,
    is_youtube_url, normalize_youtube_url, validate_video_id_format)
# Video validation functions
from app.services.youtube_validator.video_validator import (
    get_best_youtube_thumbnail, validate_youtube_video)

# Legacy aliases for backward compatibility
YOUTUBE_PATTERNS = YOUTUBE_URL_PATTERNS
YOUTUBE_THUMBNAIL_QUALITIES = THUMBNAIL_QUALITIES
get_youtube_thumbnail_url = get_thumbnail_url

__all__ = [
    # Models
    "YouTubeValidationResult",
    # URL parsing
    "extract_video_id",
    "is_youtube_url",
    "build_watch_url",
    "build_embed_url",
    "get_thumbnail_url",
    "get_youtube_thumbnail_url",
    "normalize_youtube_url",
    "validate_video_id_format",
    # Video validation
    "validate_youtube_video",
    "get_best_youtube_thumbnail",
    # Batch validation
    "validate_youtube_content",
    # Cache
    "filter_cached_youtube",
    "cache_youtube_result",
    "get_cached_validation",
    "invalidate_cache",
    # Thumbnail fixer
    "fix_youtube_thumbnails",
    "thumbnail_needs_fix",
    # Poster finder
    "find_youtube_content_missing_posters",
    # Constants
    "YOUTUBE_URL_PATTERNS",
    "YOUTUBE_PATTERNS",
    "YOUTUBE_DOMAINS",
    "OEMBED_URL",
    "YOUTUBE_API_BASE_URL",
    "THUMBNAIL_QUALITIES",
    "YOUTUBE_THUMBNAIL_QUALITIES",
    "VIDEO_STATUS_AVAILABLE",
    "VIDEO_STATUS_UNAVAILABLE",
    "VIDEO_STATUS_PRIVATE",
    "VIDEO_STATUS_REMOVED",
    "VIDEO_STATUS_ERROR",
    # Configuration getters
    "get_concurrent_limit",
    "get_validation_timeout",
    "get_cache_ttl_valid_hours",
    "get_cache_ttl_invalid_hours",
    "get_thumbnail_min_size_bytes",
    "get_thumbnail_timeout",
]
