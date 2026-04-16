"""Training platform Stripe checkout routes (GTM-04)."""

import logging
from typing import Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.models.platform_config import PlatformConfig
from app.api.routes.training.dependencies import (
    _parse_trial_config,
    require_training_admin,
)
from app.api.routes.olorin.webhooks import send_webhook_event
from app.api.routes.training.trial_webhooks import (
    handle_invoice_paid,
    handle_invoice_payment_failed,
    handle_subscription_deleted,
    handle_trial_will_end,
)
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/checkout", tags=["training-checkout"])

_SETTINGS_PRICE_FALLBACK: dict[str, str] = {
    "team": settings.STRIPE_PRICE_TRAINING_TEAM,
    "organization": settings.STRIPE_PRICE_TRAINING_ORG,
}

TIER_CREDITS_MAP: dict[str, int] = {
    "team": 500,
    "organization": 2000,
}


class CheckoutRequest(BaseModel):
    """Request body for checkout session creation."""

    tier: str = Field(pattern=r"^(team|organization)$")
    billing_period: str = Field(default="monthly", pattern=r"^(monthly|annual)$")


@router.post("/create-session")
async def create_checkout_session(
    body: CheckoutRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Create a Stripe Checkout session for a training tier upgrade."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = partner.training_config or {}

    if not tc.get("stripe_customer_id"):
        try:
            customer = stripe.Customer.create(
                email=admin.email,
                name=tc.get("org_display_name", admin.partner_id),
                metadata={"partner_id": admin.partner_id},
            )
        except stripe.error.StripeError as exc:
            logger.error("Stripe customer creation failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create payment customer",
            )
        tc["stripe_customer_id"] = customer.id
        partner.training_config = tc
        await partner.save()

    cfg = await PlatformConfig.get_singleton()
    plan = next((p for p in cfg.subscription_plans if p.id == body.tier), None)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown tier: {body.tier}",
        )

    price_id = (
        plan.stripe_price_id_monthly
        if body.billing_period == "monthly"
        else plan.stripe_price_id_annual
    )
    if not price_id:
        price_id = _SETTINGS_PRICE_FALLBACK.get(body.tier, "")
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No Stripe Price ID configured for tier: {body.tier}",
        )

    try:
        checkout_session = stripe.checkout.Session.create(
            customer=tc["stripe_customer_id"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=(
                f"{settings.TRAINING_FRONTEND_URL}"
                f"/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
            ),
            cancel_url=f"{settings.TRAINING_FRONTEND_URL}/checkout/cancel",
            subscription_data={
                "metadata": {
                    "partner_id": admin.partner_id,
                    "tier": body.tier,
                },
            },
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe session creation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        )

    return {"checkout_url": checkout_session.url}


@router.post("/webhook")
async def training_stripe_webhook(request: Request):
    """Handle Stripe webhook events for training subscriptions."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET_TRAINING
        )
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        logger.warning("Webhook signature verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    event_type = event["type"]
    logger.info("Training webhook received: %s", event_type)

    # Exceptions from RECOGNIZED handlers must propagate so FastAPI returns
    # 500 and Stripe retries the event. Swallowing them here was silently
    # losing webhook events with no replay path.
    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"])
    elif event_type == "invoice.paid":
        await handle_invoice_paid(event)
        await _handle_invoice_paid(event["data"]["object"])
    elif event_type == "invoice.payment_failed":
        await handle_invoice_payment_failed(event)
    elif event_type == "customer.subscription.trial_will_end":
        await handle_trial_will_end(event)
    elif event_type == "customer.subscription.deleted":
        await handle_subscription_deleted(event)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(event["data"]["object"])
    else:
        logger.info("Unhandled training webhook event: %s", event_type)

    return {"received": True}


async def _handle_checkout_completed(session: dict) -> None:
    """Upgrade org tier after successful checkout."""
    metadata = session.get("metadata", {})
    partner_id = metadata.get("partner_id")
    tier = metadata.get("tier")
    if not partner_id or not tier:
        logger.warning("Checkout session missing metadata: %s", session.get("id"))
        return

    credits = TIER_CREDITS_MAP.get(tier, 500)
    await IntegrationPartner.find_one(
        {"partner_id": partner_id}
    ).update({"$set": {
        "training_config.org_tier": tier,
        "training_config.stripe_subscription_id": session.get("subscription"),
        "training_config.trial_ends_at": None,
        "training_config.credit_limit_monthly": credits,
        "training_config.credits_used": 0,
        "training_config.credits_remaining": credits,
    }})
    logger.info("Training tier upgraded: %s -> %s", partner_id, tier)
    partner = await IntegrationPartner.find_one({"partner_id": partner_id})
    if partner:
        await send_webhook_event(partner, "training.tier_upgraded", {
            "partner_id": partner_id,
            "tier": tier,
            "credits": credits,
        })


async def _handle_subscription_updated(subscription: dict) -> None:
    """Sync tier/credits when subscription changes externally."""
    partner_id = subscription.get("metadata", {}).get("partner_id")
    if not partner_id:
        return
    tier = subscription.get("metadata", {}).get("tier")
    if not tier or tier not in TIER_CREDITS_MAP:
        return
    credits = TIER_CREDITS_MAP[tier]
    status_val = subscription.get("status", "active")
    update_fields: dict = {
        "training_config.org_tier": tier,
        "training_config.credit_limit_monthly": credits,
    }
    if status_val == "active":
        update_fields["training_config.payment_status"] = "current"
    await IntegrationPartner.find_one(
        {"partner_id": partner_id}
    ).update({"$set": update_fields})
    logger.info(
        "Subscription updated for %s: tier=%s status=%s", partner_id, tier, status_val
    )


async def _handle_invoice_paid(invoice: dict) -> None:
    """Reset monthly credits on successful subscription payment."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return

    partner = await IntegrationPartner.find_one(
        {"training_config.stripe_subscription_id": sub_id}
    )
    if not partner:
        logger.warning("invoice.paid: no partner for subscription %s", sub_id)
        return

    tc = partner.training_config or {}
    limit = tc.get("credit_limit_monthly", TIER_CREDITS_MAP.get("team", 500))

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.credits_used": 0,
            "training_config.credits_remaining": limit,
            "training_config.payment_status": "current",
        }},
    )
    logger.info(
        "Monthly credits reset: partner=%s limit=%d",
        partner.partner_id, limit,
    )


# ── Task 17: Change selected tier mid-trial ──────────────────────────────────


class ChangeTierRequest(BaseModel):
    """Request body for switching selected tier during trial."""

    selected_tier: Literal["team", "organization", "enterprise"]


@router.post("/change-selected-tier")
async def change_selected_tier(
    req: ChangeTierRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Switch the selected post-trial tier while still trialing.

    Updates both the Stripe subscription price and the persisted
    TrialConfig.selected_tier so conversion (invoice.paid) picks
    up the new tier.
    """
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = _parse_trial_config(partner)
    if tc is None or tc.state not in ("active", "grace"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only change tier during active trial",
        )

    pc = await PlatformConfig.get_singleton()
    new_price = next(
        (
            p.stripe_price_id_monthly
            for p in pc.subscription_plans
            if p.id == req.selected_tier
        ),
        None,
    )
    if not new_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No price configured for tier {req.selected_tier}",
        )

    sub = stripe.Subscription.retrieve(tc.stripe_subscription_id)
    stripe.Subscription.modify(
        tc.stripe_subscription_id,
        items=[{
            "id": sub["items"]["data"][0].id,
            "price": new_price,
        }],
        proration_behavior="none",
        metadata={"selected_tier": req.selected_tier},
    )

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.selected_tier": req.selected_tier,
        }},
    )
    logger.info(
        "Trial tier changed: partner=%s -> %s",
        admin.partner_id, req.selected_tier,
    )
    return {"selected_tier": req.selected_tier}


@router.post("/convert-now")
async def convert_now_endpoint(
    admin: TrainingUser = Depends(require_training_admin),
):
    """Immediately end trial and trigger Stripe conversion (charges card now)."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = _parse_trial_config(partner)
    if tc is None or tc.state not in ("active", "grace"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active trial to convert",
        )

    try:
        stripe.Subscription.modify(tc.stripe_subscription_id, trial_end="now")
    except stripe.error.StripeError as exc:
        logger.error("Convert-now Stripe modify failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        )

    logger.info(
        "Trial convert-now triggered: partner=%s sub=%s",
        admin.partner_id, tc.stripe_subscription_id,
    )
    return {"status": "conversion_initiated"}
