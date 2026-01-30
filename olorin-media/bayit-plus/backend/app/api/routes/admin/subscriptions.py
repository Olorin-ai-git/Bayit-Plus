"""Admin Subscriptions Management - Endpoints for managing user subscriptions and plans"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from app.models.admin import AuditAction, Permission, SubscriptionPlan
from app.models.user import User

from .auth import has_permission, log_audit

router = APIRouter()


@router.get("/subscriptions")
async def get_subscriptions(
    plan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_READ)),
):
    """Get subscriptions list (users with subscription info)."""
    query = User.find(User.subscription_tier != None)

    if plan:
        query = query.find(User.subscription_tier == plan)
    if status:
        query = query.find(User.subscription_status == status)

    total = await query.count()
    skip = (page - 1) * page_size
    users = await query.skip(skip).limit(page_size).to_list()

    # Fetch all plans to get pricing info
    plans = await SubscriptionPlan.find().to_list()
    plan_prices = {p.slug: p.price for p in plans}

    items = [
        {
            "id": str(u.id),
            "user_id": str(u.id),
            "plan": u.subscription_tier,
            "status": u.subscription_status,
            "amount": (
                plan_prices.get(u.subscription_tier, 0) if u.subscription_tier else 0
            ),
            "start_date": (
                u.subscription_start_date.isoformat()
                if u.subscription_start_date
                else None
            ),
            "end_date": (
                u.subscription_end_date.isoformat() if u.subscription_end_date else None
            ),
            "next_billing": (
                u.subscription_end_date.isoformat() if u.subscription_end_date else None
            ),
            "user": {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "is_active": u.is_active,
                "role": u.role,
                "created_at": u.created_at.isoformat(),
            },
        }
        for u in users
    ]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/subscriptions/{user_id}/extend")
async def extend_subscription(
    user_id: str,
    days: int = Query(..., ge=1),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE)),
):
    """Extend a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.subscription_end_date:
        raise HTTPException(status_code=400, detail="User has no subscription")

    user.subscription_end_date = user.subscription_end_date + timedelta(days=days)
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.SUBSCRIPTION_UPDATED,
        "subscription",
        user_id,
        {"days_extended": days},
        request,
    )

    return {"message": f"Subscription extended by {days} days"}


@router.post("/subscriptions/{user_id}/cancel")
async def cancel_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_CANCEL)),
):
    """Cancel a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "canceled"
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.SUBSCRIPTION_CANCELED,
        "subscription",
        user_id,
        {},
        request,
    )

    return {"message": "Subscription canceled"}


@router.post("/subscriptions/{user_id}/pause")
async def pause_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE)),
):
    """Pause a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "paused"
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    return {"message": "Subscription paused"}


@router.post("/subscriptions/{user_id}/resume")
async def resume_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE)),
):
    """Resume a paused subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "active"
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    return {"message": "Subscription resumed"}


@router.post("/subscriptions/create")
async def create_subscription(
    user_id: str,
    plan_id: str,
    duration_days: int = 30,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_CREATE)),
):
    """Create a new subscription for a user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify plan exists
    plan = await SubscriptionPlan.find_one(SubscriptionPlan.slug == plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Set subscription details
    now = datetime.now(timezone.utc)
    user.subscription_tier = plan_id
    user.subscription_status = "active"
    user.subscription_start_date = now
    user.subscription_end_date = now + timedelta(days=duration_days)
    user.updated_at = now
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.SUBSCRIPTION_CREATED,
        "subscription",
        user_id,
        {"plan": plan_id, "duration_days": duration_days},
        request,
    )

    return {
        "message": "Subscription created successfully",
        "subscription": {
            "user_id": str(user.id),
            "plan": plan_id,
            "status": "active",
            "start_date": user.subscription_start_date.isoformat(),
            "end_date": user.subscription_end_date.isoformat(),
        },
    }


@router.put("/subscriptions/{user_id}/plan")
async def update_subscription_plan(
    user_id: str,
    plan_id: str,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE)),
):
    """Update a user's subscription plan."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.subscription_tier:
        raise HTTPException(status_code=400, detail="User has no subscription")

    # Verify plan exists
    plan = await SubscriptionPlan.find_one(SubscriptionPlan.slug == plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    old_plan = user.subscription_tier
    user.subscription_tier = plan_id
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.SUBSCRIPTION_UPDATED,
        "subscription",
        user_id,
        {"old_plan": old_plan, "new_plan": plan_id},
        request,
    )

    return {"message": f"Subscription plan updated to {plan_id}"}


@router.delete("/subscriptions/{user_id}")
async def delete_subscription(
    user_id: str,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_DELETE)),
):
    """Delete/remove a user's subscription entirely."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.subscription_tier:
        raise HTTPException(status_code=400, detail="User has no subscription")

    # Remove subscription
    user.subscription_tier = None
    user.subscription_status = None
    user.subscription_start_date = None
    user.subscription_end_date = None
    user.subscription_id = None
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.SUBSCRIPTION_DELETED,
        "subscription",
        user_id,
        {},
        request,
    )

    return {"message": "Subscription deleted successfully"}


@router.get("/subscriptions/analytics/churn")
async def get_subscriptions_churn_analytics(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get subscription churn analytics."""
    now = datetime.now(timezone.utc)

    # Active subscriptions
    active_subs = await User.find(User.subscription_status == "active").count()

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
    retention_rate = 100 - churn_rate

    # At-risk subscriptions (ending in next 7 days)
    at_risk = await User.find(
        User.subscription_status == "active",
        User.subscription_end_date <= now + timedelta(days=7),
        User.subscription_end_date >= now,
    ).count()

    return {
        "churn_rate": round(churn_rate, 2),
        "churned_users": canceled_30d,
        "at_risk_users": at_risk,
        "retention_rate": round(retention_rate, 2),
    }
