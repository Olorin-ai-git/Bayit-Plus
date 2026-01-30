"""
Admin REST API endpoints for live feature quota analytics
System-wide usage reports, statistics, and top users analysis
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.admin.auth import has_permission
from app.models.admin import Permission
from app.models.live_feature_quota import (FeatureType, LiveFeatureQuota,
                                           LiveFeatureUsageSession,
                                           UsageSessionStatus)
from app.models.user import User

router = APIRouter(prefix="/live-quotas", tags=["Admin - Live Quota Analytics"])
logger = logging.getLogger(__name__)


@router.get("/usage-report")
async def get_usage_report(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    feature_type: Optional[FeatureType] = Query(None),
    platform: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get system-wide usage report with aggregated statistics."""
    try:
        query = LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.started_at >= start_date,
            LiveFeatureUsageSession.started_at <= end_date,
        )
        if feature_type:
            query = query.find(LiveFeatureUsageSession.feature_type == feature_type)
        if platform:
            query = query.find(LiveFeatureUsageSession.platform == platform)
        total = await query.count()
        sessions = (
            await query.sort([("started_at", -1)]).skip(offset).limit(limit).to_list()
        )
        total_minutes = sum(s.duration_seconds / 60.0 for s in sessions)
        total_cost = sum(s.estimated_total_cost for s in sessions)
        subtitle_sessions = [
            s for s in sessions if s.feature_type == FeatureType.SUBTITLE
        ]
        dubbing_sessions = [
            s for s in sessions if s.feature_type == FeatureType.DUBBING
        ]
        return {
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
            "pagination": {"total": total, "limit": limit, "offset": offset},
        }
    except Exception as e:
        logger.error(f"Error generating usage report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")


@router.get("/system-stats")
async def get_system_stats(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get system-wide statistics: active sessions, total users, aggregate usage."""
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_users = await LiveFeatureQuota.count()
        active_sessions = await LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.status == UsageSessionStatus.ACTIVE
        ).count()
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
        today_results = await LiveFeatureUsageSession.aggregate(
            today_pipeline
        ).to_list()
        month_pipeline = [
            {"$match": {"started_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total_cost": {"$sum": "$estimated_total_cost"}}},
        ]
        month_results = await LiveFeatureUsageSession.aggregate(
            month_pipeline
        ).to_list()
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
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    feature_type: Optional[FeatureType] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get top users by usage for a time period using MongoDB aggregation."""
    try:
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        if not end_date:
            end_date = datetime.now(timezone.utc)
        match_stage = {"$match": {"started_at": {"$gte": start_date, "$lte": end_date}}}
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

        # Enrich with user details
        top_users = []
        for r in results:
            user = await User.get(r["_id"])
            top_users.append({
                "user_id": r["_id"],
                "user_name": user.name if user else "Unknown User",
                "user_email": user.email if user else "unknown@example.com",
                "total_sessions": r["total_sessions"],
                "total_minutes": round(r["total_minutes"], 2),
                "total_cost": round(r["total_cost"], 4),
                "subtitle_minutes": round(r["subtitle_minutes"], 2),
                "dubbing_minutes": round(r["dubbing_minutes"], 2),
            })

        period_days = (end_date - start_date).days
        return top_users
    except Exception as e:
        logger.error(f"Error getting top users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top users")
