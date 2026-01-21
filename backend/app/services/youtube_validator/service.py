"""
YouTube Validator Service

Re-exports for backward compatibility.
Actual implementations are in specialized modules:
- thumbnail_fixer.py: Thumbnail fixing functions
- poster_finder.py: Missing poster detection
"""

# Re-export from poster_finder
from app.services.youtube_validator.poster_finder import \
    find_youtube_content_missing_posters
# Re-export from thumbnail_fixer
from app.services.youtube_validator.thumbnail_fixer import (
    fix_youtube_thumbnails, thumbnail_needs_fix)

__all__ = [
    "fix_youtube_thumbnails",
    "thumbnail_needs_fix",
    "find_youtube_content_missing_posters",
]
