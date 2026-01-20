"""
Admin response models and shared Pydantic schemas.
"""

from typing import List

from pydantic import BaseModel


class DashboardStats(BaseModel):
    """Dashboard statistics response model."""

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
    """Generic paginated response model."""

    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
