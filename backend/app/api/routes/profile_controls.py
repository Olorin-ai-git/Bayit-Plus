"""
Profile Controls API Routes

Endpoints for managing per-profile family controls.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.user import User
from app.models.profile import Profile, ProfileResponse
from app.models.family_controls_schemas import FamilyControlsResponse
from app.services.profile_controls_service import profile_controls_service

router = APIRouter(prefix="/profile-controls", tags=["profile-controls"])


async def verify_profile_ownership(profile_id: str, current_user: User) -> Profile:
    """
    Verify that the current user owns the specified profile.

    Args:
        profile_id: Profile ID to verify
        current_user: Current authenticated user

    Returns:
        Profile instance if ownership verified

    Raises:
        HTTPException: 404 if profile not found, 403 if access denied
    """
    profile = await Profile.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.user_id != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You do not own this profile",
        )

    return profile


class SetCustomControlsRequest(BaseModel):
    """Request to set custom controls for a profile."""

    controls_id: str


class ControlsSourceResponse(BaseModel):
    """Response with controls source information."""

    source: str  # "household" | "custom" | "none"
    controls_id: str | None
    inherit_household_controls: bool


@router.get("/{profile_id}", response_model=FamilyControlsResponse | None)
async def get_profile_controls(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get effective family controls for a profile.

    Returns household controls if profile inherits,
    custom controls if profile has overrides,
    or None if no controls apply.

    Security: Verifies profile ownership before returning controls.
    """
    await verify_profile_ownership(profile_id, current_user)

    try:
        controls = await profile_controls_service.get_effective_controls(
            profile_id
        )

        if not controls:
            return None

        return FamilyControlsResponse(
            id=str(controls.id),
            user_id=controls.user_id,
            kids_enabled=controls.kids_enabled,
            kids_age_limit=controls.kids_age_limit,
            youngsters_enabled=controls.youngsters_enabled,
            youngsters_age_limit=controls.youngsters_age_limit,
            max_content_rating=controls.max_content_rating,
            viewing_hours_enabled=controls.viewing_hours_enabled,
            viewing_start_hour=controls.viewing_start_hour,
            viewing_end_hour=controls.viewing_end_hour,
            has_family_pin=controls.family_pin_hash is not None,
            created_at=controls.created_at,
            updated_at=controls.updated_at,
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get controls: {e}")


@router.post("/{profile_id}/set-custom", response_model=ProfileResponse)
async def set_custom_controls(
    profile_id: str,
    data: SetCustomControlsRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Set custom family controls for a profile.

    Disables household inheritance and uses specified controls.

    Security: Verifies profile ownership before modification.
    """
    await verify_profile_ownership(profile_id, current_user)

    try:
        profile = await profile_controls_service.set_custom_controls(
            profile_id, data.controls_id
        )
        return profile.to_response()

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to set custom controls: {e}"
        )


@router.post("/{profile_id}/inherit-household", response_model=ProfileResponse)
async def inherit_household_controls(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Configure profile to inherit household controls.

    Clears custom controls and enables household inheritance.

    Security: Verifies profile ownership before modification.
    """
    await verify_profile_ownership(profile_id, current_user)

    try:
        profile = await profile_controls_service.inherit_household_controls(
            profile_id
        )
        return profile.to_response()

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to enable household inheritance: {e}",
        )


@router.get("/{profile_id}/source", response_model=ControlsSourceResponse)
async def get_controls_source(
    profile_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get information about which controls source is active for a profile.

    Returns:
    - source: "household", "custom", or "none"
    - controls_id: ID of active controls (if any)
    - inherit_household_controls: Whether profile inherits from household

    Security: Verifies profile ownership before returning source information.
    """
    await verify_profile_ownership(profile_id, current_user)

    try:
        source_info = await profile_controls_service.get_controls_source(
            profile_id
        )
        return ControlsSourceResponse(**source_info)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get controls source: {e}"
        )
