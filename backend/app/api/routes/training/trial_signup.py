"""Trial signup endpoints — email/password, Google OAuth, and Apple OAuth."""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import stripe
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_password_hash
from app.models.platform_config import PlatformConfig
from app.models.training_user import TrainingConfig, TrainingUser
from app.models.trial_config import TrialConfig
from app.models.trial_history import TrialHistory
from app.api.routes.training.dependencies import (
    create_training_token, create_training_refresh_token,
)
from app.api.routes.training.oauth_verify import verify_oauth_email
from app.services.olorin.partner_service import partner_service
from app.services.training.sample_content import seed_sample_content
from app.services.training import trial_emails
from app.services.training.trial_dedup import check_duplicate

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(tags=["training-auth"])


def serialize_organization_with_trial(partner) -> dict:
    """Build the Organization dict shape that the frontend Organization type expects.

    Used by /me, OAuth register, and trial signup endpoints to keep the
    response shape consistent. Crucially, this serializes trial_config
    when present so the frontend useTrialStatus hook does not falsely
    classify trial orgs as "paid" after a page reload.
    """
    tc_data = getattr(partner, "training_config", None) or {}
    if isinstance(tc_data, dict):
        org_display_name = tc_data.get("org_display_name")
        org_tier = tc_data.get("org_tier", "free")
        credit_limit = tc_data.get("credit_limit_monthly", 0)
        credits_used = tc_data.get("credits_used", 0)
        credits_remaining_field = tc_data.get("credits_remaining")
        logo_url = tc_data.get("logo_url")
        accent_color = tc_data.get("accent_color")
        stripe_subscription_id = tc_data.get("stripe_subscription_id")
        trial_config = tc_data.get("trial_config")
        trial_ends_at = tc_data.get("trial_ends_at")
    else:
        org_display_name = getattr(tc_data, "org_display_name", None)
        org_tier = getattr(tc_data, "org_tier", "free")
        credit_limit = getattr(tc_data, "credit_limit_monthly", 0)
        credits_used = getattr(tc_data, "credits_used", 0)
        credits_remaining_field = getattr(tc_data, "credits_remaining", None)
        logo_url = getattr(tc_data, "logo_url", None)
        accent_color = getattr(tc_data, "accent_color", None)
        stripe_subscription_id = getattr(tc_data, "stripe_subscription_id", None)
        trial_config = getattr(tc_data, "trial_config", None)
        trial_ends_at = getattr(tc_data, "trial_ends_at", None)
        if trial_config is not None and hasattr(trial_config, "model_dump"):
            trial_config = trial_config.model_dump(mode="json")

    if isinstance(trial_config, TrialConfig):
        trial_config = trial_config.model_dump(mode="json")

    if credits_remaining_field is None:
        credits_remaining = max(credit_limit - credits_used, 0)
    else:
        credits_remaining = credits_remaining_field

    if hasattr(trial_ends_at, "isoformat"):
        trial_ends_at_str = trial_ends_at.isoformat()
    else:
        trial_ends_at_str = trial_ends_at

    partner_id = (
        getattr(partner, "partner_id", None)
        or (str(partner.id) if hasattr(partner, "id") else "")
    )
    org_name = org_display_name or getattr(partner, "name", "") or ""

    return {
        "partner_id": partner_id,
        "org_name": org_name,
        "tier": org_tier,
        "credits_remaining": credits_remaining,
        "logo_url": logo_url,
        "accent_color": accent_color,
        "trial_ends_at": trial_ends_at_str,
        "stripe_subscription_id": stripe_subscription_id,
        "trial_config": trial_config,
    }


class SignupTrialRequest(BaseModel):
    email: EmailStr
    password: str | None = None
    id_token: str | None = None
    org_name: str = Field(min_length=2, max_length=100)
    selected_tier: Literal["team", "organization", "enterprise"]
    stripe_payment_method_id: str


class OAuthTrialRequest(BaseModel):
    id_token: str
    org_name: str = Field(min_length=2, max_length=100)
    selected_tier: Literal["team", "organization", "enterprise"]
    stripe_payment_method_id: str


def _get_card_fingerprint(pm_id: str) -> str | None:
    """Retrieve card fingerprint from Stripe PaymentMethod."""
    try:
        pm = stripe.PaymentMethod.retrieve(pm_id)
        return pm.card.fingerprint if hasattr(pm, "card") and pm.card else None
    except stripe.error.StripeError as exc:
        logger.error("Stripe PM retrieve failed: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid payment method")


def _create_stripe_customer_and_sub(
    email: str, org_name: str, pm_id: str, tier: str,
    partner_id: str, price_id: str, trial_days: int,
) -> tuple[str, str]:
    """Create Stripe customer with PM, then subscription. Returns (cust_id, sub_id)."""
    try:
        customer = stripe.Customer.create(
            email=email, name=org_name, metadata={"partner_id": partner_id},
        )
        stripe.PaymentMethod.attach(pm_id, customer=customer.id)
        stripe.Customer.modify(customer.id, invoice_settings={"default_payment_method": pm_id})
    except stripe.error.StripeError as exc:
        logger.error("Stripe customer setup failed: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Payment setup failed")
    try:
        sub = stripe.Subscription.create(
            customer=customer.id, items=[{"price": price_id}],
            trial_period_days=trial_days,
            metadata={"partner_id": partner_id, "tier": tier},
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe subscription creation failed: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Subscription creation failed")
    return customer.id, sub.id


async def _signup_trial_internal(
    email: str, password: str | None, org_name: str,
    selected_tier: str, stripe_payment_method_id: str,
) -> dict:
    """Core trial signup logic shared by email/password and OAuth endpoints."""
    if await TrainingUser.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")
    domain = email.rsplit("@", 1)[-1].lower()
    fp = _get_card_fingerprint(stripe_payment_method_id)
    if await check_duplicate(email=email, domain=domain, fp=fp):
        await trial_emails.send_retrial_blocked(email)
        raise HTTPException(status.HTTP_409_CONFLICT, detail="A trial has already been used for this account or organization")

    cfg = await PlatformConfig.get_singleton()
    td = cfg.trial_defaults
    plan = next((p for p in cfg.subscription_plans if p.id == selected_tier), None)
    price_id = plan.stripe_price_id_monthly if plan else ""
    if not price_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"No pricing configured for tier: {selected_tier}")

    slug = org_name.lower().replace(" ", "-")[:30]
    partner_id = f"training-{slug}-{secrets.token_hex(4)}"
    cust_id, sub_id = _create_stripe_customer_and_sub(
        email, org_name, stripe_payment_method_id, selected_tier,
        partner_id, price_id, td.duration_days,
    )
    now = datetime.now(timezone.utc)
    trial_config = TrialConfig(
        state="active", started_at=now,
        expires_at=now + timedelta(days=td.duration_days),
        selected_tier=selected_tier,
        stripe_customer_id=cust_id, stripe_subscription_id=sub_id,
        eval_credits_remaining=td.eval_credits,
        byoc_uploads_remaining=td.byoc_uploads,
        xapi_exports_remaining=td.xapi_exports,
        assignments_remaining=td.assignments,
        branding_uploads_remaining=td.branding_uploads,
    )
    training_config = TrainingConfig(
        org_display_name=org_name, org_tier="trial",
        trial_ends_at=trial_config.expires_at,
        credit_limit_monthly=td.eval_credits,
        seat_limit=cfg.seat_limits.get(selected_tier, 25),
        stripe_customer_id=cust_id, stripe_subscription_id=sub_id,
        trial_config=trial_config,
    )

    partner, _api_key = await partner_service.create_partner(
        partner_id=partner_id, name=org_name, name_en=org_name,
        contact_email=email, billing_tier="training",
        capabilities=["video_ingest", "pause_ask", "subtitles", "trivia"],
    )
    partner.training_config = training_config.model_dump(mode="json")
    partner.capabilities = partner_service.get_training_tier_defaults()
    await partner.save()
    await seed_sample_content(partner_id, partner)

    await TrialHistory(
        email=email, email_domain=domain, card_fingerprint=fp,
        partner_id=partner_id, started_at=now,
    ).insert()

    pw_hash = get_password_hash(password) if password else "!oauth"
    user = TrainingUser(
        email=email, password_hash=pw_hash, partner_id=partner_id,
        role="admin", display_name=email.split("@")[0],
        status="active", email_verified=True, activated_at=now,
    )
    await user.insert()
    logger.info("Trial signup: partner=%s tier=%s", partner_id, selected_tier)
    await trial_emails.send_trial_welcome(
        partner.id, email, org_name,
        trial_config.expires_at.strftime("%B %d, %Y"),
    )

    return {
        "access_token": create_training_token(user),
        "refresh_token": create_training_refresh_token(user),
        "user": {
            "id": str(user.id), "email": user.email, "role": user.role,
            "display_name": user.display_name, "partner_id": user.partner_id,
        },
        "organization": serialize_organization_with_trial(partner),
    }


@router.post("/signup-with-trial", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS.get("register", "3/hour"))
async def signup_with_trial(request: Request, body: SignupTrialRequest):
    if not body.password and not body.id_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Either password or id_token is required")
    return await _signup_trial_internal(
        email=body.email, password=body.password, org_name=body.org_name,
        selected_tier=body.selected_tier, stripe_payment_method_id=body.stripe_payment_method_id,
    )

@router.post("/signup-with-google-trial", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS.get("register", "3/hour"))
async def signup_google_trial(request: Request, body: OAuthTrialRequest):
    email = await verify_oauth_email("google", body.id_token)
    return await _signup_trial_internal(
        email=email, password=None, org_name=body.org_name,
        selected_tier=body.selected_tier, stripe_payment_method_id=body.stripe_payment_method_id,
    )

@router.post("/signup-with-apple-trial", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS.get("register", "3/hour"))
async def signup_apple_trial(request: Request, body: OAuthTrialRequest):
    email = await verify_oauth_email("apple", body.id_token)
    return await _signup_trial_internal(
        email=email, password=None, org_name=body.org_name,
        selected_tier=body.selected_tier, stripe_payment_method_id=body.stripe_payment_method_id,
    )
