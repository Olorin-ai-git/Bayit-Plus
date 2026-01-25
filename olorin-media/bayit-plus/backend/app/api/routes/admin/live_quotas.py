"""
Admin REST API endpoints for live feature quota management
User quota CRUD operations: get, update, reset
Analytics endpoints moved to live_quota_analytics.py
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.routes.admin.auth import has_permission, log_audit
from app.models.admin import AuditAction, Permission
from app.models.user import User
from app.services.live_feature_quota_service import live_feature_quota_service

router = APIRouter(prefix="/live-quotas", tags=["Admin - Live Quota Management"])
logger = logging.getLogger(__name__)


class QuotaLimitsUpdate(BaseModel):
    """Model for updating quota limits"""

    subtitle_minutes_per_hour: Optional[int] = None
    subtitle_minutes_per_day: Optional[int] = None
    subtitle_minutes_per_month: Optional[int] = None
    dubbing_minutes_per_hour: Optional[int] = None
    dubbing_minutes_per_day: Optional[int] = None
    dubbing_minutes_per_month: Optional[int] = None
    notes: Optional[str] = None


@router.get("/users/{user_id}")
async def get_user_quota(
    user_id: str,
    current_user: User = Depends(has_permission(Permission.USERS_READ)),
):
    """Get quota settings and usage stats for a specific user"""
    try:
        quota = await live_feature_quota_service.get_or_create_quota(user_id)
        usage_stats = await live_feature_quota_service.get_usage_stats(user_id)

        # Get target user info
        user = await User.get(user_id)

        return {
            "user": (
                {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "subscription_tier": user.subscription_tier,
                }
                if user
                else None
            ),
            "quota": {
                "subtitle_minutes_per_hour": quota.subtitle_minutes_per_hour,
                "subtitle_minutes_per_day": quota.subtitle_minutes_per_day,
                "subtitle_minutes_per_month": quota.subtitle_minutes_per_month,
                "dubbing_minutes_per_hour": quota.dubbing_minutes_per_hour,
                "dubbing_minutes_per_day": quota.dubbing_minutes_per_day,
                "dubbing_minutes_per_month": quota.dubbing_minutes_per_month,
                "max_rollover_multiplier": quota.max_rollover_multiplier,
                "warning_threshold_percentage": quota.warning_threshold_percentage,
                "notes": quota.notes,
                "limit_extended_by": quota.limit_extended_by,
                "limit_extended_at": quota.limit_extended_at,
            },
            "usage": usage_stats,
        }
    except Exception as e:
        logger.error(f"Error fetching quota for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quota")


@router.patch("/users/{user_id}")
async def update_user_limits(
    user_id: str,
    limits: QuotaLimitsUpdate,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE)),
):
    """Admin updates user's quota limits"""
    try:
        # Build dict of non-None values
        new_limits = {
            k: v
            for k, v in limits.model_dump().items()
            if v is not None and k != "notes"
        }

        if not new_limits and not limits.notes:
            raise HTTPException(status_code=400, detail="No limits provided to update")

        await live_feature_quota_service.extend_user_limits(
            user_id=user_id,
            admin_id=str(current_user.id),
            new_limits=new_limits,
            notes=limits.notes,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.QUOTA_UPDATED,
            resource_type="live_quota",
            resource_id=user_id,
            details={"new_limits": new_limits, "notes": limits.notes},
        )

        return {"success": True, "message": "Quota limits updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quota for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update quota")


@router.post("/users/{user_id}/reset")
async def reset_user_quota(
    user_id: str,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE)),
):
    """Reset user's quota usage counters"""
    try:
        await live_feature_quota_service.reset_user_quota(user_id)

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.QUOTA_RESET,
            resource_type="live_quota",
            resource_id=user_id,
        )

        return {"success": True, "message": "Quota usage reset"}
    except Exception as e:
        logger.error(f"Error resetting quota for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset quota")
