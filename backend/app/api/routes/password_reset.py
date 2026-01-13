"""
Password Reset Routes
Secure password reset flow with token-based verification.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets
import logging
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from app.models.user import User
from app.core.security import get_password_hash
from app.core.rate_limiter import limiter
from app.services.audit_logger import audit_logger


logger = logging.getLogger(__name__)
router = APIRouter()


class PasswordResetRequest(BaseModel):
    """Request model for password reset."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm model for password reset."""
    token: str
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
        
        # TODO: Send email with reset link
        # reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        # await send_password_reset_email(user.email, reset_url)
        
        logger.info(f"Password reset requested for: {user.email}")
        
        # ✅ Audit log: password reset requested
        await audit_logger.log_password_reset_request(user.email, request)
    else:
        # Log attempt for non-existent email (potential attack)
        logger.warning(f"Password reset requested for non-existent email: {reset_request.email} from IP: {request.client.host}")
    
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
        logger.warning(f"Invalid password reset token attempted from IP: {request.client.host}")
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
            email=user.email,
            name=user.name,
            password=reset_confirm.new_password
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
    current_password: str,
    new_password: str,
    user: User = None  # TODO: Add dependency for current user
):
    """
    Change password for authenticated user.
    
    Security features:
    - Requires current password verification
    - Rate limited
    - Password strength validated
    - Audit logged
    """
    # TODO: Implement after adding get_current_user dependency
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Password change endpoint not yet implemented. Use password reset flow.",
    )
