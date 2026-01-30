"""
Admin Analytics
Endpoints for analytics and reporting
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends

from app.models.admin import Permission
from app.models.user import User

from .auth import has_permission

router = APIRouter()


# ============ ANALYTICS ENDPOINTS ============


@router.get("/analytics/churn")
async def get_churn_analytics(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get churn analytics."""
    now = datetime.now(timezone.utc)

    # Monthly churn rate
    active_start = await User.find(
        User.subscription_status == "active",
        User.created_at <= now - timedelta(days=30),
    ).count()

    canceled_30d = await User.find(
        User.subscription_status == "canceled",
        User.updated_at >= now - timedelta(days=30),
    ).count()

    churn_rate = (canceled_30d / active_start * 100) if active_start > 0 else 0

    # At-risk subscriptions (ending in next 7 days, not renewed)
    at_risk = await User.find(
        User.subscription_status == "active",
        User.subscription_end_date <= now + timedelta(days=7),
        User.subscription_end_date >= now,
    ).count()

    # Recovered (canceled then resubscribed)
    # This would require additional tracking

    return {
        "monthly_churn_rate": round(churn_rate, 2),
        "canceled_last_30_days": canceled_30d,
        "at_risk_subscriptions": at_risk,
        "active_subscriptions_start": active_start,
    }


@router.get("/analytics/audience-count")
async def get_audience_count(
    segment: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get audience count based on filter."""
    if segment == "all_users":
        count = await User.find(User.is_active == True).count()
    elif segment == "premium":
        count = await User.find(User.subscription_tier == "premium").count()
    elif segment == "basic":
        count = await User.find(User.subscription_tier == "basic").count()
    elif segment == "inactive_30":
        count = await User.find(
            User.last_login <= datetime.now(timezone.utc) - timedelta(days=30)
        ).count()
    elif segment == "new_users":
        count = await User.find(
            User.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
        ).count()
    else:
        count = await User.find(User.is_active == True).count()

    return {"segment": segment or "all_users", "count": count}
