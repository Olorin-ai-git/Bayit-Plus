"""
User account management endpoints.
DELETE /account - Self-service account deletion (Apple Guideline 5.1.1).
"""

import logging

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_active_user
from app.models.profile import Profile
from app.models.user import User
from app.services.gdpr.user_data_deletion import delete_user_all_data

logger = logging.getLogger(__name__)
router = APIRouter()


@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_own_account(
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete the authenticated user's account and all associated data.
    Satisfies Apple App Store Guideline 5.1.1(v) - account deletion.
    """
    user_id = str(current_user.id)
    logger.info(
        "Account self-deletion requested",
        extra={"user_id": user_id, "email": current_user.email},
    )

    gdpr_summary = await delete_user_all_data(user_id)

    profiles_deleted = await Profile.find(
        Profile.user_id == user_id
    ).delete()
    logger.info(
        "Deleted user profiles",
        extra={"user_id": user_id, "profiles_deleted": profiles_deleted},
    )

    current_user.is_active = False
    current_user.email = f"deleted_{user_id}@deleted.bayit.tv"
    current_user.name = "Deleted User"
    current_user.avatar = None
    current_user.hashed_password = None
    current_user.google_id = None
    current_user.apple_id = None
    await current_user.save()

    logger.warning(
        "Account self-deletion completed",
        extra={
            "user_id": user_id,
            "gdpr_summary": gdpr_summary,
            "profiles_deleted": profiles_deleted,
        },
    )

    return {"message": "Account deleted successfully"}
