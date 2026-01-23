"""
Admin API module.
Provides comprehensive admin functionality across multiple sub-modules.
"""

from fastapi import APIRouter

from .analytics import router as analytics_router
from .audit import router as audit_router
# Import auth utilities for external use
from .auth import has_permission, log_audit, require_admin
from .billing import router as billing_router
from .campaigns import router as campaigns_router
# Import all routers
from .dashboard import router as dashboard_router
from .live_quotas import router as live_quotas_router
from .live_quota_analytics import router as live_quota_analytics_router
from .marketing import router as marketing_router
from .plans import router as plans_router
from .recordings import router as recordings_router
from .settings import router as settings_router
from .subscriptions import router as subscriptions_router
from .users import router as users_router

# Create main admin router
router = APIRouter()

# Include all sub-routers
router.include_router(dashboard_router, tags=["admin-dashboard"])
router.include_router(users_router, tags=["admin-users"])
router.include_router(campaigns_router, tags=["admin-campaigns"])
router.include_router(billing_router, tags=["admin-billing"])
router.include_router(subscriptions_router, tags=["admin-subscriptions"])
router.include_router(plans_router, tags=["admin-plans"])
router.include_router(marketing_router, tags=["admin-marketing"])
router.include_router(settings_router, tags=["admin-settings"])
router.include_router(audit_router, tags=["admin-audit"])
router.include_router(analytics_router, tags=["admin-analytics"])
router.include_router(recordings_router, tags=["admin-recordings"])
router.include_router(live_quotas_router, tags=["admin-live-quotas"])
router.include_router(live_quota_analytics_router, tags=["admin-live-quota-analytics"])

__all__ = ["router", "require_admin", "has_permission", "log_audit"]
