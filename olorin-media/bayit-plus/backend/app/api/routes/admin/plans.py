"""
Admin Subscription Plans Management
Endpoints for managing subscription plan configuration
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.admin import Permission, SubscriptionPlan
from app.models.user import User

from .auth import has_permission

router = APIRouter()


# ============ PLANS ENDPOINTS ============


@router.get("/plans")
async def get_plans(
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_READ)),
):
    """Get all subscription plans."""
    plans = await SubscriptionPlan.find().to_list()
    result = []
    for p in plans:
        # Count subscribers for this plan
        subscribers = await User.find(User.subscription_tier == p.slug).count()
        result.append(
            {
                "id": str(p.id),
                "name": p.name,
                "name_he": p.name_he,
                "slug": p.slug,
                "price": p.price,
                "currency": p.currency,
                "interval": p.interval,
                "trial_days": p.trial_days,
                "features": p.features,
                "max_devices": p.max_devices,
                "is_active": p.is_active,
                "subscribers": subscribers,
            }
        )
    return result


class PlanCreate(BaseModel):
    name: str
    name_he: Optional[str] = None
    slug: Optional[str] = None
    price: float
    currency: str = "USD"
    interval: str = "monthly"
    trial_days: int = 0
    features: List[str] = []
    max_devices: int = 1
    is_active: bool = True


@router.post("/plans")
async def create_plan(
    data: PlanCreate,
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG)),
):
    """Create a new subscription plan."""
    slug = data.slug or data.name.lower().replace(" ", "_")

    existing = await SubscriptionPlan.find_one(SubscriptionPlan.slug == slug)
    if existing:
        raise HTTPException(status_code=400, detail="Plan slug already exists")

    plan_data = data.model_dump()
    plan_data["slug"] = slug
    plan = SubscriptionPlan(**plan_data)
    await plan.insert()

    return {"id": str(plan.id), "message": "Plan created"}


@router.patch("/plans/{plan_id}")
@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    data: PlanCreate,
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG)),
):
    """Update a subscription plan."""
    plan = await SubscriptionPlan.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.name = data.name
    plan.name_he = data.name_he
    plan.price = data.price
    plan.currency = data.currency
    plan.interval = data.interval
    plan.trial_days = data.trial_days
    plan.features = data.features
    plan.max_devices = data.max_devices
    plan.is_active = data.is_active
    plan.updated_at = datetime.now(timezone.utc)
    await plan.save()

    return {"message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str, current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Delete a subscription plan."""
    plan = await SubscriptionPlan.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    users_with_plan = await User.find(User.subscription_tier == plan.slug).count()
    if users_with_plan > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete plan with {users_with_plan} active subscribers",
        )

    await plan.delete()
    return {"message": "Plan deleted"}
