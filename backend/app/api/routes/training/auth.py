"""Training platform authentication routes."""
import base64
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.security import get_password_hash, verify_password
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingConfig, TrainingUser
from app.api.routes.training.dependencies import (
    create_training_token, create_training_refresh_token,
    validate_refresh_token,
    get_current_training_user, require_training_admin,
)
from app.services.olorin.partner_service import partner_service
from app.services.training.sample_content import seed_sample_content
from starlette.requests import Request
from app.core.rate_limiter import limiter, RATE_LIMITS

logger = logging.getLogger(__name__)

TRIAL_DURATION_DAYS, TRIAL_CREDIT_LIMIT, TRIAL_SEAT_LIMIT = 14, 50, 25

router = APIRouter(prefix="/auth", tags=["training-auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    org_name: str = Field(min_length=2, max_length=100)
    display_name: str = Field(min_length=1, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class InviteRequest(BaseModel):
    emails: list[EmailStr] = Field(min_length=1, max_length=50)
    role: str = Field(default="viewer", pattern=r"^(admin|viewer)$")
    department: str | None = None

class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)

class GoogleOAuthRequest(BaseModel):
    id_token: str
    mode: str = Field(default="login", pattern=r"^(login|register)$")
    org_name: str | None = Field(default=None, min_length=2, max_length=100)
    display_name: str | None = Field(default=None, max_length=100)

class AppleOAuthRequest(BaseModel):
    identity_token: str
    full_name: str | None = None
    email: str | None = None
    mode: str = Field(default="login", pattern=r"^(login|register)$")
    org_name: str | None = Field(default=None, min_length=2, max_length=100)
    display_name: str | None = Field(default=None, max_length=100)

class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS.get("register", "3/hour"))
async def register(request: Request, body: RegisterRequest):
    """Register a new training organization and admin user."""
    slug = body.org_name.lower().replace(" ", "-")[:30]
    partner_id = f"training-{slug}-{secrets.token_hex(4)}"

    partner, _api_key = await partner_service.create_partner(
        partner_id=partner_id,
        name=body.org_name,
        name_en=body.org_name,
        contact_email=body.email,
        billing_tier="training",
        capabilities=["video_ingest", "pause_ask", "subtitles", "trivia"],
    )

    training_config = TrainingConfig(
        org_display_name=body.org_name,
        org_tier="trial",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DURATION_DAYS),
        credit_limit_monthly=TRIAL_CREDIT_LIMIT,
        seat_limit=TRIAL_SEAT_LIMIT,
    )
    partner.training_config = training_config  # type: ignore[attr-defined]
    partner.capabilities = partner_service.get_training_tier_defaults()
    await partner.save()
    await seed_sample_content(partner_id, partner)

    user = TrainingUser(
        email=body.email,
        password_hash=get_password_hash(body.password),
        partner_id=partner_id,
        role="admin",
        display_name=body.display_name,
        status="active",
        activated_at=datetime.now(timezone.utc),
    )
    await user.insert()
    logger.info("Training org registered: %s", partner_id)
    token = create_training_token(user)
    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
        "organization": {
            "partner_id": partner_id, "org_name": body.org_name,
            "tier": training_config.org_tier,
            "credits_remaining": training_config.credit_limit_monthly,
            "trial_ends_at": (
                training_config.trial_ends_at.isoformat()
                if training_config.trial_ends_at else None
            ),
            "stripe_subscription_id": None,
        },
    }

@router.post("/login")
@limiter.limit(RATE_LIMITS.get("login", "5/minute"))
async def login(request: Request, body: LoginRequest):
    """Login an existing training user."""
    user = await TrainingUser.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    user.last_login_at = datetime.now(timezone.utc)
    await user.save()
    token = create_training_token(user)
    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
    }

@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_employees(
    body: InviteRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Invite employees to the training organization."""
    invited = []
    for email in body.emails:
        existing = await TrainingUser.find_one(
            {"email": email, "partner_id": admin.partner_id}
        )
        if existing:
            invited.append({"email": email, "status": "already_exists"})
            continue

        invite_token = secrets.token_urlsafe(32)
        user = TrainingUser(
            email=email,
            password_hash="pending",
            partner_id=admin.partner_id,
            role=body.role,
            display_name=email.split("@")[0],
            department=body.department,
            status="pending",
            invited_by=str(admin.id),
            invite_token=invite_token,
            invited_at=datetime.now(timezone.utc),
        )
        await user.insert()
        invited.append({"email": email, "status": "pending"})
        logger.info("Training invite sent: %s -> %s", email, admin.partner_id)

    return {"invited": invited}

@router.post("/accept-invite")
async def accept_invite(body: AcceptInviteRequest):
    """Accept an invitation and set password."""
    user = await TrainingUser.find_one({"invite_token": body.token})
    if not user or user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invite token",
        )

    user.password_hash = get_password_hash(body.password)
    user.display_name = body.display_name
    user.status = "active"
    user.invite_token = None
    user.activated_at = datetime.now(timezone.utc)
    await user.save()
    token = create_training_token(user)
    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
    }


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    """Issue new access + refresh tokens from a valid refresh token."""
    user = await validate_refresh_token(body.refresh_token)
    user.last_login_at = datetime.now(timezone.utc)
    await user.save()
    return {
        "token": create_training_token(user),
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
    }


async def _oauth_login(email: str) -> dict:
    """Shared logic for OAuth login: find TrainingUser by email, issue token."""
    user = await TrainingUser.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training account found for this email. Please register first.",
        )
    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )
    user.last_login_at = datetime.now(timezone.utc)
    await user.save()
    token = create_training_token(user)
    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
    }


def _org_name_from_email(email: str) -> str:
    """Derive a default org name from email domain."""
    domain = email.split("@")[1] if "@" in email else email
    name_part = domain.split(".")[0]
    return name_part.capitalize()


async def _oauth_register(
    email: str, org_name: str | None, display_name: str
) -> tuple[dict, bool]:
    """Create a new training org via OAuth. If user exists, fall back to login."""
    existing = await TrainingUser.find_one({"email": email})
    if existing:
        return await _oauth_login(email), False

    resolved_org = org_name or _org_name_from_email(email)
    slug = resolved_org.lower().replace(" ", "-")[:30]
    partner_id = f"training-{slug}-{secrets.token_hex(4)}"

    partner, _api_key = await partner_service.create_partner(
        partner_id=partner_id,
        name=resolved_org,
        name_en=resolved_org,
        contact_email=email,
        billing_tier="training",
        capabilities=["video_ingest", "pause_ask", "subtitles", "trivia"],
    )

    training_config = TrainingConfig(
        org_display_name=resolved_org,
        org_tier="trial",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DURATION_DAYS),
        credit_limit_monthly=TRIAL_CREDIT_LIMIT,
        seat_limit=TRIAL_SEAT_LIMIT,
    )
    partner.training_config = training_config  # type: ignore[attr-defined]
    partner.capabilities = partner_service.get_training_tier_defaults()
    await partner.save()
    await seed_sample_content(partner_id, partner)

    user = TrainingUser(
        email=email,
        password_hash="!oauth",
        partner_id=partner_id,
        role="admin",
        display_name=display_name,
        status="active",
        activated_at=datetime.now(timezone.utc),
    )
    await user.insert()
    logger.info("Training org registered via OAuth: %s", partner_id)
    token = create_training_token(user)
    return {
        "token": token,
        "refresh_token": create_training_refresh_token(user),
        "user": _user_response(user),
        "organization": {
            "partner_id": partner_id,
            "org_name": resolved_org,
            "tier": training_config.org_tier,
            "credits_remaining": training_config.credit_limit_monthly,
            "trial_ends_at": (
                training_config.trial_ends_at.isoformat()
                if training_config.trial_ends_at
                else None
            ),
            "stripe_subscription_id": None,
        },
    }, True


@router.post("/google")
@limiter.limit(RATE_LIMITS.get("oauth_callback", "10/minute"))
async def login_google(request: Request, body: GoogleOAuthRequest):
    """Login or register with a Google ID token from Firebase popup."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )
    token_info = resp.json()
    email = token_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )

    if body.mode == "register":
        display = body.display_name or token_info.get("name", email.split("@")[0])
        result, is_new = await _oauth_register(email, body.org_name, display)
        from starlette.responses import JSONResponse
        return JSONResponse(
            content=result,
            status_code=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK,
        )

    result = await _oauth_login(email)
    await TrainingUser.find_one({"email": email}).update(
        {"$set": {"last_oauth_provider": "google"}}
    )
    return result


@router.post("/apple")
@limiter.limit(RATE_LIMITS.get("oauth_callback", "10/minute"))
async def login_apple(request: Request, body: AppleOAuthRequest):
    """Login or register with an Apple identity token from Firebase popup."""
    try:
        parts = body.identity_token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure")
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        claims = json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple identity token",
        )
    if claims.get("iss") != "https://appleid.apple.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )
    email = claims.get("email") or body.email
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple account has no email",
        )

    if body.mode == "register":
        display = body.display_name or body.full_name or email.split("@")[0]
        result, is_new = await _oauth_register(email, body.org_name, display)
        from starlette.responses import JSONResponse
        return JSONResponse(
            content=result,
            status_code=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK,
        )

    result = await _oauth_login(email)
    await TrainingUser.find_one({"email": email}).update(
        {"$set": {"last_oauth_provider": "apple"}}
    )
    return result


@router.get("/me")
async def get_me(
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get current training user profile."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )
    tc = (partner.training_config if partner else None) or {}
    org_name = tc.get("org_display_name", user.partner_id)
    tier = tc.get("org_tier", "team")
    cap = tc.get("credit_limit_monthly", 0)
    used = tc.get("credits_used", 0)
    trial_raw = tc.get("trial_ends_at")
    trial_str = trial_raw.isoformat() if hasattr(trial_raw, "isoformat") else trial_raw
    return {
        "user": _user_response(user),
        "organization": {
            "partner_id": user.partner_id, "org_name": org_name,
            "tier": tier, "credits_remaining": cap - used,
            "logo_url": tc.get("logo_url"),
            "accent_color": tc.get("accent_color"),
            "trial_ends_at": trial_str,
            "stripe_subscription_id": tc.get("stripe_subscription_id"),
        },
    }


def _user_response(user: TrainingUser) -> dict:
    """Format user document for API response."""
    return {
        "id": str(user.id), "email": user.email, "role": user.role,
        "display_name": user.display_name, "partner_id": user.partner_id,
        "department": user.department,
    }
