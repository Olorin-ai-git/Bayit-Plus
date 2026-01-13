"""
Admin System Settings
Endpoints for managing system configuration and feature flags
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query, Request, Depends
from pydantic import BaseModel

from app.models.user import User
from app.models.admin import Permission, AuditAction, SystemSettings
from .auth import has_permission, log_audit


router = APIRouter()


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
