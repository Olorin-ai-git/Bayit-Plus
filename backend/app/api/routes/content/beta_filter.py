"""
Beta Content Filter Utility

Builds MongoDB query conditions for beta content filtering.
After backfill, all documents have is_beta_content field set.

Rules:
- Admin users: See all content (no filter)
- Beta users: See ONLY beta-tagged content
- Non-beta / anonymous users: See ONLY non-beta content
"""

from typing import Optional

from app.models.user import User


def build_beta_content_filter(user: Optional[User]) -> dict:
    """Return MongoDB $match condition for beta content filtering.

    After backfill, all documents have is_beta_content field set,
    so we use simple equality (no $or/$exists needed).

    Args:
        user: The current user, or None for anonymous access.

    Returns:
        A dict to inject into MongoDB queries. Empty dict for admins.
    """
    if user and user.is_admin_user():
        return {}
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
