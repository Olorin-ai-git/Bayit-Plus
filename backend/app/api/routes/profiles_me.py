"""
Profile /me endpoints for the authenticated user's combined profile.
GET /me returns user + active profile data.
PUT /me updates account-level fields (displayName, phoneNumber).
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.core.security import get_current_active_user
from app.models.profile import Profile
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class MyProfileResponse(BaseModel):
    """Combined user + active profile response for /me endpoint."""
    id: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    avatar: Optional[str] = None
    language: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    preferences: Optional[dict] = None
    phoneNumber: Optional[str] = None
    phoneVerified: bool = False
    hasPassword: bool = False
    authProvider: str = "local"
    emailVerified: bool = False


class MyProfileUpdateRequest(BaseModel):
    displayName: Optional[str] = None
    phoneNumber: Optional[str] = None


async def _get_active_profile(current_user: User) -> Profile:
    """Resolve or auto-create the active profile for a user."""
    return await Profile.get_or_create_active_profile(current_user, logger)


def _build_response(profile: Profile, user: User) -> MyProfileResponse:
    """Build a MyProfileResponse from a profile and user."""
    return MyProfileResponse(
        id=str(profile.id),
        email=user.email,
        displayName=profile.name or user.name,
        avatar=profile.avatar or user.avatar,
        language=profile.preferences.get("language"),
        createdAt=user.created_at.isoformat() if user.created_at else None,
        updatedAt=user.updated_at.isoformat() if user.updated_at else None,
        preferences=profile.preferences,
        phoneNumber=user.phone_number,
        phoneVerified=user.phone_verified,
        hasPassword=user.hashed_password is not None,
        authProvider=user.auth_provider,
        emailVerified=user.email_verified,
    )


@router.get("/me", response_model=MyProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get the current user's active profile merged with user-level data."""
    logger.info(f"GET /me called for user {str(current_user.id)}")

    try:
        profile = await _get_active_profile(current_user)
        logger.info(f"Profile retrieved: {str(profile.id)}")

        response = _build_response(profile, current_user)
        logger.info(f"Response built successfully")

        return response
    except Exception as e:
        logger.error(f"Error in /me endpoint: {e}", exc_info=True)
        raise


@router.put("/me", response_model=MyProfileResponse)
async def update_my_profile(
    updates: MyProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Update the current user's account-level profile fields."""
    profile = await _get_active_profile(current_user)

    if updates.displayName is not None:
        profile.name = updates.displayName
        current_user.name = updates.displayName

    if updates.phoneNumber is not None and updates.phoneNumber != current_user.phone_number:
        current_user.phone_number = updates.phoneNumber
        current_user.phone_verified = False

    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    await profile.save()

    logger.info(
        "Profile /me updated",
        extra={"user_id": str(current_user.id)},
    )
    return _build_response(profile, current_user)
