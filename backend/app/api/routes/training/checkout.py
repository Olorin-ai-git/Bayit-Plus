"""Training platform Stripe checkout routes (GTM-04)."""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.api.routes.training.dependencies import require_training_admin
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/checkout", tags=["training-checkout"])

TIER_PRICE_MAP: dict[str, str] = {
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

    price_id = TIER_PRICE_MAP.get(body.tier)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price not configured for tier",
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
            detail="Failed to create checkout session",
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

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(event["data"]["object"])
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event["data"]["object"])
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_payment_failed(event["data"]["object"])
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(event["data"]["object"])
        else:
            logger.info("Unhandled training webhook event: %s", event_type)
    except Exception:
        logger.exception("Training webhook processing error for %s", event_type)

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
    }})
    logger.info("Training tier upgraded: %s -> %s", partner_id, tier)


async def _handle_subscription_deleted(subscription: dict) -> None:
    """Revert to team tier on subscription cancellation."""
    partner_id = subscription.get("metadata", {}).get("partner_id")
    if not partner_id:
        logger.warning("Subscription deleted without partner_id metadata")
        return

    await IntegrationPartner.find_one(
        {"partner_id": partner_id}
    ).update({"$set": {
        "training_config.org_tier": "team",
        "training_config.stripe_subscription_id": None,
        "training_config.credit_limit_monthly": 500,
    }})
    logger.info("Training subscription cancelled: %s", partner_id)


async def _handle_invoice_payment_failed(invoice: dict) -> None:
    """Mark org as past-due when invoice payment fails."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    partner = await IntegrationPartner.find_one(
        {"training_config.stripe_subscription_id": sub_id}
    )
    if not partner:
        logger.warning("Invoice payment failed for unknown subscription: %s", sub_id)
        return
    await IntegrationPartner.find_one(
        {"partner_id": partner.partner_id}
    ).update({"$set": {"training_config.payment_status": "past_due"}})
    logger.warning("Payment failed for %s, marked past_due", partner.partner_id)


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
