"""
Admin dashboard endpoints.
Provides overview statistics and recent activity.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query

from app.models.user import User
from app.models.admin import Transaction, TransactionStatus, AuditLog
from .auth import require_admin
from .models import DashboardStats


router = APIRouter()


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
