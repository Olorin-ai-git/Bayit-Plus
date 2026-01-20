"""
Public User API Routes

Non-admin user-facing endpoints for:
- Searching users by name (for game invites, etc.)
- User profile lookup (limited public info)
"""

from typing import List, Optional

from app.core.security import get_current_active_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================


class PublicUserInfo(BaseModel):
    """Minimal public user info for search results and invites."""

    id: str
    name: str
    avatar: Optional[str] = None


class UserSearchResponse(BaseModel):
    """Response for user search."""

    users: List[PublicUserInfo]
    total: int
    query: str


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/search", response_model=UserSearchResponse)
async def search_users(
    name: str = Query(
        ..., min_length=2, max_length=100, description="Name to search for"
    ),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Search for users by name.

    Used for:
    - Finding friends to invite to games
    - Watch party invites
    - Social features

    Returns minimal public information (id, name, avatar).
    Requires authentication to prevent abuse.
    """
    # Fuzzy search by name (case insensitive)
    users = (
        await User.find(
            {
                "is_active": True,
                "name": {"$regex": name, "$options": "i"},
            }
        )
        .limit(limit)
        .to_list()
    )

    # Exclude current user from results
    users = [u for u in users if str(u.id) != str(current_user.id)]

    # Convert to public info format
    public_users = [
        PublicUserInfo(
            id=str(u.id),
            name=u.name,
            avatar=u.avatar if hasattr(u, "avatar") else None,
        )
        for u in users
    ]

    return UserSearchResponse(
        users=public_users,
        total=len(public_users),
        query=name,
    )


@router.get("/{user_id}", response_model=PublicUserInfo)
async def get_user_public_info(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get public information about a specific user.

    Returns minimal public information (id, name, avatar).
    Requires authentication.
    """
    user = await User.get(user_id)

    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    return PublicUserInfo(
        id=str(user.id),
        name=user.name,
        avatar=user.avatar if hasattr(user, "avatar") else None,
    )


class UpdatePreferencesRequest(BaseModel):
    """Request model for updating user preferences."""

    auto_translate_enabled: Optional[bool] = None
    # Add other preference fields as needed


@router.get("/me/preferences")
async def get_my_preferences(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user's preferences.
    """
    return {
        "preferences": current_user.preferences,
        "preferred_language": current_user.preferred_language,
    }


@router.patch("/me/preferences")
async def update_my_preferences(
    request: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update current user's preferences.

    Allows updating individual preference fields without overwriting others.
    """
    if request.auto_translate_enabled is not None:
        current_user.preferences[
            "auto_translate_enabled"
        ] = request.auto_translate_enabled

    await current_user.save()

    return {
        "success": True,
        "preferences": current_user.preferences,
    }
