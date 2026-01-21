"""
YouTube Content Checker

Re-exports for backward compatibility.
Actual implementations are in specialized modules:
- video_validator.py: Single video validation
- batch_validator.py: Bulk content validation
- cache.py: Caching functions
"""

# Re-export from batch_validator
from app.services.youtube_validator.batch_validator import \
    validate_youtube_content
# Re-export from cache
from app.services.youtube_validator.cache import (cache_youtube_result,
                                                  filter_cached_youtube,
                                                  get_cached_validation,
                                                  invalidate_cache)
# Re-export from video_validator
from app.services.youtube_validator.video_validator import (
    get_best_youtube_thumbnail, validate_youtube_video)

__all__ = [
    "validate_youtube_video",
    "get_best_youtube_thumbnail",
    "validate_youtube_content",
    "filter_cached_youtube",
    "cache_youtube_result",
    "get_cached_validation",
    "invalidate_cache",
]
