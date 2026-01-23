"""
Admin REST API endpoints for live feature quota management
Allows admins to view, update, and manage user quotas
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.routes.admin.auth import has_permission, log_audit
from app.models.admin import AuditAction, Permission
from app.models.live_feature_quota import (FeatureType, LiveFeatureQuota,
                                             LiveFeatureUsageSession)
from app.models.user import User
from app.services.live_feature_quota_service import LiveFeatureQuotaService

router = APIRouter(prefix="/admin/live-quotas", tags=["Admin - Live Quotas"])
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
        quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)
        usage_stats = await LiveFeatureQuotaService.get_usage_stats(user_id)

        # Get target user info
        user = await User.get(user_id)

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "subscription_tier": user.subscription_tier,
            }
            if user
            else None,
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
        new_limits = {k: v for k, v in limits.model_dump().items() if v is not None and k != "notes"}

        if not new_limits and not limits.notes:
            raise HTTPException(status_code=400, detail="No limits provided to update")

        await LiveFeatureQuotaService.extend_user_limits(
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
        await LiveFeatureQuotaService.reset_user_quota(user_id)

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


@router.get("/usage-report")
async def get_usage_report(
    start_date: datetime = Query(..., description="Start date for report"),
    end_date: datetime = Query(..., description="End date for report"),
    feature_type: Optional[FeatureType] = Query(None, description="Filter by feature type"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    limit: int = Query(100, ge=1, le=1000, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """
    Get system-wide usage report for live features.

    Returns aggregated usage statistics for a date range.
    """
    try:
        # Build query
        query = LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.started_at >= start_date,
            LiveFeatureUsageSession.started_at <= end_date,
        )

        if feature_type:
            query = query.find(LiveFeatureUsageSession.feature_type == feature_type)

        if platform:
            query = query.find(LiveFeatureUsageSession.platform == platform)

        # Get total count
        total = await query.count()

        # Get sessions
        sessions = await query.sort([("started_at", -1)]).skip(offset).limit(limit).to_list()

        # Calculate aggregates
        total_minutes = sum(s.duration_seconds / 60.0 for s in sessions)
        total_cost = sum(s.estimated_total_cost for s in sessions)

        # Group by feature type
        subtitle_sessions = [s for s in sessions if s.feature_type == FeatureType.SUBTITLE]
        dubbing_sessions = [s for s in sessions if s.feature_type == FeatureType.DUBBING]

        return {
            "summary": {
                "total_sessions": total,
                "total_minutes": round(total_minutes, 2),
                "total_cost": round(total_cost, 4),
                "subtitle_sessions": len(subtitle_sessions),
                "subtitle_minutes": round(
                    sum(s.duration_seconds / 60.0 for s in subtitle_sessions), 2
                ),
                "dubbing_sessions": len(dubbing_sessions),
                "dubbing_minutes": round(
                    sum(s.duration_seconds / 60.0 for s in dubbing_sessions), 2
                ),
            },
            "sessions": [
                {
                    "session_id": s.session_id,
                    "user_id": s.user_id,
                    "channel_id": s.channel_id,
                    "feature_type": s.feature_type,
                    "started_at": s.started_at,
                    "ended_at": s.ended_at,
                    "duration_minutes": round(s.duration_seconds / 60.0, 2),
                    "status": s.status,
                    "source_language": s.source_language,
                    "target_language": s.target_language,
                    "platform": s.platform,
                    "estimated_cost": round(s.estimated_total_cost, 4),
                }
                for s in sessions
            ],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
            },
        }
    except Exception as e:
        logger.error(f"Error generating usage report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")


@router.get("/system-stats")
async def get_system_stats(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """
    Get system-wide statistics for live features.

    Returns current active sessions, total users, and aggregate usage.
    """
    try:
        from datetime import timedelta

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Use MongoDB aggregation for efficiency
        from app.models.live_feature_quota import UsageSessionStatus

        # Count total users with quotas
        total_users = await LiveFeatureQuota.count()

        # Count active sessions
        active_sessions = await LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.status == UsageSessionStatus.ACTIVE
        ).count()

        # Aggregate today's usage using MongoDB pipeline
        today_pipeline = [
            {"$match": {"started_at": {"$gte": today_start}}},
            {
                "$group": {
                    "_id": "$feature_type",
                    "total_minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
                    "total_cost": {"$sum": "$estimated_total_cost"},
                }
            },
        ]

        today_results = await LiveFeatureUsageSession.aggregate(today_pipeline).to_list()

        # Aggregate month's usage
        month_pipeline = [
            {"$match": {"started_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total_cost": {"$sum": "$estimated_total_cost"}}},
        ]

        month_results = await LiveFeatureUsageSession.aggregate(month_pipeline).to_list()

        # Process results
        subtitle_minutes_today = 0.0
        dubbing_minutes_today = 0.0
        cost_today = 0.0

        for result in today_results:
            if result["_id"] == FeatureType.SUBTITLE:
                subtitle_minutes_today = result["total_minutes"]
                cost_today += result["total_cost"]
            elif result["_id"] == FeatureType.DUBBING:
                dubbing_minutes_today = result["total_minutes"]
                cost_today += result["total_cost"]

        cost_month = month_results[0]["total_cost"] if month_results else 0.0

        return {
            "total_users_with_quotas": total_users,
            "active_sessions": active_sessions,
            "total_subtitle_minutes_today": round(subtitle_minutes_today, 2),
            "total_dubbing_minutes_today": round(dubbing_minutes_today, 2),
            "total_cost_today": round(cost_today, 4),
            "total_cost_month": round(cost_month, 4),
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system stats")


@router.get("/top-users")
async def get_top_users(
    feature_type: Optional[FeatureType] = Query(None, description="Filter by feature type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    limit: int = Query(20, ge=1, le=100, description="Number of top users to return"),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """
    Get top users by usage for a time period using MongoDB aggregation.
    """
    try:
        from datetime import timedelta

        start_date = datetime.utcnow() - timedelta(days=days)

        # Use MongoDB aggregation pipeline for efficiency
        match_stage = {"$match": {"started_at": {"$gte": start_date}}}

        if feature_type:
            match_stage["$match"]["feature_type"] = feature_type

        pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": "$user_id",
                    "total_sessions": {"$sum": 1},
                    "total_minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
                    "total_cost": {"$sum": "$estimated_total_cost"},
                    "subtitle_minutes": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$feature_type", FeatureType.SUBTITLE]},
                                {"$divide": ["$duration_seconds", 60]},
                                0,
                            ]
                        }
                    },
                    "dubbing_minutes": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$feature_type", FeatureType.DUBBING]},
                                {"$divide": ["$duration_seconds", 60]},
                                0,
                            ]
                        }
                    },
                }
            },
            {"$sort": {"total_minutes": -1}},
            {"$limit": limit},
        ]

        results = await LiveFeatureUsageSession.aggregate(pipeline).to_list()

        # Format results
        top_users = [
            {
                "user_id": r["_id"],
                "total_sessions": r["total_sessions"],
                "total_minutes": round(r["total_minutes"], 2),
                "total_cost": round(r["total_cost"], 4),
                "subtitle_minutes": round(r["subtitle_minutes"], 2),
                "dubbing_minutes": round(r["dubbing_minutes"], 2),
            }
            for r in results
        ]

        return {
            "period_days": days,
            "feature_type": feature_type.value if feature_type else "all",
            "top_users": top_users,
        }
    except Exception as e:
        logger.error(f"Error getting top users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top users")
