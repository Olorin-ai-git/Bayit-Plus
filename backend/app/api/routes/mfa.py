"""
MFA (Multi-Factor Authentication) Routes
TOTP and SMS-based two-factor authentication endpoints.
"""

import hmac
import logging
from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.twilio_service import TwilioService

logger = logging.getLogger(__name__)
router = APIRouter()


class MFACodeRequest(BaseModel):
    code: str


class TOTPSetupResponse(BaseModel):
    secret: str
    qrCode: str


@router.post("/2fa/enable", response_model=TOTPSetupResponse)
async def enable_totp(
    current_user: User = Depends(get_current_active_user),
):
    """Generate TOTP secret and provisioning URI for authenticator app setup."""
    secret = pyotp.random_base32()
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name=settings.APP_NAME,
    )

    current_user.two_factor_secret = secret
    current_user.two_factor_method = "totp"
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

    logger.info(
        "TOTP setup initiated for user",
        extra={"user_id": str(current_user.id)},
    )

    return TOTPSetupResponse(secret=secret, qrCode=provisioning_uri)


@router.post("/2fa/verify")
async def verify_totp(
    data: MFACodeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify TOTP code to confirm authenticator app setup."""
    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor setup not initiated. Call /2fa/enable first.",
        )

    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(data.code, valid_window=1):
        logger.warning(
            "Invalid TOTP code during setup verification",
            extra={"user_id": str(current_user.id)},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    current_user.two_factor_enabled = True
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

    logger.info(
        "TOTP 2FA enabled for user",
        extra={"user_id": str(current_user.id)},
    )

    return {"message": "Two-factor authentication enabled successfully"}


@router.post("/2fa/disable")
async def disable_mfa(
    current_user: User = Depends(get_current_active_user),
):
    """Disable two-factor authentication entirely."""
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.two_factor_method = None
    current_user.mfa_sms_code = None
    current_user.mfa_sms_sent_at = None
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

    logger.info(
        "2FA disabled for user",
        extra={"user_id": str(current_user.id)},
    )

    return {"message": "Two-factor authentication disabled"}


@router.post("/2fa/sms/send")
async def send_sms_mfa(
    current_user: User = Depends(get_current_active_user),
):
    """Send SMS verification code for MFA setup."""
    if not current_user.phone_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number not set. Update your profile first.")
    if not current_user.phone_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number not verified. Verify your phone first.")

    if current_user.last_verification_attempt:
        hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        if current_user.last_verification_attempt > hour_ago and current_user.verification_attempts >= settings.MAX_VERIFICATION_ATTEMPTS_PER_HOUR:
            logger.warning("MFA SMS send rate limit exceeded", extra={"user_id": str(current_user.id)})
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many SMS requests. Please try again later.")
        elif current_user.last_verification_attempt <= hour_ago:
            current_user.verification_attempts = 0

    twilio = TwilioService()
    code = twilio.generate_code()
    await twilio.send_verification_code(current_user.phone_number, code)

    current_user.two_factor_method = "sms"
    current_user.mfa_sms_code = code
    current_user.mfa_sms_sent_at = datetime.now(timezone.utc)
    current_user.mfa_failed_attempts = 0
    current_user.verification_attempts += 1
    current_user.last_verification_attempt = datetime.now(timezone.utc)
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

    logger.info(
        "SMS MFA code sent for user",
        extra={"user_id": str(current_user.id)},
    )

    return {"message": "Verification code sent via SMS"}


@router.post("/2fa/sms/verify")
async def verify_sms_mfa(
    data: MFACodeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify SMS code to enable SMS-based MFA."""
    if current_user.mfa_locked_until and current_user.mfa_locked_until > datetime.now(timezone.utc):
        remaining = (current_user.mfa_locked_until - datetime.now(timezone.utc)).total_seconds() / 60
        logger.warning("MFA verification attempted while locked", extra={"user_id": str(current_user.id)})
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Too many failed attempts. Try again in {int(remaining) + 1} minutes.")
    if not current_user.mfa_sms_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No SMS code pending. Call /2fa/sms/send first.")

    if current_user.mfa_sms_sent_at:
        code_age = datetime.now(timezone.utc) - current_user.mfa_sms_sent_at
        if code_age.total_seconds() > (settings.PHONE_VERIFICATION_CODE_EXPIRE_MINUTES * 60):
            current_user.mfa_sms_code = None
            current_user.mfa_sms_sent_at = None
            current_user.mfa_failed_attempts = 0
            await current_user.save()
            logger.warning("Expired SMS MFA code", extra={"user_id": str(current_user.id)})
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired. Request a new one.")

    if not hmac.compare_digest(current_user.mfa_sms_code, data.code):
        current_user.mfa_failed_attempts += 1
        if current_user.mfa_failed_attempts >= 5:
            current_user.mfa_locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            current_user.mfa_sms_code = None
            current_user.mfa_sms_sent_at = None
            await current_user.save()
            logger.warning("MFA locked", extra={"user_id": str(current_user.id), "attempts": current_user.mfa_failed_attempts})
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many failed attempts. Account locked for 15 minutes.")
        await current_user.save()
        logger.warning("Invalid SMS MFA code", extra={"user_id": str(current_user.id), "attempts": current_user.mfa_failed_attempts})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    current_user.two_factor_enabled = True
    current_user.mfa_sms_code = None
    current_user.mfa_sms_sent_at = None
    current_user.mfa_failed_attempts = 0
    current_user.mfa_locked_until = None
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

    logger.info(
        "SMS 2FA enabled for user",
        extra={"user_id": str(current_user.id)},
    )

    return {"message": "SMS two-factor authentication enabled successfully"}
