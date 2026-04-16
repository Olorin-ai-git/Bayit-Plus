"""Trial signup endpoint — replaces /auth/register for Stripe-backed trials.

Creates Stripe customer+subscription, IntegrationPartner with TrialConfig,
TrialHistory for dedup, and admin TrainingUser in one atomic flow.
"""

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
from app.services.olorin.partner_service import partner_service
from app.services.training.sample_content import seed_sample_content
from app.services.training.trial_dedup import check_duplicate

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(tags=["training-auth"])


class SignupTrialRequest(BaseModel):
    email: EmailStr
    password: str | None = None
    id_token: str | None = None
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
    req: SignupTrialRequest, partner_id: str, price_id: str, trial_days: int,
) -> tuple[str, str]:
    """Create Stripe customer with PM, then subscription. Returns (cust_id, sub_id)."""
    try:
        customer = stripe.Customer.create(
            email=req.email, name=req.org_name,
            metadata={"partner_id": partner_id},
        )
        stripe.PaymentMethod.attach(req.stripe_payment_method_id, customer=customer.id)
        stripe.Customer.modify(customer.id, invoice_settings={
            "default_payment_method": req.stripe_payment_method_id,
        })
    except stripe.error.StripeError as exc:
        logger.error("Stripe customer setup failed: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Payment setup failed")

    try:
        sub = stripe.Subscription.create(
            customer=customer.id, items=[{"price": price_id}],
            trial_period_days=trial_days,
            metadata={"partner_id": partner_id, "tier": req.selected_tier},
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe subscription creation failed: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Subscription creation failed")

    return customer.id, sub.id


@router.post("/signup-with-trial", status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS.get("register", "3/hour"))
async def signup_with_trial(request: Request, body: SignupTrialRequest):
    """Register a new training org with a Stripe-backed trial."""
    if not body.password and not body.id_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Either password or id_token is required")

    existing = await TrainingUser.find_one({"email": body.email})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")

    domain = body.email.rsplit("@", 1)[-1].lower()
    fp = _get_card_fingerprint(body.stripe_payment_method_id)

    if await check_duplicate(email=body.email, domain=domain, fp=fp):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="A trial has already been used for this account or organization")

    cfg = await PlatformConfig.get_singleton()
    td = cfg.trial_defaults
    plan = next((p for p in cfg.subscription_plans if p.id == body.selected_tier), None)
    price_id = plan.stripe_price_id_monthly if plan else ""
    if not price_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"No pricing configured for tier: {body.selected_tier}")

    slug = body.org_name.lower().replace(" ", "-")[:30]
    partner_id = f"training-{slug}-{secrets.token_hex(4)}"

    cust_id, sub_id = _create_stripe_customer_and_sub(body, partner_id, price_id, td.duration_days)

    now = datetime.now(timezone.utc)
    trial_config = TrialConfig(
        state="active", started_at=now,
        expires_at=now + timedelta(days=td.duration_days),
        selected_tier=body.selected_tier,
        stripe_customer_id=cust_id, stripe_subscription_id=sub_id,
        eval_credits_remaining=td.eval_credits,
        byoc_uploads_remaining=td.byoc_uploads,
        xapi_exports_remaining=td.xapi_exports,
        assignments_remaining=td.assignments,
        branding_uploads_remaining=td.branding_uploads,
    )
    training_config = TrainingConfig(
        org_display_name=body.org_name, org_tier="trial",
        trial_ends_at=trial_config.expires_at,
        credit_limit_monthly=td.eval_credits,
        seat_limit=cfg.seat_limits.get(body.selected_tier, 25),
        stripe_customer_id=cust_id, stripe_subscription_id=sub_id,
        trial_config=trial_config,
    )

    partner, _api_key = await partner_service.create_partner(
        partner_id=partner_id, name=body.org_name, name_en=body.org_name,
        contact_email=body.email, billing_tier="training",
        capabilities=["video_ingest", "pause_ask", "subtitles", "trivia"],
    )
    partner.training_config = training_config.model_dump(mode="json")
    partner.capabilities = partner_service.get_training_tier_defaults()
    await partner.save()
    await seed_sample_content(partner_id, partner)

    await TrialHistory(
        email=body.email, email_domain=domain, card_fingerprint=fp,
        partner_id=partner_id, started_at=now,
    ).insert()

    pw_hash = get_password_hash(body.password) if body.password else "!oauth"
    user = TrainingUser(
        email=body.email, password_hash=pw_hash, partner_id=partner_id,
        role="admin", display_name=body.email.split("@")[0],
        status="active", email_verified=True, activated_at=now,
    )
    await user.insert()
    logger.info("Trial signup: partner=%s tier=%s", partner_id, body.selected_tier)

    return {
        "access_token": create_training_token(user),
        "refresh_token": create_training_refresh_token(user),
        "user": {
            "id": str(user.id), "email": user.email, "role": user.role,
            "display_name": user.display_name, "partner_id": user.partner_id,
        },
        "organization": {
            "partner_id": partner_id, "name": body.org_name, "tier": "trial",
            "trial_config": trial_config.model_dump(mode="json"),
        },
    }
