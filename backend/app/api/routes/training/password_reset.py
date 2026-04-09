"""Training platform password reset routes."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.training_user import TrainingUser
from app.services.bayit_email_service import get_bayit_email_service
from app.services.email_templates import get_template_renderer

logger = logging.getLogger(__name__)

RESET_TOKEN_EXPIRE_HOURS = 2

router = APIRouter(prefix="/auth", tags=["training-auth"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """Request password reset. Always returns 200 to prevent email enumeration."""
    user = await TrainingUser.find_one({"email": body.email})
    if user and user.status == "active":
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(
            hours=RESET_TOKEN_EXPIRE_HOURS
        )
        await user.save()

        portal_url = settings.TRAINING_PORTAL_URL
        if portal_url:
            reset_url = f"{portal_url}/reset-password?token={reset_token}"
            renderer = get_template_renderer()
            html_content = renderer.render("training_password_reset.html", {
                "reset_url": reset_url,
                "expire_hours": RESET_TOKEN_EXPIRE_HOURS,
                "current_year": datetime.now(timezone.utc).year,
            })
            email_svc = get_bayit_email_service()
            await email_svc.send_generic_email(
                to_emails=[user.email],
                subject="Reset your Olorin Training password",
                html_content=html_content,
            )
        logger.info("Password reset requested for training user", extra={"email": body.email})
    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    """Reset password using a valid reset token."""
    user = await TrainingUser.find_one({"password_reset_token": body.token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    if (
        user.password_reset_expires_at
        and user.password_reset_expires_at < datetime.now(timezone.utc)
    ):
        user.password_reset_token = None
        user.password_reset_expires_at = None
        await user.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.password_hash = get_password_hash(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.updated_at = datetime.now(timezone.utc)
    await user.save()
    logger.info("Password reset completed for training user", extra={"user_id": str(user.id)})
    return {"message": "Password updated successfully"}
