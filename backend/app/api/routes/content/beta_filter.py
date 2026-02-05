"""
Beta Content Filter Utility

Builds MongoDB query conditions for beta content filtering.
After backfill, all documents have is_beta_content field set.

Rules:
- Admin users: See only movies and series (no audiobooks/podcasts/clips)
- Beta users: See ONLY beta-tagged content (all types)
- Non-beta / anonymous users: See only non-beta movies and series
"""

from typing import Optional

from app.models.user import User


# Filter to include only movies and series (excludes audiobooks, podcasts, clips, articles)
MOVIES_SERIES_FILTER = {
    "$or": [
        {"content_format": {"$in": ["movie", "series", None]}},
        {"content_format": {"$exists": False}},
        # Use category_name instead of deprecated is_series field
        {"category_name": {"$regex": "movie|series|סרט|סדר", "$options": "i"}},
    ]
}


def build_beta_content_filter(user: Optional[User]) -> dict:
    """Return MongoDB $match condition for beta content and content type filtering.

    After backfill, all documents have is_beta_content field set,
    so we use simple equality (no $or/$exists needed).

    Args:
        user: The current user, or None for anonymous access.

    Returns:
        A dict to inject into MongoDB queries.
        - Admin: Movies and series only
        - Beta user: Beta content only (all types)
        - Non-beta/anonymous: Non-beta movies and series only
    """
    if user and user.is_admin_user():
        # Admin sees only movies and series in featured
        return MOVIES_SERIES_FILTER
    if user and getattr(user, "is_beta_user", False):
        # Beta users see only beta content (all types)
        return {"is_beta_content": True}
    # Non-beta users: non-beta content AND movies/series only
    return {
        "$and": [
            {"is_beta_content": False},
            MOVIES_SERIES_FILTER,
        ]
    }


def build_spotlight_filter(user: Optional[User]) -> dict:
    """Return MongoDB $match condition for hero carousel spotlight content.

    Spotlight allows all content types (movies, series, podcasts, audiobooks, radio)
    with beta filtering but no content type restrictions.

    Args:
        user: The current user, or None for anonymous access.

    Returns:
        A dict to inject into MongoDB queries.
        - Admin: Movies and series only
        - Beta user: Beta content only (all types: movies, series, podcasts, audiobooks, radio)
        - Non-beta/anonymous: Non-beta content (all types: movies, series, podcasts, audiobooks, radio)
    """
    if user and user.is_admin_user():
        # Admin still sees only movies and series in spotlight
        return MOVIES_SERIES_FILTER
    if user and getattr(user, "is_beta_user", False):
        # Beta users see all beta content types
        return {"is_beta_content": True}
    # Regular users: all non-beta content types
    return {"is_beta_content": False}


def build_beta_only_filter(user: Optional[User]) -> dict:
    """Return MongoDB $match condition for beta content filtering ONLY.

    Use this for podcasts and audiobooks sections where we don't want
    to apply the movies/series content type filter.

    Args:
        user: The current user, or None for anonymous access.

    Returns:
        A dict to inject into MongoDB queries.
        - Admin: No filter (sees all)
        - Beta user: Beta content only
        - Non-beta/anonymous: Non-beta content only
    """
    if user and user.is_admin_user():
        return {}  # Admin sees all podcasts/audiobooks
    if user and getattr(user, "is_beta_user", False):
        return {"is_beta_content": True}
    return {"is_beta_content": False}


def check_beta_access(user: Optional[User], is_beta_content: bool) -> bool:
    """Check if a user can access a specific content item based on beta status.

    Used for single-item fetches (detail endpoints) after loading from DB.

    Args:
        user: The current user, or None for anonymous access.
        is_beta_content: Whether the content item is beta-tagged.

    Returns:
        True if access is allowed, False otherwise.
    """
    if user and user.is_admin_user():
        return True
    if user and getattr(user, "is_beta_user", False):
        return is_beta_content
    return not is_beta_content
