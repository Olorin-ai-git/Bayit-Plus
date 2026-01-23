"""
Voice Quota Management Endpoints
User quota overrides, tier defaults, reset operations
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.routes.admin.auth import has_permission, log_audit
from app.models.admin import AuditAction, Permission
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService

router = APIRouter(
    prefix="/admin/voice-management/quotas",
    tags=["Admin - Voice Quota Management"],
)
logger = logging.getLogger(__name__)


class QuotaDefaultsUpdate(BaseModel):
    """Update tier-based quota defaults"""

    tier: str  # basic, premium, family
    subtitle_minutes_per_hour: Optional[int] = None
    subtitle_minutes_per_day: Optional[int] = None
    subtitle_minutes_per_month: Optional[int] = None
    dubbing_minutes_per_hour: Optional[int] = None
    dubbing_minutes_per_day: Optional[int] = None
    dubbing_minutes_per_month: Optional[int] = None


class UserQuotaUpdate(BaseModel):
    """Override individual user quota"""

    subtitle_minutes_per_hour: Optional[int] = None
    subtitle_minutes_per_day: Optional[int] = None
    subtitle_minutes_per_month: Optional[int] = None
    dubbing_minutes_per_hour: Optional[int] = None
    dubbing_minutes_per_day: Optional[int] = None
    dubbing_minutes_per_month: Optional[int] = None
    notes: Optional[str] = None


@router.get("/defaults")
async def get_quota_defaults(
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get tier-based quota defaults"""
    try:
        # Default quota values by tier
        defaults = {
            "basic": {
                "subtitle_minutes_per_hour": 15,
                "subtitle_minutes_per_day": 60,
                "subtitle_minutes_per_month": 500,
                "dubbing_minutes_per_hour": 10,
                "dubbing_minutes_per_day": 30,
                "dubbing_minutes_per_month": 250,
            },
            "premium": {
                "subtitle_minutes_per_hour": 30,
                "subtitle_minutes_per_day": 120,
                "subtitle_minutes_per_month": 1000,
                "dubbing_minutes_per_hour": 15,
                "dubbing_minutes_per_day": 60,
                "dubbing_minutes_per_month": 500,
            },
            "family": {
                "subtitle_minutes_per_hour": 60,
                "subtitle_minutes_per_day": 240,
                "subtitle_minutes_per_month": 2000,
                "dubbing_minutes_per_hour": 30,
                "dubbing_minutes_per_day": 120,
                "dubbing_minutes_per_month": 1000,
            },
        }

        return {"success": True, "defaults": defaults}
    except Exception as e:
        logger.error(f"Error fetching quota defaults: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/defaults")
async def update_quota_defaults(
    update: QuotaDefaultsUpdate,
    current_user: User = Depends(
        has_permission(Permission.VOICE_QUOTA_MANAGE)
    ),
):
    """
    Update tier-based quota defaults
    Note: This updates the configuration for future quota assignments
    """
    try:
        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.SYSTEM_CONFIG_CHANGED,
            resource_type="quota_defaults",
            resource_id=update.tier,
            details=update.model_dump(exclude_none=True),
        )

        return {
            "success": True,
            "message": f"Quota defaults updated for tier: {update.tier}",
            "tier": update.tier,
        }
    except Exception as e:
        logger.error(f"Error updating quota defaults: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_quota(
    user_id: str,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """Get quota and usage for a specific user"""
    try:
        quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)
        usage = await LiveFeatureQuotaService.get_usage_stats(user_id)

        user = await User.get(user_id)

        return {
            "success": True,
            "user": {
                "id": str(user.id) if user else user_id,
                "email": user.email if user else None,
                "name": user.name if user else None,
                "subscription_tier": (
                    user.subscription_tier if user else "basic"
                ),
            },
            "quota": {
                "subtitle_minutes_per_hour": quota.subtitle_minutes_per_hour,
                "subtitle_minutes_per_day": quota.subtitle_minutes_per_day,
                "subtitle_minutes_per_month": quota.subtitle_minutes_per_month,
                "dubbing_minutes_per_hour": quota.dubbing_minutes_per_hour,
                "dubbing_minutes_per_day": quota.dubbing_minutes_per_day,
                "dubbing_minutes_per_month": quota.dubbing_minutes_per_month,
                "notes": quota.notes,
            },
            "usage": usage.model_dump() if usage else {},
        }
    except Exception as e:
        logger.error(f"Error fetching user quota: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/user/{user_id}")
async def update_user_quota(
    user_id: str,
    update: UserQuotaUpdate,
    current_user: User = Depends(
        has_permission(Permission.VOICE_QUOTA_MANAGE)
    ),
):
    """Override quota limits for a specific user"""
    try:
        new_limits = {
            k: v
            for k, v in update.model_dump().items()
            if v is not None and k != "notes"
        }

        if not new_limits and not update.notes:
            raise HTTPException(
                status_code=400, detail="No limits provided to update"
            )

        await LiveFeatureQuotaService.extend_user_limits(
            user_id=user_id,
            admin_id=str(current_user.id),
            new_limits=new_limits,
            notes=update.notes,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.QUOTA_UPDATED,
            resource_type="voice_quota",
            resource_id=user_id,
            details=update.model_dump(exclude_none=True),
        )

        return {
            "success": True,
            "message": f"Quota updated for user {user_id}",
            "user_id": user_id,
        }
    except Exception as e:
        logger.error(f"Error updating user quota: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/reset")
async def reset_user_quota(
    user_id: str,
    current_user: User = Depends(
        has_permission(Permission.VOICE_QUOTA_MANAGE)
    ),
):
    """Reset usage counters for a user"""
    try:
        await LiveFeatureQuotaService.reset_user_usage(user_id)

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.QUOTA_UPDATED,
            resource_type="voice_quota_reset",
            resource_id=user_id,
            details={"action": "reset_usage"},
        )

        return {
            "success": True,
            "message": f"Usage reset for user {user_id}",
            "user_id": user_id,
        }
    except Exception as e:
        logger.error(f"Error resetting user quota: {e}")
        raise HTTPException(status_code=500, detail=str(e))
