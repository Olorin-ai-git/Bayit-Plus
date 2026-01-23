"""
Trivia Preferences API Routes.
User preferences for trivia display settings.
"""

from fastapi import APIRouter, Depends, Request

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_active_user
from app.models.trivia import TriviaPreferencesRequest
from app.models.user import User

router = APIRouter()


@router.get("/preferences/me")
@limiter.limit(RATE_LIMITS.get("trivia_preferences", "10/minute"))
async def get_trivia_preferences(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Get current user's trivia preferences."""
    preferences = current_user.preferences or {}
    trivia_prefs = preferences.get("trivia", {})

    return {
        "enabled": trivia_prefs.get("enabled", True),
        "frequency": trivia_prefs.get("frequency", "normal"),
        "categories": trivia_prefs.get(
            "categories", ["cast", "production", "cultural"]
        ),
        "auto_dismiss": trivia_prefs.get("auto_dismiss", True),
        "display_duration": trivia_prefs.get(
            "display_duration", settings.TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS
        ),
    }


@router.put("/preferences/me")
@limiter.limit(RATE_LIMITS.get("trivia_preferences", "10/minute"))
async def update_trivia_preferences(
    request: Request,
    prefs: TriviaPreferencesRequest,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Update current user's trivia preferences."""
    if current_user.preferences is None:
        current_user.preferences = {}

    current_user.preferences["trivia"] = {
        "enabled": prefs.enabled,
        "frequency": prefs.frequency,
        "categories": prefs.categories,
        "display_duration": prefs.display_duration,
    }

    await current_user.save()

    return {
        "message": "Trivia preferences updated",
        "preferences": current_user.preferences["trivia"],
    }
