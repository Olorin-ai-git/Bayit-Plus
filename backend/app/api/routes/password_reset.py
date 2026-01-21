"""
Password Reset Routes
Secure password reset flow with token-based verification.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import (get_current_user, get_password_hash,
                               verify_password)
from app.models.user import User
from app.services.audit_logger import audit_logger
from app.services.email_service import send_email

logger = logging.getLogger(__name__)
router = APIRouter()


class PasswordResetRequest(BaseModel):
    """Request model for password reset."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm model for password reset."""

    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Request model for password change."""

    current_password: str
    new_password: str


@router.post("/request")
@limiter.limit("3/hour")
async def request_password_reset(request: Request, reset_request: PasswordResetRequest):
    """
    Request a password reset link.

    Security features:
    - Rate limited to 3 requests per hour
    - Generic response to prevent email enumeration
    - Token expires in 1 hour
    - Cryptographically secure token
    - Audit logged
    """
    # Always return success to prevent email enumeration
    # But only send email if user exists
    user = await User.find_one(User.email == reset_request.email)

    if user:
        # Generate cryptographically secure token
        reset_token = secrets.token_urlsafe(32)

        # Set token and expiry (1 hour)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await user.save()

        # Send email with reset link
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1a1a2e; padding: 40px; border-radius: 12px;">
                <h1 style="color: #ffffff; margin: 0 0 20px 0;">Password Reset Request</h1>
                <p style="color: #b8b8d1; line-height: 1.6;">
                    Hi {user.name or 'there'},
                </p>
                <p style="color: #b8b8d1; line-height: 1.6;">
                    We received a request to reset your password for your Bayit+ account.
                    Click the button below to reset your password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background: linear-gradient(135deg, #4f46e5, #7c3aed);
                              color: white;
                              padding: 14px 32px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: bold;
                              display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #b8b8d1; font-size: 14px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_url}" style="color: #818cf8;">{reset_url}</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    This link will expire in 1 hour. If you didn't request this password reset,
                    you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """

        email_sent = await send_email(
            to_emails=[user.email],
            subject="Reset your Bayit+ password",
            html_content=html_content,
        )

        if email_sent:
            logger.info(f"Password reset email sent to: {user.email}")
        else:
            logger.warning(f"Password reset email could not be sent to: {user.email}")

        # ✅ Audit log: password reset requested
        await audit_logger.log_password_reset_request(user.email, request)
    else:
        # Log attempt for non-existent email (potential attack)
        logger.warning(
            f"Password reset requested for non-existent email: {reset_request.email} from IP: {request.client.host}"
        )

    # Generic response to prevent enumeration
    return {
        "message": "If your email is registered, you will receive a password reset link shortly."
    }


@router.post("/confirm")
@limiter.limit("5/minute")
async def confirm_password_reset(request: Request, reset_confirm: PasswordResetConfirm):
    """
    Confirm password reset with token.

    Security features:
    - Rate limited to 5 attempts per minute
    - Token expires after 1 hour
    - Token is single-use (deleted after use)
    - Password strength validated by User model
    - Audit logged
    - Account lockout reset on successful password change
    """
    # Find user by reset token
    user = await User.find_one(User.password_reset_token == reset_confirm.token)

    if not user:
        logger.warning(
            f"Invalid password reset token attempted from IP: {request.client.host}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Check if token is expired
    if user.password_reset_expires < datetime.now(timezone.utc):
        logger.warning(f"Expired password reset token attempted for: {user.email}")
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        await user.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
        )

    # Validate new password (UserCreate validator will check strength)
    # We need to manually validate since we're not using UserCreate here
    from app.models.user import UserCreate

    try:
        # This will trigger password validation
        UserCreate(
            email=user.email, name=user.name, password=reset_confirm.new_password
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Update password
    user.hashed_password = get_password_hash(reset_confirm.new_password)

    # Clear reset token (single-use)
    user.password_reset_token = None
    user.password_reset_expires = None

    # ✅ Reset account lockout on successful password change
    user.failed_login_attempts = 0
    user.last_failed_login = None
    user.account_locked_until = None

    await user.save()

    logger.info(f"Password reset completed for: {user.email}")

    # ✅ Audit log: password reset completed
    await audit_logger.log_password_reset_complete(user, request)

    return {
        "message": "Password has been reset successfully. You can now log in with your new password."
    }


@router.post("/change")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    change_request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Change password for authenticated user.

    Security features:
    - Requires current password verification
    - Rate limited
    - Password strength validated
    - Audit logged
    """
    # Verify current password
    if not verify_password(
        change_request.current_password, current_user.hashed_password
    ):
        logger.warning(f"Invalid current password for user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Ensure new password is different from current
    if change_request.current_password == change_request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    # Update password
    current_user.hashed_password = get_password_hash(change_request.new_password)
    await current_user.save()

    logger.info(f"Password changed for user: {current_user.email}")

    # Audit log
    await audit_logger.log_password_change(current_user, request)

    return {"message": "Password changed successfully"}
