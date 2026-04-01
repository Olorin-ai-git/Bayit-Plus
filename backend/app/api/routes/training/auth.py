"""Training platform authentication routes."""
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.security import get_password_hash, verify_password
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingConfig, TrainingUser
from app.api.routes.training.dependencies import (
    create_training_token, get_current_training_user, require_training_admin,
)
from app.services.olorin.partner_service import partner_service

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


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
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
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DURATION_DAYS),
        credit_limit_monthly=TRIAL_CREDIT_LIMIT,
        seat_limit=TRIAL_SEAT_LIMIT,
    )
    partner.training_config = training_config  # type: ignore[attr-defined]
    partner.capabilities = partner_service.get_training_tier_defaults()
    await partner.save()

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
    return {"token": token, "user": _user_response(user), "organization": {
        "partner_id": partner_id, "org_name": body.org_name,
        "tier": training_config.org_tier,
        "credits_remaining": training_config.credit_limit_monthly,
    }}


@router.post("/login")
async def login(body: LoginRequest):
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
    return {"token": token, "user": _user_response(user)}


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
    return {"token": token, "user": _user_response(user)}


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
    return {
        "user": _user_response(user),
        "organization": {
            "partner_id": user.partner_id, "org_name": org_name,
            "tier": tier, "credits_remaining": cap - used,
            "logo_url": tc.get("logo_url"),
            "accent_color": tc.get("accent_color"),
        },
    }


def _user_response(user: TrainingUser) -> dict:
    """Format user document for API response."""
    return {
        "id": str(user.id), "email": user.email, "role": user.role,
        "display_name": user.display_name, "partner_id": user.partner_id,
        "department": user.department,
    }
