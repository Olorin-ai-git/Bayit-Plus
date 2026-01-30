"""
Beta 500 Signup and Verification API

Handles user signup and email verification for closed beta program.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.email_service import EmailVerificationService
from app.services.beta.fraud_service import FraudDetectionService
from app.models.beta_user import BetaUser
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/beta", tags=["beta"])


class SignupRequest(BaseModel):
    """Beta signup request."""
    email: EmailStr
    ip: str = ""
    user_agent: str = ""


class SignupResponse(BaseModel):
    """Beta signup response."""
    success: bool
    message: str
    user_id: str | None = None


class VerifyResponse(BaseModel):
    """Email verification response."""
    success: bool
    message: str


class ResendRequest(BaseModel):
    """Resend verification email request."""
    email: EmailStr


class ResendResponse(BaseModel):
    """Resend verification response."""
    success: bool
    message: str


@router.post("/signup", response_model=SignupResponse)
async def signup(
    request: SignupRequest,
    settings: Settings = Depends(get_settings),
    db = Depends(get_database)
):
    """
    Beta 500 program signup with email verification.

    Args:
        request: Signup request with email and metadata

    Returns:
        Signup response with success status and user ID
    """
    try:
        # Check if beta program is full
        active_count = await BetaUser.find(
            BetaUser.status.in_(["pending_verification", "active"])
        ).count()

        if active_count >= settings.BETA_MAX_USERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Beta program is full ({settings.BETA_MAX_USERS} users maximum)"
            )

        # Check if email already registered
        existing = await BetaUser.find_one(BetaUser.email == request.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Fraud detection
        fraud_service = FraudDetectionService(settings=settings)
        fraud_check = await fraud_service.check_signup(
            email=request.email,
            ip=request.ip,
            user_agent=request.user_agent
        )

        if fraud_check["risk"] == "high":
            logger.warning(
                "Signup blocked - high fraud risk",
                extra={
                    "email": request.email,
                    "reason": fraud_check["reason"]
                }
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Signup not allowed"
            )

        # Generate verification token
        email_service = EmailVerificationService(settings=settings)
        token = email_service.generate_verification_token(request.email)

        # Create beta user
        user = BetaUser(
            email=request.email,
            status="pending_verification",
            verification_token=token,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.BETA_DURATION_DAYS)
        )
        await user.insert()

        # Send verification email
        await email_service.send_verification_email(
            email=request.email,
            token=token
        )

        logger.info(
            "Beta signup successful",
            extra={"email": request.email, "user_id": str(user.id)}
        )

        return SignupResponse(
            success=True,
            message="Verification email sent. Please check your inbox.",
            user_id=str(user.id)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Signup error",
            extra={"email": request.email, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed"
        )


@router.get("/verify/{token}", response_model=VerifyResponse)
async def verify_email(
    token: str,
    settings: Settings = Depends(get_settings),
    db = Depends(get_database)
):
    """
    Verify user email with HMAC-SHA256 token.

    Args:
        token: Email verification token

    Returns:
        Verification response with success status
    """
    try:
        email_service = EmailVerificationService(settings=settings)
        credit_service = BetaCreditService(
            settings=settings,
            metering_service=None,  # Not needed for allocation
            db=db
        )

        # Verify token and activate user
        success, error = await email_service.verify_user_email(token)

        if not success:
            error_messages = {
                "invalid_format": "Invalid verification token",
                "expired": "Verification token has expired",
                "invalid_signature": "Invalid verification token",
                "user_not_found": "User not found",
                "database_error": "Verification failed"
            }
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_messages.get(error, "Verification failed")
            )

        # Get verified user
        valid, email, _ = email_service.verify_token(token)
        user = await BetaUser.find_one(BetaUser.email == email)

        # Allocate credits
        try:
            await credit_service.allocate_credits(user_id=str(user.id))
            logger.info(
                "Credits allocated to verified user",
                extra={"email": email, "credits": settings.BETA_AI_CREDITS}
            )
        except ValueError as e:
            # Credits already allocated (idempotent)
            logger.info(
                "Credits already allocated",
                extra={"email": email}
            )

        return VerifyResponse(
            success=True,
            message="Email verified successfully! You now have access to Beta 500."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Email verification error",
            extra={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed"
        )


@router.post("/resend-verification", response_model=ResendResponse)
async def resend_verification(
    request: ResendRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Resend verification email to user.

    Generates a new verification token and resends the email
    for users whose verification link expired or was lost.

    Args:
        request: Resend request with email

    Returns:
        Resend response with success status
    """
    try:
        # Find user
        user = await BetaUser.find_one(BetaUser.email == request.email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No beta signup found for this email. Please sign up first."
            )

        if user.status == "active" and user.verified_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified. You can log in now."
            )

        # Generate new verification token
        email_service = EmailVerificationService(settings=settings)
        verification_token = email_service.generate_verification_token(request.email)

        # Update user with new token
        user.verification_token = verification_token
        user.updated_at = datetime.now(timezone.utc)
        await user.save()

        # Resend verification email
        email_sent = await email_service.send_verification_email(request.email, verification_token)

        if not email_sent:
            logger.error(
                "Failed to resend verification email",
                extra={"email": request.email}
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please try again."
            )

        logger.info(
            "Verification email resent successfully",
            extra={"email": request.email}
        )

        return ResendResponse(
            success=True,
            message="Verification email resent. Please check your inbox."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Resend verification error",
            extra={"email": request.email, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend email. Please try again later."
        )
