"""
Verification API Routes
Handles email and phone verification endpoints
"""
import logging

from app.core.security import get_current_active_user
from app.models.user import User
from app.services.verification_service import verification_service
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class PhoneVerificationRequest(BaseModel):
    phone_number: str


class PhoneVerificationCodeRequest(BaseModel):
    code: str


class EmailVerificationRequest(BaseModel):
    token: str


@router.post("/verification/email/send")
async def send_email_verification(
    current_user: User = Depends(get_current_active_user),
):
    """Send email verification link to current user."""
    if current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified"
        )

    if current_user.is_admin_role():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin users do not need verification",
        )

    try:
        success = await verification_service.initiate_email_verification(current_user)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email",
            )

        return {"message": "Verification email sent", "email": current_user.email}
    except Exception as e:
        logger.error(f"Email verification send error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verification/email/verify")
async def verify_email(request: EmailVerificationRequest):
    """Verify email with token (public endpoint)."""
    user = await verification_service.verify_email(request.token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    return {
        "message": "Email verified successfully",
        "email_verified": user.email_verified,
        "is_verified": user.is_verified,
    }


@router.post("/verification/phone/send")
async def send_phone_verification(
    request: PhoneVerificationRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send SMS verification code to phone number."""
    if current_user.phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Phone already verified"
        )

    if current_user.is_admin_role():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin users do not need verification",
        )

    try:
        success = await verification_service.initiate_phone_verification(
            current_user, request.phone_number
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code",
            )

        return {
            "message": "Verification code sent",
            "phone_number": current_user.phone_number,
        }
    except Exception as e:
        logger.error(f"Phone verification send error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verification/phone/verify")
async def verify_phone(
    request: PhoneVerificationCodeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify phone with code."""
    success = await verification_service.verify_phone(current_user, request.code)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    return {
        "message": "Phone verified successfully",
        "phone_verified": current_user.phone_verified,
        "is_verified": current_user.is_verified,
    }


@router.get("/verification/status")
async def get_verification_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's verification status."""
    return {
        "email_verified": current_user.email_verified,
        "phone_verified": current_user.phone_verified,
        "is_verified": current_user.is_verified,
        "is_admin": current_user.is_admin_role(),
        "phone_number": current_user.phone_number,
        "email": current_user.email,
    }
