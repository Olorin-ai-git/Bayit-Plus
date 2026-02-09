"""
Security Settings Routes
Endpoints for user security preferences (biometric, 2FA status, login notifications).
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class SecuritySettingsResponse(BaseModel):
    twoFactorEnabled: bool = False
    biometricEnabled: bool = False
    lastPasswordChange: Optional[str] = None
    loginNotifications: bool = False


@router.get("/security/settings", response_model=SecuritySettingsResponse)
async def get_security_settings(
    current_user: User = Depends(get_current_active_user),
):
    """Get security settings for the current user."""
    last_pw_change = None
    if current_user.last_password_change:
        last_pw_change = current_user.last_password_change.isoformat()

    login_notifications = current_user.notification_settings.get(
        "login_events", False
    )

    return SecuritySettingsResponse(
        twoFactorEnabled=current_user.two_factor_enabled,
        biometricEnabled=current_user.biometric_enabled,
        lastPasswordChange=last_pw_change,
        loginNotifications=login_notifications,
    )


@router.post("/biometric/enable")
async def enable_biometric(
    current_user: User = Depends(get_current_active_user),
):
    """Enable biometric authentication for the current user."""
    current_user.biometric_enabled = True
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    logger.info(
        "Biometric enabled for user",
        extra={"user_id": str(current_user.id)},
    )
    return {"message": "Biometric authentication enabled"}


@router.post("/biometric/disable")
async def disable_biometric(
    current_user: User = Depends(get_current_active_user),
):
    """Disable biometric authentication for the current user."""
    current_user.biometric_enabled = False
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()
    logger.info(
        "Biometric disabled for user",
        extra={"user_id": str(current_user.id)},
    )
    return {"message": "Biometric authentication disabled"}
