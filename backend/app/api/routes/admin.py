"""
Admin API Routes
Full admin functionality for dashboard, users, campaigns, billing, marketing, settings, and audit logs
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId
from beanie.operators import In, RegEx

from app.models.user import User, UserAdminUpdate, UserAdminResponse
from app.models.admin import (
    Role, Permission, ROLE_PERMISSIONS,
    Campaign, CampaignType, CampaignStatus, DiscountType, TargetAudience,
    Transaction, TransactionStatus, PaymentMethod,
    Refund, RefundStatus,
    AuditLog, AuditAction,
    EmailCampaign, PushNotification, MarketingStatus, AudienceFilter,
    SystemSettings, SubscriptionPlan,
)
from app.core.security import get_current_active_user


router = APIRouter()


# ============ RBAC DEPENDENCIES ============

def has_permission(required_permission: Permission):
    """Dependency to check if user has required permission."""
    async def permission_checker(current_user: User = Depends(get_current_active_user)):
        role = Role(current_user.role) if current_user.role in [r.value for r in Role] else Role.USER
        role_permissions = ROLE_PERMISSIONS.get(role, [])
        all_permissions = list(role_permissions) + [Permission(p) for p in current_user.custom_permissions if p in [pe.value for pe in Permission]]

        if required_permission not in all_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission.value} required"
            )
        return current_user
    return permission_checker


def require_admin():
    """Dependency to require any admin role."""
    async def admin_checker(current_user: User = Depends(get_current_active_user)):
        if not current_user.is_admin_user():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user
    return admin_checker


async def log_audit(
    user_id: str,
    action: AuditAction,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: dict = None,
    request: Request = None
):
    """Create an audit log entry."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    await log.insert()


# ============ RESPONSE MODELS ============

class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    daily_active_users: int
    new_users_today: int
    new_users_this_week: int
    total_revenue: float
    revenue_today: float
    revenue_this_month: float
    monthly_revenue: float
    active_subscriptions: int
    churn_rate: float
    avg_revenue_per_user: float


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ DASHBOARD ENDPOINTS ============

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(require_admin())):
    """Get dashboard statistics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start.replace(day=1)

    # User stats
    total_users = await User.count()
    active_users = await User.find(User.is_active == True).count()
    new_users_today = await User.find(User.created_at >= today_start).count()
    new_users_this_week = await User.find(User.created_at >= week_start).count()
    daily_active = await User.find(User.last_login >= today_start).count()

    # Subscription stats
    active_subs = await User.find(User.subscription_status == "active").count()

    # Revenue stats from transactions
    today_txns = await Transaction.find(
        Transaction.created_at >= today_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    month_txns = await Transaction.find(
        Transaction.created_at >= month_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    all_txns = await Transaction.find(Transaction.status == TransactionStatus.COMPLETED).to_list()

    revenue_today = sum(t.amount for t in today_txns)
    revenue_month = sum(t.amount for t in month_txns)
    total_revenue = sum(t.amount for t in all_txns)
    arpu = total_revenue / total_users if total_users > 0 else 0

    # Churn rate (users who canceled in last 30 days / active users)
    canceled_30d = await User.find(
        User.subscription_status == "canceled",
        User.updated_at >= now - timedelta(days=30)
    ).count()
    churn = (canceled_30d / active_subs * 100) if active_subs > 0 else 0

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        daily_active_users=daily_active,
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        total_revenue=total_revenue,
        revenue_today=revenue_today,
        revenue_this_month=revenue_month,
        monthly_revenue=revenue_month,
        active_subscriptions=active_subs,
        churn_rate=round(churn, 2),
        avg_revenue_per_user=round(arpu, 2),
    )


@router.get("/dashboard/activity")
async def get_recent_activity(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(require_admin())
):
    """Get recent audit log activity."""
    logs = await AuditLog.find().sort(-AuditLog.created_at).limit(limit).to_list()
    return [
        {
            "id": str(log.id),
            "user_id": log.user_id,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


# ============ USERS ENDPOINTS ============

class UsersFilter(BaseModel):
    search: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None  # active, inactive
    subscription: Optional[str] = None
    page: int = 1
    page_size: int = 20


@router.get("/users")
async def get_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    subscription: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.USERS_READ))
):
    """Get paginated list of users with filters."""
    query = User.find()

    if search:
        query = query.find(
            {"$or": [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
            ]}
        )
    if role:
        query = query.find(User.role == role)
    if status == "active":
        query = query.find(User.is_active == True)
    elif status == "inactive":
        query = query.find(User.is_active == False)
    if subscription:
        query = query.find(User.subscription_tier == subscription)

    total = await query.count()
    skip = (page - 1) * page_size
    users = await query.skip(skip).limit(page_size).to_list()

    return {
        "items": [u.to_admin_response().model_dump() for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: User = Depends(has_permission(Permission.USERS_READ))
):
    """Get user details."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_admin_response()


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    updates: UserAdminUpdate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE))
):
    """Update user details."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = {}
    if updates.name is not None:
        changes["name"] = {"old": user.name, "new": updates.name}
        user.name = updates.name
    if updates.email is not None:
        existing = await User.find_one(User.email == updates.email)
        if existing and str(existing.id) != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        changes["email"] = {"old": user.email, "new": updates.email}
        user.email = updates.email
    if updates.is_active is not None:
        changes["is_active"] = {"old": user.is_active, "new": updates.is_active}
        user.is_active = updates.is_active
    if updates.role is not None:
        if current_user.role != "super_admin" and updates.role == "super_admin":
            raise HTTPException(status_code=403, detail="Only super_admin can assign super_admin role")
        changes["role"] = {"old": user.role, "new": updates.role}
        user.role = updates.role
    if updates.custom_permissions is not None:
        changes["custom_permissions"] = {"old": user.custom_permissions, "new": updates.custom_permissions}
        user.custom_permissions = updates.custom_permissions

    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(str(current_user.id), AuditAction.USER_UPDATED, "user", user_id, changes, request)

    return user.to_admin_response()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_DELETE))
):
    """Delete a user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super_admin")

    await log_audit(str(current_user.id), AuditAction.USER_DELETED, "user", user_id, {"email": user.email}, request)
    await user.delete()

    return {"message": "User deleted"}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    reason: str = Query(...),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE))
):
    """Ban a user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = True
    user.ban_reason = reason
    user.banned_at = datetime.utcnow()
    user.is_active = False
    await user.save()

    await log_audit(str(current_user.id), AuditAction.USER_UPDATED, "user", user_id, {"action": "ban", "reason": reason}, request)

    return {"message": "User banned"}


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE))
):
    """Trigger password reset for user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # In production, this would send an email with reset link
    await log_audit(str(current_user.id), AuditAction.USER_UPDATED, "user", user_id, {"action": "password_reset_requested"}, request)

    return {"message": "Password reset email sent"}


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.USERS_READ))
):
    """Get user's audit log activity."""
    logs = await AuditLog.find(AuditLog.user_id == user_id).sort(-AuditLog.created_at).limit(limit).to_list()
    return [
        {
            "id": str(log.id),
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/users/{user_id}/billing")
async def get_user_billing(
    user_id: str,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get user's billing history."""
    transactions = await Transaction.find(Transaction.user_id == user_id).sort(-Transaction.created_at).limit(limit).to_list()
    return [
        {
            "id": str(t.id),
            "amount": t.amount,
            "currency": t.currency,
            "status": t.status.value,
            "payment_method": t.payment_method.value,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]


# ============ CAMPAIGNS ENDPOINTS ============

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: CampaignType
    start_date: datetime
    end_date: Optional[datetime] = None
    promo_code: Optional[str] = None
    discount_type: DiscountType
    discount_value: float
    usage_limit: Optional[int] = None
    target_audience: Optional[TargetAudience] = None


@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ))
):
    """Get campaigns list."""
    query = Campaign.find()

    if status:
        query = query.find(Campaign.status == CampaignStatus(status))
    if type:
        query = query.find(Campaign.type == CampaignType(type))

    total = await query.count()
    skip = (page - 1) * page_size
    campaigns = await query.sort(-Campaign.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "type": c.type.value,
                "status": c.status.value,
                "promo_code": c.promo_code,
                "discount_type": c.discount_type.value,
                "discount_value": c.discount_value,
                "usage_limit": c.usage_limit,
                "usage_count": c.usage_count,
                "start_date": c.start_date.isoformat(),
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "target_audience": c.target_audience.model_dump() if c.target_audience else None,
                "created_by": c.created_by,
                "created_at": c.created_at.isoformat(),
            }
            for c in campaigns
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/campaigns")
async def create_campaign(
    data: CampaignCreate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_CREATE))
):
    """Create a new campaign."""
    if data.promo_code:
        existing = await Campaign.find_one(Campaign.promo_code == data.promo_code)
        if existing:
            raise HTTPException(status_code=400, detail="Promo code already exists")

    campaign = Campaign(
        name=data.name,
        description=data.description,
        type=data.type,
        start_date=data.start_date,
        end_date=data.end_date,
        promo_code=data.promo_code,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        usage_limit=data.usage_limit,
        target_audience=data.target_audience or TargetAudience(),
        created_by=str(current_user.id),
    )
    await campaign.insert()

    await log_audit(str(current_user.id), AuditAction.CAMPAIGN_CREATED, "campaign", str(campaign.id), {"name": data.name}, request)

    return {"id": str(campaign.id), "message": "Campaign created"}


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ))
):
    """Get campaign details."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "description": campaign.description,
        "type": campaign.type.value,
        "status": campaign.status.value,
        "promo_code": campaign.promo_code,
        "discount_type": campaign.discount_type.value,
        "discount_value": campaign.discount_value,
        "usage_limit": campaign.usage_limit,
        "usage_count": campaign.usage_count,
        "start_date": campaign.start_date.isoformat(),
        "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
        "target_audience": campaign.target_audience.model_dump() if campaign.target_audience else None,
        "created_by": campaign.created_by,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.updated_at.isoformat(),
    }


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    data: CampaignCreate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE))
):
    """Update campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.name = data.name
    campaign.description = data.description
    campaign.type = data.type
    campaign.start_date = data.start_date
    campaign.end_date = data.end_date
    campaign.discount_type = data.discount_type
    campaign.discount_value = data.discount_value
    campaign.usage_limit = data.usage_limit
    campaign.target_audience = data.target_audience or TargetAudience()
    campaign.updated_at = datetime.utcnow()

    if data.promo_code and data.promo_code != campaign.promo_code:
        existing = await Campaign.find_one(Campaign.promo_code == data.promo_code)
        if existing:
            raise HTTPException(status_code=400, detail="Promo code already exists")
        campaign.promo_code = data.promo_code

    await campaign.save()
    await log_audit(str(current_user.id), AuditAction.CAMPAIGN_UPDATED, "campaign", campaign_id, {"name": data.name}, request)

    return {"message": "Campaign updated"}


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE))
):
    """Activate a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.ACTIVE
    campaign.updated_at = datetime.utcnow()
    await campaign.save()

    await log_audit(str(current_user.id), AuditAction.CAMPAIGN_ACTIVATED, "campaign", campaign_id, {}, request)

    return {"message": "Campaign activated"}


@router.post("/campaigns/{campaign_id}/deactivate")
async def deactivate_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE))
):
    """Deactivate a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.PAUSED
    campaign.updated_at = datetime.utcnow()
    await campaign.save()

    return {"message": "Campaign deactivated"}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_DELETE))
):
    """Delete a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await log_audit(str(current_user.id), AuditAction.CAMPAIGN_DELETED, "campaign", campaign_id, {"name": campaign.name}, request)
    await campaign.delete()

    return {"message": "Campaign deleted"}


@router.get("/campaigns/validate/{promo_code}")
async def validate_promo_code(
    promo_code: str,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ))
):
    """Validate a promo code."""
    campaign = await Campaign.find_one(Campaign.promo_code == promo_code)
    if not campaign:
        return {"valid": False, "message": "Invalid promo code"}

    if campaign.status != CampaignStatus.ACTIVE:
        return {"valid": False, "message": "Campaign not active"}

    if campaign.usage_limit and campaign.usage_count >= campaign.usage_limit:
        return {"valid": False, "message": "Usage limit reached"}

    now = datetime.utcnow()
    if campaign.start_date > now:
        return {"valid": False, "message": "Campaign not started"}
    if campaign.end_date and campaign.end_date < now:
        return {"valid": False, "message": "Campaign ended"}

    return {
        "valid": True,
        "campaign_id": str(campaign.id),
        "discount_type": campaign.discount_type.value,
        "discount_value": campaign.discount_value,
    }


# ============ BILLING ENDPOINTS ============

@router.get("/billing/overview")
async def get_billing_overview(
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get billing overview stats."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)

    today_txns = await Transaction.find(
        Transaction.created_at >= today_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    week_txns = await Transaction.find(
        Transaction.created_at >= week_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    month_txns = await Transaction.find(
        Transaction.created_at >= month_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    year_txns = await Transaction.find(
        Transaction.created_at >= year_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    all_txns = await Transaction.find(Transaction.status == TransactionStatus.COMPLETED).to_list()

    pending_refunds = await Refund.find(Refund.status == RefundStatus.PENDING).count()
    total_refunds = await Refund.find().count()
    total_transactions = len(all_txns)
    total_revenue = sum(t.amount for t in all_txns)
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    refund_rate = (total_refunds / total_transactions * 100) if total_transactions > 0 else 0

    return {
        "today": sum(t.amount for t in today_txns),
        "this_week": sum(t.amount for t in week_txns),
        "this_month": sum(t.amount for t in month_txns),
        "this_year": sum(t.amount for t in year_txns),
        "pending_refunds": pending_refunds,
        "total_transactions": total_transactions,
        "avg_transaction": round(avg_transaction, 2),
        "refund_rate": round(refund_rate, 2),
    }


@router.get("/billing/transactions")
async def get_transactions(
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get transactions list."""
    query = Transaction.find()

    if status:
        query = query.find(Transaction.status == TransactionStatus(status))
    if start_date:
        query = query.find(Transaction.created_at >= start_date)
    if end_date:
        query = query.find(Transaction.created_at <= end_date)
    if min_amount is not None:
        query = query.find(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.find(Transaction.amount <= max_amount)

    total = await query.count()
    skip = (page - 1) * page_size
    txns = await query.sort(-Transaction.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(t.id),
                "user_id": t.user_id,
                "amount": t.amount,
                "currency": t.currency,
                "status": t.status.value,
                "payment_method": t.payment_method.value,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in txns
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/billing/refunds")
async def get_refunds(
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get refunds list."""
    query = Refund.find()

    if status:
        query = query.find(Refund.status == RefundStatus(status))

    total = await query.count()
    skip = (page - 1) * page_size
    refunds = await query.sort(-Refund.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(r.id),
                "transaction_id": r.transaction_id,
                "user_id": r.user_id,
                "amount": r.amount,
                "reason": r.reason,
                "status": r.status.value,
                "processed_by": r.processed_by,
                "processed_at": r.processed_at.isoformat() if r.processed_at else None,
                "created_at": r.created_at.isoformat(),
            }
            for r in refunds
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class RefundRequest(BaseModel):
    amount: float
    reason: str


@router.post("/billing/transactions/{transaction_id}/refund")
async def process_refund(
    transaction_id: str,
    data: RefundRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Process a refund for a transaction."""
    txn = await Transaction.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.status != TransactionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only refund completed transactions")

    if data.amount > txn.amount:
        raise HTTPException(status_code=400, detail="Refund amount exceeds transaction amount")

    refund = Refund(
        transaction_id=transaction_id,
        user_id=txn.user_id,
        amount=data.amount,
        reason=data.reason,
        status=RefundStatus.PENDING,
    )
    await refund.insert()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", str(refund.id),
                   {"transaction_id": transaction_id, "amount": data.amount}, request)

    return {"id": str(refund.id), "message": "Refund requested"}


@router.post("/billing/refunds/{refund_id}/approve")
async def approve_refund(
    refund_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Approve a pending refund."""
    refund = await Refund.get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Refund is not pending")

    # Update transaction status
    txn = await Transaction.get(refund.transaction_id)
    if txn:
        txn.status = TransactionStatus.REFUNDED
        await txn.save()

    refund.status = RefundStatus.APPROVED
    refund.processed_by = str(current_user.id)
    refund.processed_at = datetime.utcnow()
    await refund.save()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", refund_id, {"action": "approved"}, request)

    return {"message": "Refund approved"}


@router.post("/billing/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: str,
    reason: str = Query(...),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Reject a pending refund."""
    refund = await Refund.get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Refund is not pending")

    refund.status = RefundStatus.REJECTED
    refund.processed_by = str(current_user.id)
    refund.processed_at = datetime.utcnow()
    await refund.save()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", refund_id, {"action": "rejected", "reason": reason}, request)

    return {"message": "Refund rejected"}


# ============ SUBSCRIPTIONS ENDPOINTS ============

@router.get("/subscriptions")
async def get_subscriptions(
    plan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_READ))
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

    return {
        "items": [
            {
                "id": str(u.id),
                "user_id": str(u.id),
                "plan": u.subscription_tier,
                "status": u.subscription_status,
                "amount": plan_prices.get(u.subscription_tier, 0) if u.subscription_tier else 0,
                "start_date": u.subscription_start_date.isoformat() if u.subscription_start_date else None,
                "end_date": u.subscription_end_date.isoformat() if u.subscription_end_date else None,
                "next_billing": u.subscription_end_date.isoformat() if u.subscription_end_date else None,
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
        ],
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
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE))
):
    """Extend a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.subscription_end_date:
        raise HTTPException(status_code=400, detail="User has no subscription")

    user.subscription_end_date = user.subscription_end_date + timedelta(days=days)
    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(str(current_user.id), AuditAction.SUBSCRIPTION_UPDATED, "subscription", user_id, {"days_extended": days}, request)

    return {"message": f"Subscription extended by {days} days"}


@router.post("/subscriptions/{user_id}/cancel")
async def cancel_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_CANCEL))
):
    """Cancel a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "canceled"
    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(str(current_user.id), AuditAction.SUBSCRIPTION_CANCELED, "subscription", user_id, {}, request)

    return {"message": "Subscription canceled"}


@router.post("/subscriptions/{user_id}/pause")
async def pause_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE))
):
    """Pause a user's subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "paused"
    user.updated_at = datetime.utcnow()
    await user.save()

    return {"message": "Subscription paused"}


@router.post("/subscriptions/{user_id}/resume")
async def resume_subscription(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE))
):
    """Resume a paused subscription."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.subscription_status = "active"
    user.updated_at = datetime.utcnow()
    await user.save()

    return {"message": "Subscription resumed"}


@router.post("/subscriptions/create")
async def create_subscription(
    user_id: str,
    plan_id: str,
    duration_days: int = 30,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_CREATE))
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
    now = datetime.utcnow()
    user.subscription_tier = plan_id
    user.subscription_status = "active"
    user.subscription_start_date = now
    user.subscription_end_date = now + timedelta(days=duration_days)
    user.updated_at = now
    await user.save()

    await log_audit(str(current_user.id), AuditAction.SUBSCRIPTION_CREATED, "subscription", user_id, {
        "plan": plan_id,
        "duration_days": duration_days
    }, request)

    return {
        "message": "Subscription created successfully",
        "subscription": {
            "user_id": str(user.id),
            "plan": plan_id,
            "status": "active",
            "start_date": user.subscription_start_date.isoformat(),
            "end_date": user.subscription_end_date.isoformat()
        }
    }


@router.put("/subscriptions/{user_id}/plan")
async def update_subscription_plan(
    user_id: str,
    plan_id: str,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_UPDATE))
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
    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(str(current_user.id), AuditAction.SUBSCRIPTION_UPDATED, "subscription", user_id, {
        "old_plan": old_plan,
        "new_plan": plan_id
    }, request)

    return {"message": f"Subscription plan updated to {plan_id}"}


@router.delete("/subscriptions/{user_id}")
async def delete_subscription(
    user_id: str,
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_DELETE))
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
    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(str(current_user.id), AuditAction.SUBSCRIPTION_DELETED, "subscription", user_id, {}, request)

    return {"message": "Subscription deleted successfully"}


@router.get("/subscriptions/analytics/churn")
async def get_subscriptions_churn_analytics(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ))
):
    """Get subscription churn analytics."""
    now = datetime.utcnow()

    # Active subscriptions
    active_subs = await User.find(User.subscription_status == "active").count()

    # Monthly churn rate
    active_start = await User.find(
        User.subscription_status == "active",
        User.created_at <= now - timedelta(days=30)
    ).count()

    canceled_30d = await User.find(
        User.subscription_status == "canceled",
        User.updated_at >= now - timedelta(days=30)
    ).count()

    churn_rate = (canceled_30d / active_start * 100) if active_start > 0 else 0
    retention_rate = 100 - churn_rate

    # At-risk subscriptions (ending in next 7 days)
    at_risk = await User.find(
        User.subscription_status == "active",
        User.subscription_end_date <= now + timedelta(days=7),
        User.subscription_end_date >= now
    ).count()

    return {
        "churn_rate": round(churn_rate, 2),
        "churned_users": canceled_30d,
        "at_risk_users": at_risk,
        "retention_rate": round(retention_rate, 2),
    }


# ============ PLANS ENDPOINTS ============

@router.get("/plans")
async def get_plans(
    current_user: User = Depends(has_permission(Permission.SUBSCRIPTIONS_READ))
):
    """Get all subscription plans."""
    plans = await SubscriptionPlan.find().to_list()
    result = []
    for p in plans:
        # Count subscribers for this plan
        subscribers = await User.find(User.subscription_tier == p.slug).count()
        result.append({
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
        })
    return result


class PlanCreate(BaseModel):
    name: str
    name_he: Optional[str] = None
    slug: Optional[str] = None  # Auto-generate from name if not provided
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
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Create a new subscription plan."""
    # Auto-generate slug from name if not provided
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
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
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
    plan.updated_at = datetime.utcnow()
    await plan.save()

    return {"message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Delete a subscription plan."""
    plan = await SubscriptionPlan.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Check if any users have this plan
    users_with_plan = await User.find(User.subscription_tier == plan.slug).count()
    if users_with_plan > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete plan with {users_with_plan} active subscribers")

    await plan.delete()
    return {"message": "Plan deleted"}


# ============ MARKETING ENDPOINTS ============

@router.get("/marketing/metrics")
async def get_marketing_metrics(
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
):
    """Get marketing metrics summary."""
    # Email metrics
    email_campaigns = await EmailCampaign.find().to_list()
    total_emails_sent = sum(c.sent_count for c in email_campaigns)
    total_emails_opened = sum(c.open_count for c in email_campaigns)
    total_emails_clicked = sum(c.click_count for c in email_campaigns)

    email_open_rate = (total_emails_opened / total_emails_sent * 100) if total_emails_sent > 0 else 0
    email_click_rate = (total_emails_clicked / total_emails_sent * 100) if total_emails_sent > 0 else 0

    # Push metrics
    push_notifications = await PushNotification.find().to_list()
    total_push_sent = sum(p.sent_count for p in push_notifications)
    total_push_opened = sum(p.open_count for p in push_notifications)

    push_open_rate = (total_push_opened / total_push_sent * 100) if total_push_sent > 0 else 0

    # Active segments (hardcoded for now as we have 5 segments)
    active_segments = 5

    # Conversion and unsubscribe rates (placeholder values)
    conversion_rate = 4.5
    unsubscribe_rate = 0.8

    return {
        "emailsSent": total_emails_sent,
        "emailOpenRate": round(email_open_rate, 1),
        "emailClickRate": round(email_click_rate, 1),
        "pushSent": total_push_sent,
        "pushOpenRate": round(push_open_rate, 1),
        "activeSegments": active_segments,
        "conversionRate": conversion_rate,
        "unsubscribeRate": unsubscribe_rate,
    }


@router.get("/marketing/campaigns/recent")
async def get_recent_campaigns(
    limit: int = Query(default=5, le=20),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
):
    """Get recent marketing campaigns (email and push)."""
    # Get recent email campaigns
    email_campaigns = await EmailCampaign.find().sort(-EmailCampaign.created_at).limit(limit).to_list()

    # Get recent push notifications
    push_campaigns = await PushNotification.find().sort(-PushNotification.created_at).limit(limit).to_list()

    # Combine and format
    campaigns = []

    for c in email_campaigns:
        campaigns.append({
            "id": str(c.id),
            "name": c.name,
            "type": "email",
            "status": c.status.value,
            "sent": c.sent_count,
            "opened": c.open_count,
            "clicked": c.click_count,
            "created_at": c.created_at.isoformat(),
        })

    for c in push_campaigns:
        campaigns.append({
            "id": str(c.id),
            "name": c.title,
            "type": "push",
            "status": c.status.value,
            "sent": c.sent_count,
            "opened": c.open_count,
            "clicked": 0,
            "created_at": c.created_at.isoformat(),
        })

    # Sort by created_at and limit
    campaigns.sort(key=lambda x: x["created_at"], reverse=True)
    return campaigns[:limit]


@router.get("/marketing/segments/summary")
async def get_audience_segments(
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
):
    """Get audience segments summary with user counts."""
    from datetime import timedelta

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # Get counts for different segments
    total_users = await User.find().count()
    active_subscribers = await User.find(
        User.subscription_status == "active"
    ).count()
    new_users = await User.find(
        User.created_at >= seven_days_ago
    ).count()
    expired_subscribers = await User.find(
        User.subscription_status == "expired"
    ).count()
    inactive_users = await User.find(
        User.last_login < thirty_days_ago
    ).count()

    return [
        {"name": "כל המשתמשים", "count": total_users},
        {"name": "מנויים פעילים", "count": active_subscribers},
        {"name": "משתמשים חדשים (7 ימים)", "count": new_users},
        {"name": "מנויים שפג תוקפם", "count": expired_subscribers},
        {"name": "לא פעילים (30 יום)", "count": inactive_users},
    ]


@router.get("/marketing/emails")
async def get_email_campaigns(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
):
    """Get email campaigns list."""
    query = EmailCampaign.find()

    if status and status != "all":
        query = query.find(EmailCampaign.status == MarketingStatus(status))

    if search:
        query = query.find({"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
        ]})

    total = await query.count()
    skip = (page - 1) * page_size
    campaigns = await query.sort(-EmailCampaign.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "subject": c.subject,
                "status": c.status.value,
                "sent_count": c.sent_count,
                "open_count": c.open_count,
                "click_count": c.click_count,
                "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in campaigns
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    audience_filter: Optional[AudienceFilter] = None


@router.post("/marketing/emails")
async def create_email_campaign(
    data: EmailCampaignCreate,
    current_user: User = Depends(has_permission(Permission.MARKETING_CREATE))
):
    """Create a new email campaign."""
    campaign = EmailCampaign(
        name=data.name,
        subject=data.subject,
        body_html=data.body_html,
        body_text=data.body_text,
        audience_filter=data.audience_filter or AudienceFilter(),
        created_by=str(current_user.id),
    )
    await campaign.insert()

    return {"id": str(campaign.id), "message": "Email campaign created"}


@router.post("/marketing/emails/{campaign_id}/send")
async def send_email_campaign(
    campaign_id: str,
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND))
):
    """Send an email campaign."""
    campaign = await EmailCampaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == MarketingStatus.SENT:
        raise HTTPException(status_code=400, detail="Campaign already sent")

    # In production, this would queue the emails for sending
    campaign.status = MarketingStatus.SENT
    campaign.sent_at = datetime.utcnow()
    await campaign.save()

    return {"message": "Email campaign sent"}


@router.post("/marketing/emails/{campaign_id}/schedule")
async def schedule_email_campaign(
    campaign_id: str,
    scheduled_at: datetime = Query(...),
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND))
):
    """Schedule an email campaign."""
    campaign = await EmailCampaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = MarketingStatus.SCHEDULED
    campaign.scheduled_at = scheduled_at
    await campaign.save()

    return {"message": f"Email campaign scheduled for {scheduled_at}"}


@router.get("/marketing/push")
async def get_push_notifications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
):
    """Get push notifications list."""
    query = PushNotification.find()

    if status and status != "all":
        query = query.find(PushNotification.status == MarketingStatus(status))

    if search:
        query = query.find({"$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"body": {"$regex": search, "$options": "i"}},
        ]})

    total = await query.count()
    skip = (page - 1) * page_size
    notifications = await query.sort(-PushNotification.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "deep_link": n.deep_link,
                "status": n.status.value,
                "sent_count": n.sent_count,
                "open_count": n.open_count,
                "scheduled_at": n.scheduled_at.isoformat() if n.scheduled_at else None,
                "sent_at": n.sent_at.isoformat() if n.sent_at else None,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class PushNotificationCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    deep_link: Optional[str] = None
    audience_filter: Optional[AudienceFilter] = None


@router.post("/marketing/push")
async def create_push_notification(
    data: PushNotificationCreate,
    current_user: User = Depends(has_permission(Permission.MARKETING_CREATE))
):
    """Create a new push notification."""
    notification = PushNotification(
        title=data.title,
        body=data.body,
        image_url=data.image_url,
        deep_link=data.deep_link,
        audience_filter=data.audience_filter or AudienceFilter(),
        created_by=str(current_user.id),
    )
    await notification.insert()

    return {"id": str(notification.id), "message": "Push notification created"}


@router.post("/marketing/push/{notification_id}/send")
async def send_push_notification(
    notification_id: str,
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND))
):
    """Send a push notification."""
    notification = await PushNotification.get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.status == MarketingStatus.SENT:
        raise HTTPException(status_code=400, detail="Notification already sent")

    # In production, this would send via FCM/APNS
    notification.status = MarketingStatus.SENT
    notification.sent_at = datetime.utcnow()
    await notification.save()

    return {"message": "Push notification sent"}


# ============ SETTINGS ENDPOINTS ============

@router.get("/settings")
async def get_settings(
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Get system settings."""
    settings = await SystemSettings.find_one(SystemSettings.key == "system_settings")
    if not settings:
        # Create default settings
        settings = SystemSettings(key="system_settings")
        await settings.insert()

    return {
        "default_plan": settings.default_plan,
        "trial_days": settings.trial_days,
        "max_devices": settings.max_devices,
        "maintenance_mode": settings.maintenance_mode,
        "support_email": settings.support_email,
        "terms_url": settings.terms_url,
        "privacy_url": settings.privacy_url,
    }


class SettingsUpdate(BaseModel):
    default_plan: Optional[str] = None
    trial_days: Optional[int] = None
    max_devices: Optional[int] = None
    maintenance_mode: Optional[bool] = None
    support_email: Optional[str] = None
    terms_url: Optional[str] = None
    privacy_url: Optional[str] = None


@router.patch("/settings")
async def update_settings(
    data: SettingsUpdate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Update system settings."""
    settings = await SystemSettings.find_one(SystemSettings.key == "system_settings")
    if not settings:
        settings = SystemSettings(key="system_settings")

    changes = {}
    if data.default_plan is not None:
        changes["default_plan"] = {"old": settings.default_plan, "new": data.default_plan}
        settings.default_plan = data.default_plan
    if data.trial_days is not None:
        changes["trial_days"] = {"old": settings.trial_days, "new": data.trial_days}
        settings.trial_days = data.trial_days
    if data.max_devices is not None:
        changes["max_devices"] = {"old": settings.max_devices, "new": data.max_devices}
        settings.max_devices = data.max_devices
    if data.maintenance_mode is not None:
        changes["maintenance_mode"] = {"old": settings.maintenance_mode, "new": data.maintenance_mode}
        settings.maintenance_mode = data.maintenance_mode
    if data.support_email is not None:
        changes["support_email"] = {"old": settings.support_email, "new": data.support_email}
        settings.support_email = data.support_email
    if data.terms_url is not None:
        changes["terms_url"] = {"old": settings.terms_url, "new": data.terms_url}
        settings.terms_url = data.terms_url
    if data.privacy_url is not None:
        changes["privacy_url"] = {"old": settings.privacy_url, "new": data.privacy_url}
        settings.privacy_url = data.privacy_url

    settings.updated_at = datetime.utcnow()
    settings.updated_by = str(current_user.id)
    await settings.save()

    await log_audit(str(current_user.id), AuditAction.SETTINGS_UPDATED, "settings", "system_settings", changes, request)

    return {"message": "Settings updated"}


@router.get("/settings/feature-flags")
async def get_feature_flags(
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Get feature flags."""
    settings = await SystemSettings.find_one(SystemSettings.key == "system_settings")
    if not settings:
        settings = SystemSettings(key="system_settings")
        await settings.insert()

    return settings.feature_flags


@router.patch("/settings/feature-flags/{flag}")
async def update_feature_flag(
    flag: str,
    enabled: bool = Query(...),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.SYSTEM_CONFIG))
):
    """Update a feature flag."""
    settings = await SystemSettings.find_one(SystemSettings.key == "system_settings")
    if not settings:
        settings = SystemSettings(key="system_settings")

    old_value = settings.feature_flags.get(flag)
    settings.feature_flags[flag] = enabled
    settings.updated_at = datetime.utcnow()
    settings.updated_by = str(current_user.id)
    await settings.save()

    await log_audit(str(current_user.id), AuditAction.SETTINGS_UPDATED, "feature_flag", flag,
                   {"old": old_value, "new": enabled}, request)

    return {"message": f"Feature flag '{flag}' set to {enabled}"}


# ============ AUDIT LOGS ENDPOINTS ============

@router.get("/logs")
async def get_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=200),
    current_user: User = Depends(has_permission(Permission.SYSTEM_LOGS))
):
    """Get audit logs with filtering."""
    query = AuditLog.find()

    if action:
        query = query.find(AuditLog.action == AuditAction(action))
    if resource_type:
        query = query.find(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.find(AuditLog.user_id == user_id)
    if start_date:
        query = query.find(AuditLog.created_at >= start_date)
    if end_date:
        query = query.find(AuditLog.created_at <= end_date)

    total = await query.count()
    skip = (page - 1) * page_size
    logs = await query.sort(-AuditLog.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(log.id),
                "user_id": log.user_id,
                "action": log.action.value,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/logs/export")
async def export_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(has_permission(Permission.SYSTEM_LOGS))
):
    """Export audit logs as JSON."""
    query = AuditLog.find()

    if start_date:
        query = query.find(AuditLog.created_at >= start_date)
    if end_date:
        query = query.find(AuditLog.created_at <= end_date)

    logs = await query.sort(-AuditLog.created_at).to_list()

    return {
        "logs": [
            {
                "id": str(log.id),
                "user_id": log.user_id,
                "action": log.action.value,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": str(current_user.id),
        "total_records": len(logs),
    }


# ============ ANALYTICS ENDPOINTS ============

@router.get("/analytics/churn")
async def get_churn_analytics(
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ))
):
    """Get churn analytics."""
    now = datetime.utcnow()

    # Monthly churn rate
    active_start = await User.find(
        User.subscription_status == "active",
        User.created_at <= now - timedelta(days=30)
    ).count()

    canceled_30d = await User.find(
        User.subscription_status == "canceled",
        User.updated_at >= now - timedelta(days=30)
    ).count()

    churn_rate = (canceled_30d / active_start * 100) if active_start > 0 else 0

    # At-risk subscriptions (ending in next 7 days, not renewed)
    at_risk = await User.find(
        User.subscription_status == "active",
        User.subscription_end_date <= now + timedelta(days=7),
        User.subscription_end_date >= now
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
    current_user: User = Depends(has_permission(Permission.MARKETING_READ))
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
            User.last_login <= datetime.utcnow() - timedelta(days=30)
        ).count()
    elif segment == "new_users":
        count = await User.find(
            User.created_at >= datetime.utcnow() - timedelta(days=7)
        ).count()
    else:
        count = await User.find(User.is_active == True).count()

    return {"segment": segment or "all_users", "count": count}
