"""
Comprehension API Utility Functions.

Helper functions for comprehension endpoints.
"""

from fastapi import HTTPException

from app.core.config import settings


def check_comprehension_enabled():
    """Check if comprehension quiz feature is enabled."""
    if not settings.COMPREHENSION_QUIZ_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Comprehension quiz feature is currently disabled",
        )
