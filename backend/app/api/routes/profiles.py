from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel, Field
from app.models.user import User
from app.models.profile import Profile, ProfileCreate, ProfileUpdate, ProfileResponse
from app.core.security import get_current_active_user, get_password_hash, verify_password
from app.core.config import settings
from app.core.storage import storage


# Profile limits by subscription tier
PROFILE_LIMITS = {
    "basic": 1,
    "premium": 3,
    "family": 5,
}


class PinVerify(BaseModel):
    pin: str


class ProfileSelect(BaseModel):
    pin: Optional[str] = None


router = APIRouter()


@router.get("", response_model=List[ProfileResponse])
async def get_profiles(current_user: User = Depends(get_current_active_user)):
    """Get all profiles for the current user."""
    profiles = await Profile.find(Profile.user_id == str(current_user.id)).to_list()

    # If no profiles exist, create a default one
    if not profiles:
        default_profile = Profile(
            user_id=str(current_user.id),
            name=current_user.name,
            avatar_color="#00d9ff",
        )
        await default_profile.insert()
        profiles = [default_profile]

        # Set as active profile
        current_user.active_profile_id = str(default_profile.id)
        await current_user.save()

    return [p.to_response() for p in profiles]


@router.post("", response_model=ProfileResponse)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new profile."""
    # Check profile limit
    tier = current_user.subscription_tier or "basic"
    limit = PROFILE_LIMITS.get(tier, 1)
    existing_count = await Profile.find(Profile.user_id == str(current_user.id)).count()

    if existing_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile limit reached ({limit}). Upgrade subscription for more profiles.",
        )

    # Check for duplicate name
    existing_name = await Profile.find_one(
        Profile.user_id == str(current_user.id),
        Profile.name == profile_data.name,
    )
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A profile with this name already exists",
        )

    # Hash PIN if provided
    hashed_pin = None
    if profile_data.pin:
        hashed_pin = get_password_hash(profile_data.pin)

    profile = Profile(
        user_id=str(current_user.id),
        name=profile_data.name,
        avatar=profile_data.avatar,
        avatar_color=profile_data.avatar_color,
        is_kids_profile=profile_data.is_kids_profile,
        kids_age_limit=profile_data.kids_age_limit,
        pin=hashed_pin,
    )
    await profile.insert()

    return profile.to_response()


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific profile."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return profile.to_response()


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str,
    updates: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a profile."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Check for duplicate name if updating name
    if updates.name and updates.name != profile.name:
        existing_name = await Profile.find_one(
            Profile.user_id == str(current_user.id),
            Profile.name == updates.name,
        )
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A profile with this name already exists",
            )
        profile.name = updates.name

    if updates.avatar is not None:
        profile.avatar = updates.avatar
    if updates.avatar_color is not None:
        profile.avatar_color = updates.avatar_color
    if updates.is_kids_profile is not None:
        profile.is_kids_profile = updates.is_kids_profile
    if updates.kids_age_limit is not None:
        profile.kids_age_limit = updates.kids_age_limit
    if updates.pin is not None:
        profile.pin = get_password_hash(updates.pin) if updates.pin else None
    if updates.preferences is not None:
        profile.preferences.update(updates.preferences)

    await profile.save()
    return profile.to_response()


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a profile."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Cannot delete the last profile
    profile_count = await Profile.find(Profile.user_id == str(current_user.id)).count()
    if profile_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last profile",
        )

    # If deleting the active profile, switch to another
    if current_user.active_profile_id == profile_id:
        other_profile = await Profile.find_one(
            Profile.user_id == str(current_user.id),
            Profile.id != profile.id,
        )
        if other_profile:
            current_user.active_profile_id = str(other_profile.id)
            await current_user.save()

    await profile.delete()
    return {"message": "Profile deleted successfully"}


@router.post("/{profile_id}/select", response_model=ProfileResponse)
async def select_profile(
    profile_id: str,
    data: ProfileSelect,
    current_user: User = Depends(get_current_active_user),
):
    """Select a profile as active. Verify PIN if the profile has one."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Verify PIN if profile has one
    if profile.pin:
        if not data.pin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN required",
            )
        if not verify_password(data.pin, profile.pin):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect PIN",
            )

    # Update active profile and last used
    current_user.active_profile_id = profile_id
    await current_user.save()

    profile.last_used_at = datetime.utcnow()
    await profile.save()

    return profile.to_response()


@router.post("/{profile_id}/verify-pin")
async def verify_profile_pin(
    profile_id: str,
    data: PinVerify,
    current_user: User = Depends(get_current_active_user),
):
    """Verify a profile's PIN."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    if not profile.pin:
        return {"valid": True}

    is_valid = verify_password(data.pin, profile.pin)
    return {"valid": is_valid}


@router.get("/{profile_id}/recommendations")
async def get_profile_recommendations(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get AI-powered recommendations for a profile based on watch history."""
    profile = await Profile.get(profile_id)

    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    # Get watch history for this profile
    from app.models.watchlist import WatchHistory

    history = await WatchHistory.find(
        WatchHistory.user_id == str(current_user.id),
        WatchHistory.profile_id == profile_id,
    ).sort(-WatchHistory.last_watched_at).limit(50).to_list()

    # Build basic recommendations based on watched content types and categories
    # In a real implementation, this would use ML or Claude API
    recommendations = {
        "continue_watching": [],
        "because_you_watched": [],
        "trending_in_israel": [],
        "new_releases": [],
    }

    # Get incomplete content
    incomplete = [h for h in history if not h.completed and h.progress_percent < 90]
    for item in incomplete[:5]:
        recommendations["continue_watching"].append({
            "content_id": item.content_id,
            "content_type": item.content_type,
            "progress_percent": item.progress_percent,
        })

    return {
        "profile_id": profile_id,
        "taste_profile": profile.taste_profile,
        "recommendations": recommendations,
    }


@router.post("/kids-pin/set")
async def set_kids_pin(
    data: PinVerify,
    current_user: User = Depends(get_current_active_user),
):
    """Set or update the master kids PIN for the account."""
    current_user.kids_pin = get_password_hash(data.pin)
    await current_user.save()
    return {"message": "Kids PIN set successfully"}


@router.post("/kids-pin/verify")
async def verify_kids_pin(
    data: PinVerify,
    current_user: User = Depends(get_current_active_user),
):
    """Verify the master kids PIN to exit kids mode."""
    if not current_user.kids_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No kids PIN set",
        )

    is_valid = verify_password(data.pin, current_user.kids_pin)
    return {"valid": is_valid}


# Default settings for AI and voice preferences
DEFAULT_AI_SETTINGS = {
    "chatbot_enabled": True,
    "save_conversation_history": True,
    "personalized_recommendations": True,
    "data_collection_consent": False,
}

DEFAULT_VOICE_SETTINGS = {
    "voice_search_enabled": True,
    "voice_language": "he",
    "auto_subtitle": False,
    "high_contrast_mode": False,
    "text_size": "medium",
    "hold_button_mode": False,  # Fallback to press-and-hold remote button
    "silence_threshold_ms": 2000,  # Wait 2 seconds of silence before processing
    "vad_sensitivity": "low",  # Voice Activity Detection sensitivity: low, medium, high
    # Wake word activation (mutually exclusive with always-listening - we use wake word only)
    "wake_word_enabled": True,  # ENABLED by default - listen for "Buyit"
    "wake_word": "buyit",
    "wake_word_sensitivity": 0.7,  # 0-1 sensitivity
    "wake_word_cooldown_ms": 2000,
    # Three-mode system
    "voice_mode": "voice_only",  # voice_only, hybrid, classic
    "voice_feedback_enabled": True,
    # TTS settings
    "tts_enabled": True,
    "tts_voice_id": settings.ELEVENLABS_DEFAULT_VOICE_ID,  # From environment config
    "tts_speed": 1.0,  # 0.5-2.0
    "tts_volume": 1.0,  # 0-1
}


class AIPreferences(BaseModel):
    chatbot_enabled: bool = True
    save_conversation_history: bool = True
    personalized_recommendations: bool = True
    data_collection_consent: bool = False


class VoicePreferences(BaseModel):
    voice_search_enabled: bool = True
    voice_language: str = "he"  # he, en, es
    auto_subtitle: bool = False
    high_contrast_mode: bool = False
    text_size: str = "medium"  # small, medium, large
    hold_button_mode: bool = False  # Fallback to press-and-hold remote button
    silence_threshold_ms: int = 2000  # Wait N ms of silence before processing
    vad_sensitivity: str = "low"  # Voice Activity Detection sensitivity: low, medium, high
    # Wake word activation (mutually exclusive with always-listening - we use wake word only)
    wake_word_enabled: bool = True  # ENABLED by default - listen for "Buyit"
    wake_word: str = "buyit"
    wake_word_sensitivity: float = 0.7  # 0-1 sensitivity
    wake_word_cooldown_ms: int = 2000
    # Three-mode system
    voice_mode: str = "voice_only"  # voice_only, hybrid, classic
    voice_feedback_enabled: bool = True
    # TTS settings
    tts_enabled: bool = True
    tts_voice_id: str = Field(default_factory=lambda: settings.ELEVENLABS_DEFAULT_VOICE_ID)  # From environment config
    tts_speed: float = 1.0  # 0.5-2.0
    tts_volume: float = 1.0  # 0-1


@router.get("/preferences/ai")
async def get_ai_preferences(
    current_user: User = Depends(get_current_active_user),
):
    """Get AI preferences for current user."""
    ai_settings = current_user.preferences.get("ai_settings", DEFAULT_AI_SETTINGS.copy())
    return ai_settings


@router.put("/preferences/ai")
async def update_ai_preferences(
    preferences: AIPreferences,
    current_user: User = Depends(get_current_active_user),
):
    """Update AI preferences."""
    current_user.preferences["ai_settings"] = preferences.model_dump()
    current_user.updated_at = datetime.utcnow()
    await current_user.save()
    return {"message": "AI preferences updated", "preferences": current_user.preferences["ai_settings"]}


@router.get("/preferences/voice")
async def get_voice_preferences(
    current_user: User = Depends(get_current_active_user),
):
    """Get voice and accessibility preferences for current user."""
    # Get saved settings and merge with defaults (so new fields get default values)
    saved_settings = current_user.preferences.get("voice_settings", {})
    voice_settings = {**DEFAULT_VOICE_SETTINGS.copy(), **saved_settings}
    return voice_settings


@router.put("/preferences/voice")
async def update_voice_preferences(
    preferences: VoicePreferences,
    current_user: User = Depends(get_current_active_user),
):
    """Update voice and accessibility preferences."""
    current_user.preferences["voice_settings"] = preferences.model_dump()
    current_user.updated_at = datetime.utcnow()
    await current_user.save()
    return {"message": "Voice preferences updated", "preferences": current_user.preferences["voice_settings"]}


@router.post("/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a profile avatar image for the current user.

    Supported formats: JPEG, PNG, WebP, GIF
    Max file size: 5MB
    Returns the URL of the uploaded avatar.
    """
    try:
        # Upload via storage provider (uses 'avatars' folder)
        url = await storage.upload_image(file, "avatars")

        # Update user's avatar URL
        current_user.avatar = url
        current_user.updated_at = datetime.utcnow()
        await current_user.save()

        return {
            "url": url,
            "message": "Avatar uploaded successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )
