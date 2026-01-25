"""
Morning Ritual API Routes.
Handles morning routine experience for Israeli expats.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_active_user, get_optional_user
from app.models.user import User
from app.services.morning_ritual import (generate_ai_brief,
                                         get_default_ritual_preferences,
                                         get_israel_morning_context,
                                         get_morning_playlist,
                                         get_ritual_status,
                                         get_user_local_time, is_ritual_time)

router = APIRouter(prefix="/ritual", tags=["ritual"])


class RitualStatusResponse(BaseModel):
    is_ritual_time: bool
    ritual_enabled: bool
    local_time: str
    local_date: str
    israel_context: dict
    playlist: Optional[List[dict]] = None
    ai_brief: Optional[dict] = None


@router.get("/check")
async def check_ritual_time(
    current_user: User = Depends(get_current_active_user),
) -> RitualStatusResponse:
    """
    Check if it's morning ritual time for the user.
    Returns full ritual data if active.
    Used on app launch to determine if we should show ritual experience.
    """
    status = await get_ritual_status(current_user)
    return RitualStatusResponse(**status)


class PlaylistItem(BaseModel):
    id: str
    title: str
    type: str  # live, radio, vod
    stream_url: Optional[str] = None
    thumbnail: Optional[str] = None
    duration_hint: Optional[int] = None
    duration: Optional[int] = None
    category: str


@router.get("/content")
async def get_ritual_content(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Get morning ritual playlist content.
    Returns curated content for the morning experience.
    """
    if not current_user.preferences.get("morning_ritual_enabled", False):
        raise HTTPException(
            status_code=400,
            detail="Morning ritual is not enabled. Enable it in settings first.",
        )

    playlist = await get_morning_playlist(current_user)

    return {
        "playlist": playlist,
        "total_items": len(playlist),
        "estimated_duration": sum(
            item.get("duration_hint", item.get("duration", 300)) for item in playlist
        ),
    }


class AIBriefResponse(BaseModel):
    greeting: str
    israel_update: str
    recommendation: str
    mood: str
    israel_context: dict
    generated_at: str


@router.get("/ai-brief")
async def get_ai_morning_brief(
    current_user: User = Depends(get_current_active_user),
) -> AIBriefResponse:
    """
    Get AI-generated personalized morning brief.
    Claude creates a warm greeting with Israel context.
    """
    brief = await generate_ai_brief(current_user)
    return AIBriefResponse(**brief)


@router.get("/israel-now")
async def get_israel_context() -> dict:
    """
    Get current context about what's happening in Israel.
    Public endpoint - no auth required for basic info.
    """
    return get_israel_morning_context()


class RitualPreferencesUpdate(BaseModel):
    morning_ritual_enabled: Optional[bool] = None
    morning_ritual_start: Optional[int] = None  # Hour 0-23
    morning_ritual_end: Optional[int] = None  # Hour 0-23
    morning_ritual_content: Optional[List[str]] = None  # news, radio, clips, weather
    morning_ritual_auto_play: Optional[bool] = None
    morning_ritual_skip_weekends: Optional[bool] = None


@router.post("/preferences")
async def update_ritual_preferences(
    prefs: RitualPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Update morning ritual preferences.
    """
    # Validate time range
    if prefs.morning_ritual_start is not None:
        if not 0 <= prefs.morning_ritual_start <= 23:
            raise HTTPException(status_code=400, detail="Start hour must be 0-23")

    if prefs.morning_ritual_end is not None:
        if not 0 <= prefs.morning_ritual_end <= 23:
            raise HTTPException(status_code=400, detail="End hour must be 0-23")

    if prefs.morning_ritual_content is not None:
        valid_content = {"news", "radio", "clips", "weather", "podcasts"}
        invalid = set(prefs.morning_ritual_content) - valid_content
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content types: {invalid}. Valid: {valid_content}",
            )

    # Update preferences
    updates = prefs.model_dump(exclude_none=True)
    for key, value in updates.items():
        current_user.preferences[key] = value

    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {
        "message": "Ritual preferences updated",
        "preferences": {
            k: v
            for k, v in current_user.preferences.items()
            if k.startswith("morning_ritual")
        },
    }


@router.get("/preferences")
async def get_ritual_preferences(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Get current morning ritual preferences.
    """
    defaults = get_default_ritual_preferences()

    # Merge with user preferences
    prefs = {**defaults}
    for key in defaults.keys():
        if key in current_user.preferences:
            prefs[key] = current_user.preferences[key]

    return {
        "preferences": prefs,
        "local_timezone": current_user.preferences.get(
            "local_timezone", "America/New_York"
        ),
    }


@router.post("/skip-today")
async def skip_ritual_today(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Skip morning ritual for today.
    User can dismiss the ritual experience for the current day.
    """
    local_time = get_user_local_time(current_user)
    today = local_time.strftime("%Y-%m-%d")

    # Store skip date
    current_user.preferences["morning_ritual_skipped_date"] = today
    await current_user.save()

    return {"message": "Morning ritual skipped for today", "skipped_date": today}


@router.get("/should-show")
async def should_show_ritual(
    current_user: Optional[User] = Depends(get_optional_user),
) -> dict:
    """
    Quick check if morning ritual should be shown.
    Used for fast app launch decisions.
    Returns disabled state if user not authenticated.
    """
    # Return disabled if not authenticated
    if not current_user:
        return {"show_ritual": False, "reason": "not_authenticated"}

    if not current_user.preferences.get("morning_ritual_enabled", False):
        return {"show_ritual": False, "reason": "disabled"}

    # Check if skipped today
    local_time = get_user_local_time(current_user)
    today = local_time.strftime("%Y-%m-%d")
    skipped_date = current_user.preferences.get("morning_ritual_skipped_date")

    if skipped_date == today:
        return {"show_ritual": False, "reason": "skipped_today"}

    # Check if weekend and skip_weekends is enabled
    if current_user.preferences.get("morning_ritual_skip_weekends", False):
        if local_time.weekday() >= 5:  # Saturday or Sunday
            return {"show_ritual": False, "reason": "weekend"}

    # Check time window
    if not is_ritual_time(current_user):
        return {"show_ritual": False, "reason": "outside_time_window"}

    return {
        "show_ritual": True,
        "reason": "active",
        "auto_play": current_user.preferences.get("morning_ritual_auto_play", True),
    }
