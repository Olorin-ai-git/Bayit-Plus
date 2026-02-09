"""Profile preferences endpoints: AI, voice, home page, and avatar upload."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import get_current_active_user, get_optional_user
from app.core.storage import storage
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_AI_SETTINGS = {
    "chatbot_enabled": True, "save_conversation_history": True,
    "personalized_recommendations": True, "data_collection_consent": False,
}

DEFAULT_VOICE_SETTINGS = {
    "voice_search_enabled": True, "voice_language": "he", "auto_subtitle": False,
    "high_contrast_mode": False, "text_size": "medium", "hold_button_mode": False,
    "silence_threshold_ms": 2000, "vad_sensitivity": "low",
    "wake_word_enabled": True, "wake_word": "buyit",
    "wake_word_sensitivity": 0.7, "wake_word_cooldown_ms": 2000,
    "voice_mode": "voice_only", "voice_feedback_enabled": True,
    "tts_enabled": True, "tts_voice_id": settings.ELEVENLABS_DEFAULT_VOICE_ID,
    "tts_speed": 1.0, "tts_volume": 1.0,
}

DEFAULT_HOME_SECTIONS = [
    {"id": "continue_watching", "labelKey": "home.continueWatching", "visible": True, "order": 0, "icon": "play"},
    {"id": "live_tv", "labelKey": "home.liveTV", "visible": True, "order": 1, "icon": "live"},
    {"id": "trending", "labelKey": "home.trendingInIsrael", "visible": True, "order": 2, "icon": "flame"},
    {"id": "jerusalem", "labelKey": "home.jerusalemConnection", "visible": True, "order": 3, "icon": "judaism"},
    {"id": "tel_aviv", "labelKey": "home.telAvivConnection", "visible": True, "order": 4, "icon": "discover"},
    {"id": "featured", "labelKey": "home.featuredContent", "visible": True, "order": 5, "icon": "favorites"},
    {"id": "categories", "labelKey": "home.categories", "visible": True, "order": 6, "icon": "folder"},
]


class AIPreferences(BaseModel):
    chatbot_enabled: bool = True
    save_conversation_history: bool = True
    personalized_recommendations: bool = True
    data_collection_consent: bool = False


class VoicePreferences(BaseModel):
    voice_search_enabled: bool = True
    voice_language: str = "he"
    auto_subtitle: bool = False
    high_contrast_mode: bool = False
    text_size: str = "medium"
    hold_button_mode: bool = False
    silence_threshold_ms: int = 2000
    vad_sensitivity: str = "low"
    wake_word_enabled: bool = True
    wake_word: str = "buyit"
    wake_word_sensitivity: float = 0.7
    wake_word_cooldown_ms: int = 2000
    voice_mode: str = "voice_only"
    voice_feedback_enabled: bool = True
    tts_enabled: bool = True
    tts_voice_id: str = Field(default_factory=lambda: settings.ELEVENLABS_DEFAULT_VOICE_ID)
    tts_speed: float = 1.0
    tts_volume: float = 1.0


class HomeSectionConfig(BaseModel):
    id: str
    labelKey: str
    visible: bool = True
    order: int
    icon: str


class HomePagePreferences(BaseModel):
    sections: List[HomeSectionConfig]


@router.get("/preferences/ai")
async def get_ai_preferences(current_user: User = Depends(get_current_active_user)):
    """Get AI preferences for current user."""
    return current_user.preferences.get("ai_settings", DEFAULT_AI_SETTINGS.copy())


@router.put("/preferences/ai")
async def update_ai_preferences(
    preferences: AIPreferences, current_user: User = Depends(get_current_active_user),
):
    """Update AI preferences."""
    current_user.preferences["ai_settings"] = preferences.model_dump()
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    return {"message": "AI preferences updated", "preferences": current_user.preferences["ai_settings"]}


@router.get("/preferences/voice")
async def get_voice_preferences(current_user: Optional[User] = Depends(get_optional_user)):
    """Get voice and accessibility preferences for current user."""
    if not current_user:
        return DEFAULT_VOICE_SETTINGS.copy()
    saved_settings = current_user.preferences.get("voice_settings", {})
    return {**DEFAULT_VOICE_SETTINGS.copy(), **saved_settings}


@router.put("/preferences/voice")
async def update_voice_preferences(
    preferences: VoicePreferences, current_user: User = Depends(get_current_active_user),
):
    """Update voice and accessibility preferences."""
    current_user.preferences["voice_settings"] = preferences.model_dump()
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    return {"message": "Voice preferences updated", "preferences": current_user.preferences["voice_settings"]}


@router.get("/preferences/home_page")
async def get_home_page_preferences(current_user: User = Depends(get_current_active_user)):
    """Get home page section configuration preferences for current user."""
    saved_settings = current_user.preferences.get("home_page_settings", {})
    saved_sections = saved_settings.get("sections", [])
    saved_section_ids = {s.get("id") for s in saved_sections}
    merged_sections = list(saved_sections)
    for default_section in DEFAULT_HOME_SECTIONS:
        if default_section["id"] not in saved_section_ids:
            merged_sections.append({**default_section, "order": len(merged_sections)})
    return {"sections": merged_sections}


@router.put("/preferences/home_page")
async def update_home_page_preferences(
    preferences: HomePagePreferences, current_user: User = Depends(get_current_active_user),
):
    """Update home page section configuration preferences."""
    current_user.preferences["home_page_settings"] = preferences.model_dump()
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    return {"message": "Home page preferences updated", "preferences": current_user.preferences["home_page_settings"]}


@router.post("/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...), current_user: User = Depends(get_current_active_user),
):
    """Upload a profile avatar image. Supported: JPEG, PNG, WebP, GIF. Max 5MB."""
    try:
        url = await storage.upload_image(file, "avatars")
        current_user.avatar = url
        current_user.updated_at = datetime.now(timezone.utc)
        await current_user.save()
        logger.info("Avatar uploaded", extra={"user_id": str(current_user.id)})
        return {"url": url, "message": "Avatar uploaded successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Avatar upload failed", extra={"user_id": str(current_user.id), "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )
