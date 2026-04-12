"""Training email verification endpoints."""

import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from starlette.requests import Request

from app.core.rate_limiter import limiter, RATE_LIMITS
from app.models.training_user import TrainingUser
from app.models.verification import VerificationToken
from app.services.bayit_email_service import get_bayit_email_service
from app.services.email_templates import get_template_renderer
from app.api.routes.training.dependencies import (
    create_training_token,
    create_training_refresh_token,
)
from app.models.integration_partner import IntegrationPartner

logger = logging.getLogger(__name__)

VERIFICATION_CODE_EXPIRE_MINUTES = 10
MAX_RESEND_PER_HOUR = 3
MAX_CODE_ATTEMPTS = 5

router = APIRouter(prefix="/auth", tags=["training-auth"])


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(
        min_length=6, max_length=6, pattern=r"^\d{6}$"
    )


class ResendCodeRequest(BaseModel):
    email: EmailStr


def _generate_code() -> str:
    """Generate a cryptographically secure 6-digit numeric code."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def send_verification_code(
    user: TrainingUser, org_name: str,
) -> None:
    """Generate, store, and email a 6-digit code."""
    # Rate limit check
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = await VerificationToken.find(
        {"user_id": str(user.id), "type": "training_email_verify"},
        VerificationToken.created_at >= one_hour_ago,
    ).count()
    if recent >= MAX_RESEND_PER_HOUR:
        raise ValueError("Too many verification requests. Please wait.")

    # Invalidate existing codes
    existing = await VerificationToken.find(
        {"user_id": str(user.id), "type": "training_email_verify", "used": False}
    ).to_list()
    for token in existing:
        token.used = True
        token.used_at = datetime.now(timezone.utc)
        await token.save()

    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=VERIFICATION_CODE_EXPIRE_MINUTES
    )

    token_doc = VerificationToken(
        user_id=str(user.id),
        token=code,
        type="training_email_verify",
        contact=user.email,
        expires_at=expires_at,
    )
    await token_doc.insert()

    renderer = get_template_renderer()
    html_content = renderer.render(
        "training_email_verification.html",
        {
            "display_name": user.display_name,
            "org_name": org_name,
            "code": code,
            "expire_minutes": VERIFICATION_CODE_EXPIRE_MINUTES,
            "current_year": datetime.now(timezone.utc).year,
        },
    )
    email_svc = get_bayit_email_service()
    await email_svc.send_generic_email(
        to_emails=[user.email],
        subject=f"Your Olorin Training verification code: {code}",
        html_content=html_content,
    )
    logger.info("Training verification code sent: %s", user.email)


def _user_response(user: TrainingUser) -> dict:
    """Format user document for API response."""
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "display_name": user.display_name,
        "partner_id": user.partner_id,
        "department": user.department,
    }


@router.post("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, body: VerifyEmailRequest):
    """Verify email with 6-digit code and issue tokens."""
    user = await TrainingUser.find_one({"email": body.email})
    if not user or user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification failed. Please request a new code.",
        )

    token_doc = await VerificationToken.find_one(
        {
            "user_id": str(user.id),
            "type": "training_email_verify",
            "used": False,
        }
    )

    if not token_doc or not token_doc.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Please request a new one.",
        )

    attempts = getattr(token_doc, "attempts", 0)
    if attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if not hmac.compare_digest(token_doc.token, body.code):
        await VerificationToken.find_one({"_id": token_doc.id}).update(
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code",
        )

    # Code matches — mark verified
    token_doc.used = True
    token_doc.used_at = datetime.now(timezone.utc)
    await token_doc.save()

    user.email_verified = True
    user.status = "active"
    user.activated_at = datetime.now(timezone.utc)
    await user.save()

    logger.info("Training email verified: %s", user.email)

    token = create_training_token(user)
    partner = await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )
    tc = (partner.training_config if partner else None) or {}
    org_name = (
        tc.get("org_display_name", user.partner_id)
        if isinstance(tc, dict)
        else getattr(tc, "org_display_name", user.partner_id)
    )
    tier = (
        tc.get("org_tier", "team")
        if isinstance(tc, dict)
        else getattr(tc, "org_tier", "team")
    )
    cap = (
        tc.get("credit_limit_monthly", 0)
        if isinstance(tc, dict)
        else getattr(tc, "credit_limit_monthly", 0)
    )
    trial_raw = (
        tc.get("trial_ends_at")
        if isinstance(tc, dict)
        else getattr(tc, "trial_ends_at", None)
    )
    trial_str = (
        trial_raw.isoformat()
        if hasattr(trial_raw, "isoformat")
        else trial_raw
    )

    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
        "organization": {
            "partner_id": user.partner_id,
            "org_name": org_name,
            "tier": tier,
            "credits_remaining": cap,
            "trial_ends_at": trial_str,
            "stripe_subscription_id": (
                tc.get("stripe_subscription_id")
                if isinstance(tc, dict)
                else getattr(tc, "stripe_subscription_id", None)
            ),
        },
    }


@router.post("/resend-code", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/hour")
async def resend_code(request: Request, body: ResendCodeRequest):
    """Resend 6-digit verification code."""
    user = await TrainingUser.find_one({"email": body.email})
    if not user:
        return  # Silent to prevent enumeration

    if user.email_verified:
        return  # Already verified

    partner = await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )
    tc = (partner.training_config if partner else None) or {}
    org_name = (
        tc.get("org_display_name", "Olorin Training")
        if isinstance(tc, dict)
        else getattr(tc, "org_display_name", "Olorin Training")
    )

    try:
        await send_verification_code(user, org_name)
    except ValueError:
        pass  # Rate limit — silent to prevent enumeration
