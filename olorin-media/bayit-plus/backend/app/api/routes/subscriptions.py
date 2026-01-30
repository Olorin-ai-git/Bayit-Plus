from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.subscription import SUBSCRIPTION_PLANS, Subscription
from app.models.user import User
from app.models.webhook_event import WebhookEvent
from app.services.payment.webhook_handler_service import WebhookHandlerService

logger = get_logger(__name__)
router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutRequest(BaseModel):
    plan_id: str
    billing_period: str = "monthly"  # monthly or yearly


@router.get("/plans")
async def get_plans():
    """Get available subscription plans."""
    return {
        "plans": [
            {
                "id": plan.id,
                "name": plan.name,
                "price": plan.price,
                "priceYearly": plan.price_yearly,
                "features": plan.features,
                "maxStreams": plan.max_streams,
                "quality": plan.quality,
                "includesLive": plan.includes_live,
                "includesAI": plan.includes_ai,
                "includesDownloads": plan.includes_downloads,
            }
            for plan in SUBSCRIPTION_PLANS.values()
        ]
    }


@router.get("/current")
async def get_current_subscription(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's subscription."""
    if not current_user.subscription_id:
        return {"subscription": None}

    subscription = await Subscription.get(current_user.subscription_id)
    if not subscription:
        return {"subscription": None}

    plan = SUBSCRIPTION_PLANS.get(subscription.plan_id)

    return {
        "subscription": {
            "id": str(subscription.id),
            "plan": plan.name if plan else subscription.plan_id,
            "status": subscription.status,
            "billingPeriod": subscription.billing_period,
            "currentPeriodEnd": (
                subscription.current_period_end.isoformat()
                if subscription.current_period_end
                else None
            ),
            "cancelAtPeriodEnd": subscription.cancel_at_period_end,
            "price": f"${plan.price}/month" if plan else None,
        }
    }


@router.post("/checkout")
async def create_checkout(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Create a Stripe checkout session - requires verification."""
    # Admins cannot checkout (they have free premium)
    if current_user.is_admin_role():
        raise HTTPException(
            status_code=400, detail="Admin users have complimentary premium access"
        )

    # Regular users need verification
    if not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "verification_required",
                "message": "Please verify your email and phone before subscribing",
                "email_verified": current_user.email_verified,
                "phone_verified": current_user.phone_verified,
            },
        )

    if request.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Get or create Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        await current_user.save()

    # Get price ID based on plan and billing period
    price_map = {
        "basic": settings.STRIPE_PRICE_BASIC,
        "premium": settings.STRIPE_PRICE_PREMIUM,
        "family": settings.STRIPE_PRICE_FAMILY,
    }
    price_id = price_map.get(request.plan_id)

    if not price_id:
        raise HTTPException(status_code=400, detail="Price not configured")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.BACKEND_CORS_ORIGINS[0]}/subscribe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.BACKEND_CORS_ORIGINS[0]}/subscribe",
            subscription_data={
                "trial_period_days": 7,
                "metadata": {
                    "user_id": str(current_user.id),
                    "plan_id": request.plan_id,
                },
            },
        )
        return {"checkoutUrl": checkout_session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_active_user),
):
    """Cancel subscription at end of billing period."""
    if not current_user.subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    subscription = await Subscription.get(current_user.subscription_id)
    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="Subscription not found")

    try:
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        subscription.cancel_at_period_end = True
        await subscription.save()
        return {
            "message": "Subscription will be canceled at the end of the billing period"
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks with idempotency protection.

    Security Features:
        - Signature verification (prevents spoofing)
        - Idempotency checking (prevents replay attacks)
        - Structured logging (audit trail)
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]
    event_type = event["type"]

    logger.info(
        "Received webhook",
        extra={
            "event_id": event_id,
            "event_type": event_type,
        }
    )

    # Check idempotency - prevent duplicate processing
    if await WebhookEvent.is_processed(event_id):
        logger.info(
            "Webhook already processed (idempotent)",
            extra={"event_id": event_id}
        )
        return {"status": "already_processed"}

    # Mark as processed before handling
    await WebhookEvent.mark_processed(event_id, event_type)

    # Initialize webhook handler service
    webhook_service = WebhookHandlerService()

    # Handle the event
    try:
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            # NEW: Use WebhookHandlerService (handles payment_pending flow)
            await webhook_service.handle_checkout_completed(session)
            # LEGACY: Also call old handler for backward compatibility
            await handle_checkout_completed(session)

        elif event_type == "customer.subscription.updated":
            subscription = event["data"]["object"]
            await webhook_service.handle_subscription_updated(subscription)
            await handle_subscription_updated(subscription)

        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            await webhook_service.handle_subscription_deleted(subscription)
            await handle_subscription_deleted(subscription)

        logger.info(
            "Webhook processed successfully",
            extra={
                "event_id": event_id,
                "event_type": event_type,
            }
        )

    except Exception as e:
        logger.error(
            "Webhook processing failed",
            extra={
                "event_id": event_id,
                "event_type": event_type,
                "error": str(e),
            }
        )
        # Don't raise - return 200 to Stripe to prevent retries
        # Log the error for investigation

    return {"status": "success"}


async def handle_checkout_completed(session: dict):
    """Handle successful checkout."""
    user_id = session.get("metadata", {}).get("user_id")
    plan_id = session.get("metadata", {}).get("plan_id")
    subscription_id = session.get("subscription")

    if not user_id or not plan_id:
        return

    user = await User.get(user_id)
    if not user:
        return

    # Get subscription details from Stripe
    stripe_sub = stripe.Subscription.retrieve(subscription_id)

    # Create local subscription record
    subscription = Subscription(
        user_id=str(user.id),
        plan_id=plan_id,
        status=stripe_sub.status,
        stripe_subscription_id=subscription_id,
        stripe_price_id=stripe_sub["items"]["data"][0]["price"]["id"],
        current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start),
        current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end),
        trial_start=(
            datetime.fromtimestamp(stripe_sub.trial_start)
            if stripe_sub.trial_start
            else None
        ),
        trial_end=(
            datetime.fromtimestamp(stripe_sub.trial_end)
            if stripe_sub.trial_end
            else None
        ),
    )
    await subscription.insert()

    # Update user - upgrade from "viewer" to "user"
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if user.role == "viewer":
        user.role = "user"
    user.subscription_id = str(subscription.id)
    user.subscription_tier = plan_id
    user.subscription_status = stripe_sub.status
    user.subscription_end_date = datetime.fromtimestamp(stripe_sub.current_period_end)
    user.max_concurrent_streams = plan.max_streams if plan else 1
    await user.save()


async def handle_subscription_updated(stripe_sub: dict):
    """Handle subscription updates."""
    subscription = await Subscription.find_one(
        Subscription.stripe_subscription_id == stripe_sub["id"]
    )
    if not subscription:
        return

    subscription.status = stripe_sub["status"]
    subscription.current_period_end = datetime.fromtimestamp(
        stripe_sub["current_period_end"]
    )
    subscription.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
    subscription.updated_at = datetime.now(timezone.utc)
    await subscription.save()

    # Update user
    user = await User.get(subscription.user_id)
    if user:
        user.subscription_status = stripe_sub["status"]
        user.subscription_end_date = datetime.fromtimestamp(
            stripe_sub["current_period_end"]
        )
        await user.save()


async def handle_subscription_deleted(stripe_sub: dict):
    """Handle subscription cancellation."""
    subscription = await Subscription.find_one(
        Subscription.stripe_subscription_id == stripe_sub["id"]
    )
    if not subscription:
        return

    subscription.status = "canceled"
    subscription.updated_at = datetime.now(timezone.utc)
    await subscription.save()

    # Update user
    user = await User.get(subscription.user_id)
    if user:
        user.subscription_tier = None
        user.subscription_status = "canceled"
        user.max_concurrent_streams = 1
        await user.save()
