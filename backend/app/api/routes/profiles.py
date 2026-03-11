"""Profile CRUD endpoints: list, create, get, update, delete, select, PIN, kids PIN."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_active_user, get_password_hash, verify_password
from app.models.profile import Profile, ProfileCreate, ProfileResponse, ProfileUpdate
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

PROFILE_LIMITS = {"free": 1, "plus": 0}  # 0 = unlimited


class PinVerify(BaseModel):
    pin: str


class ProfileSelect(BaseModel):
    pin: Optional[str] = None


@router.get("", response_model=List[ProfileResponse])
async def get_profiles(current_user: User = Depends(get_current_active_user)):
    """Get all profiles for the current user."""
    profiles = await Profile.find({"user_id": str(current_user.id)}).to_list()
    if not profiles:
        default_profile = await Profile.get_or_create_active_profile(current_user, logger)
        profiles = [default_profile]
    return [p.to_response() for p in profiles]


@router.post("", response_model=ProfileResponse)
async def create_profile(
    profile_data: ProfileCreate, current_user: User = Depends(get_current_active_user),
):
    """Create a new profile."""
    tier = current_user.subscription_tier or "free"
    limit = PROFILE_LIMITS.get(tier, 1)
    if limit > 0:
        existing_count = await Profile.find({"user_id": str(current_user.id)}).count()
        if existing_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile limit reached. Upgrade to Plus for unlimited profiles.",
            )
    existing_name = await Profile.find_one(
        {"user_id": str(current_user.id), "name": profile_data.name}
)
    if existing_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A profile with this name already exists")
    hashed_pin = get_password_hash(profile_data.pin) if profile_data.pin else None
    profile = Profile(
        user_id=str(current_user.id), name=profile_data.name, avatar=profile_data.avatar,
        avatar_color=profile_data.avatar_color, is_kids_profile=profile_data.is_kids_profile,
        kids_age_limit=profile_data.kids_age_limit, pin=hashed_pin,
    )
    await profile.insert()
    return profile.to_response()


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: str, current_user: User = Depends(get_current_active_user)):
    """Get a specific profile."""
    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile.to_response()


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str, updates: ProfileUpdate, current_user: User = Depends(get_current_active_user),
):
    """Update a profile."""
    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if updates.name and updates.name != profile.name:
        existing_name = await Profile.find_one(
            {"user_id": str(current_user.id), "name": updates.name}
)
        if existing_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A profile with this name already exists")
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
async def delete_profile(profile_id: str, current_user: User = Depends(get_current_active_user)):
    """Delete a profile."""
    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    profile_count = await Profile.find({"user_id": str(current_user.id)}).count()
    if profile_count <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the last profile")
    if current_user.active_profile_id == profile_id:
        other_profile = await Profile.find_one(
            {"user_id": str(current_user.id)},  Profile.id != profile.id, 
        )
        if other_profile:
            current_user.active_profile_id = str(other_profile.id)
            await current_user.save()
    await profile.delete()
    return {"message": "Profile deleted successfully"}


@router.post("/{profile_id}/select", response_model=ProfileResponse)
async def select_profile(
    profile_id: str, data: ProfileSelect, current_user: User = Depends(get_current_active_user),
):
    """Select a profile as active. Verify PIN if required."""
    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if profile.pin:
        if not data.pin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN required")
        if not verify_password(data.pin, profile.pin):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect PIN")
    current_user.active_profile_id = profile_id
    await current_user.save()
    profile.last_used_at = datetime.now(timezone.utc)
    await profile.save()
    return profile.to_response()


@router.post("/{profile_id}/verify-pin")
async def verify_profile_pin(
    profile_id: str, data: PinVerify, current_user: User = Depends(get_current_active_user),
):
    """Verify a profile's PIN."""
    profile = await Profile.get(profile_id)
    if not profile or profile.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if not profile.pin:
        return {"valid": True}
    return {"valid": verify_password(data.pin, profile.pin)}


@router.post("/kids-pin/set")
async def set_kids_pin(data: PinVerify, current_user: User = Depends(get_current_active_user)):
    """Set or update the master kids PIN for the account."""
    current_user.kids_pin = get_password_hash(data.pin)
    await current_user.save()
    return {"message": "Kids PIN set successfully"}


@router.post("/kids-pin/verify")
async def verify_kids_pin(data: PinVerify, current_user: User = Depends(get_current_active_user)):
    """Verify the master kids PIN to exit kids mode."""
    if not current_user.kids_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No kids PIN set")
    return {"valid": verify_password(data.pin, current_user.kids_pin)}
