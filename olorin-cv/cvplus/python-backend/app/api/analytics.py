"""
Analytics API Endpoints
Handles usage tracking, metrics, and reporting
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services import AnalyticsService

router = APIRouter()
analytics_service = AnalyticsService()

# Request/Response Models
class AnalyticsRequest(BaseModel):
    event_type: str
    cv_id: Optional[str] = None
    profile_id: Optional[str] = None
    metadata: Optional[dict] = None

class AnalyticsSummary(BaseModel):
    total_views: int
    total_downloads: int
    unique_visitors: int
    top_sources: List[dict]
    time_period: str

class ProfileAnalytics(BaseModel):
    profile_id: str
    slug: str
    total_views: int
    unique_visitors: int
    contact_requests: int
    recent_activity: List[dict]

@router.post("/track")
async def track_event(
    request: AnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Track analytics event
    Records user actions for reporting
    """
    try:
        event = await analytics_service.track_event(
            event_type=request.event_type,
            user_id=current_user["id"],
            cv_id=request.cv_id,
            profile_id=request.profile_id,
            metadata=request.metadata
        )

        return {
            "status": "tracked",
            "event_type": request.event_type,
            "event_id": str(event.id),
            "timestamp": event.created_at.isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tracking failed: {str(e)}")

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """
    Get analytics summary for user's CVs
    Returns aggregated metrics for time period
    """
    try:
        summary = await analytics_service.get_user_summary(
            user_id=current_user["id"],
            days=days
        )

        return AnalyticsSummary(
            total_views=summary["total_views"],
            total_downloads=summary["total_downloads"],
            unique_visitors=summary["unique_visitors"],
            top_sources=summary["top_sources"],
            time_period=summary["time_period"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

@router.get("/profile/{profile_id}", response_model=ProfileAnalytics)
async def get_profile_analytics(
    profile_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed analytics for a specific profile
    Returns views, visitors, and contact requests
    """
    try:
        analytics = await analytics_service.get_profile_analytics(
            profile_id=profile_id,
            user_id=current_user["id"]
        )

        return ProfileAnalytics(**analytics)

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")

@router.get("/cv/{cv_id}/metrics")
async def get_cv_metrics(
    cv_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get metrics for a specific CV
    Returns analysis performance and usage stats
    """
    try:
        metrics = await analytics_service.get_cv_metrics(
            cv_id=cv_id,
            user_id=current_user["id"]
        )

        return metrics

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

@router.delete("/events")
async def clear_analytics(
    current_user: dict = Depends(get_current_user)
):
    """
    Clear analytics data for user
    Removes all tracked events (admin only)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        await analytics_service.clear_user_analytics(current_user["id"])

        return {
            "status": "cleared",
            "message": "All analytics data has been removed"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear analytics: {str(e)}")
