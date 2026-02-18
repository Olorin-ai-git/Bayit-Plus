"""User settings preference endpoints: playback, subtitles, audio, notifications, privacy, accessibility."""

import logging
from datetime import datetime, timezone
from typing import Type

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class PlaybackPreferences(BaseModel):
    video_quality: str = "auto"
    autoplay: bool = True
    autoplay_next_episode: bool = True
    autoplay_countdown_seconds: int = 5
    continue_watching: bool = True
    skip_intro: bool = False
    skip_credits: bool = False
    playback_speed: float = 1.0
    live_buffer_seconds: int = 30
    hardware_acceleration: bool = True


class SubtitlePreferences(BaseModel):
    enabled: bool = False
    language: str = "he"
    font_size: int = 18
    text_color: str = "#FFFFFF"
    background_color: str = "#000000"
    background_opacity: float = 0.6
    position: str = "bottom"
    font_style: str = "normal"
    ai_translation_enabled: bool = False
    ai_translation_language: str = "en"


class AudioPreferences(BaseModel):
    preferred_language: str = "he"
    quality: str = "auto"
    volume_normalization: bool = False
    prefer_dubbed: bool = False
    dubbing_language: str = "en"


class NotificationPreferences(BaseModel):
    push_enabled: bool = True
    new_content: bool = True
    live_tv: bool = True
    recommendations: bool = True
    promotions: bool = False
    credits_alerts: bool = True
    email_digest: bool = False
    email_digest_frequency: str = "weekly"
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


class PrivacyPreferences(BaseModel):
    analytics_enabled: bool = True
    crash_reports: bool = True
    personalization: bool = True
    watch_history_enabled: bool = True
    search_history_enabled: bool = True


class AccessibilityPreferences(BaseModel):
    large_text: bool = False
    bold_text: bool = False
    high_contrast: bool = False
    reduce_motion: bool = False
    audio_descriptions: bool = False
    closed_captions: bool = False
    color_blind_mode: str = "none"


_PREF_REGISTRY: dict[str, tuple[Type[BaseModel], str]] = {
    "playback": (PlaybackPreferences, "playback_settings"),
    "subtitles": (SubtitlePreferences, "subtitle_settings"),
    "audio": (AudioPreferences, "audio_settings"),
    "notifications": (NotificationPreferences, "notification_preferences"),
    "privacy": (PrivacyPreferences, "privacy_settings"),
    "accessibility": (AccessibilityPreferences, "accessibility_settings"),
}

_DEFAULTS: dict[str, dict] = {
    key: model_cls().model_dump() for key, (model_cls, _) in _PREF_REGISTRY.items()
}


def _get_merged(user: User, pref_key: str) -> dict:
    """Return defaults merged with saved preferences for a given key."""
    _, storage_key = _PREF_REGISTRY[pref_key]
    saved = user.preferences.get(storage_key, {})
    return {**_DEFAULTS[pref_key], **saved}


async def _update_prefs(user: User, pref_key: str, data: BaseModel) -> dict:
    """Save preferences and return the updated values."""
    _, storage_key = _PREF_REGISTRY[pref_key]
    user.preferences[storage_key] = data.model_dump()
    user.updated_at = datetime.now(timezone.utc)
    await user.save()
    logger.info("Updated %s preferences", pref_key, extra={"user_id": str(user.id)})
    return {"message": f"{pref_key.capitalize()} preferences updated", "preferences": user.preferences[storage_key]}


@router.get("/preferences/playback")
async def get_playback_preferences(current_user: User = Depends(get_current_active_user)):
    """Get playback preferences for current user."""
    return _get_merged(current_user, "playback")


@router.put("/preferences/playback")
async def update_playback_preferences(
    preferences: PlaybackPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update playback preferences."""
    return await _update_prefs(current_user, "playback", preferences)


@router.get("/preferences/subtitles")
async def get_subtitle_preferences(current_user: User = Depends(get_current_active_user)):
    """Get subtitle preferences for current user."""
    return _get_merged(current_user, "subtitles")


@router.put("/preferences/subtitles")
async def update_subtitle_preferences(
    preferences: SubtitlePreferences, current_user: User = Depends(get_current_active_user),
):
    """Update subtitle preferences."""
    return await _update_prefs(current_user, "subtitles", preferences)


@router.get("/preferences/audio")
async def get_audio_preferences(current_user: User = Depends(get_current_active_user)):
    """Get audio preferences for current user."""
    return _get_merged(current_user, "audio")


@router.put("/preferences/audio")
async def update_audio_preferences(
    preferences: AudioPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update audio preferences."""
    return await _update_prefs(current_user, "audio", preferences)


@router.get("/preferences/notifications")
async def get_notification_preferences(current_user: User = Depends(get_current_active_user)):
    """Get notification preferences for current user."""
    return _get_merged(current_user, "notifications")


@router.put("/preferences/notifications")
async def update_notification_preferences(
    preferences: NotificationPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update notification preferences."""
    return await _update_prefs(current_user, "notifications", preferences)


@router.get("/preferences/privacy")
async def get_privacy_preferences(current_user: User = Depends(get_current_active_user)):
    """Get privacy preferences for current user."""
    return _get_merged(current_user, "privacy")


@router.put("/preferences/privacy")
async def update_privacy_preferences(
    preferences: PrivacyPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update privacy preferences."""
    return await _update_prefs(current_user, "privacy", preferences)


@router.get("/preferences/accessibility")
async def get_accessibility_preferences(current_user: User = Depends(get_current_active_user)):
    """Get accessibility preferences for current user."""
    return _get_merged(current_user, "accessibility")


@router.put("/preferences/accessibility")
async def update_accessibility_preferences(
    preferences: AccessibilityPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update accessibility preferences."""
    return await _update_prefs(current_user, "accessibility", preferences)
