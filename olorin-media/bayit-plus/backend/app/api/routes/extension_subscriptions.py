"""
Chrome Extension B2C Subscription Management

Simplified subscription model for Chrome extension users:
- Free tier: 5 minutes/day dubbing quota
- Premium tier: Unlimited dubbing for $5/month

This is separate from the main Bayit+ streaming platform subscriptions.
"""

from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.extension_rate_limiter import (
    extension_rate_limiter,
    get_client_identifier,
)
from app.core.security import get_current_active_user
from app.models.user import User

# Initialize Stripe with API key from settings
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/extension/subscriptions", tags=["Extension Subscriptions"])


class ExtensionSubscriptionResponse(BaseModel):
    """Chrome Extension subscription status response."""

    tier: str  # "free" or "premium"
    status: str  # "active", "canceled", "past_due", None
    quota_minutes_per_day: float
    price_usd: Optional[float] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class CheckoutSessionResponse(BaseModel):
    """Stripe checkout session response."""

    checkout_url: str
    session_id: str


@router.get("/status", response_model=ExtensionSubscriptionResponse)
async def get_subscription_status(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> ExtensionSubscriptionResponse:
    """
    Get current subscription status for Chrome extension.

    Rate limit: 20 req/min per user

    Returns:
        ExtensionSubscriptionResponse: Current subscription tier and quota
    """
    # Rate limiting
    identifier = get_client_identifier(request, str(current_user.id))
    extension_rate_limiter.check_rate_limit("subscription_status", identifier, limit=20)
    # Check if user has premium subscription
    if current_user.subscription_tier == "extension_premium":
        return ExtensionSubscriptionResponse(
            tier="premium",
            status=current_user.subscription_status or "active",
            quota_minutes_per_day=-1.0,  # Unlimited
            price_usd=settings.PREMIUM_TIER_PRICE_USD,
            current_period_end=current_user.subscription_end_date,
            cancel_at_period_end=(
                current_user.subscription_status == "canceled"
                if current_user.subscription_status
                else False
            ),
        )

    # Default to free tier
    return ExtensionSubscriptionResponse(
        tier="free",
        status=None,
        quota_minutes_per_day=settings.FREE_TIER_MINUTES_PER_DAY,
        price_usd=None,
        current_period_end=None,
        cancel_at_period_end=False,
    )


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> CheckoutSessionResponse:
    """
    Create Stripe checkout session for Chrome extension premium subscription.

    This creates a $5/month recurring subscription for unlimited dubbing.

    Rate limit: 10 req/min per user

    Returns:
        CheckoutSessionResponse: Checkout URL and session ID

    Raises:
        HTTPException: If user already has premium or Stripe configuration missing
    """
    # Rate limiting
    identifier = get_client_identifier(request, str(current_user.id))
    extension_rate_limiter.check_rate_limit("checkout", identifier, limit=10)
    # Check if user already has premium
    if current_user.subscription_tier == "extension_premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has premium subscription",
        )

    # Verify Stripe configuration
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe configuration not available",
        )

    try:
        # Get or create Stripe customer
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                metadata={
                    "user_id": str(current_user.id),
                    "platform": "chrome_extension",
                },
            )
            current_user.stripe_customer_id = customer.id
            await current_user.save()
        else:
            customer = stripe.Customer.retrieve(current_user.stripe_customer_id)

        # Create checkout session
        # Note: In production, STRIPE_PRICE_PREMIUM should be set to the extension-specific price ID
        # For now, we use the existing premium price ID (this will be updated in config)
        checkout_session = stripe.checkout.Session.create(
            customer=customer.id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": settings.STRIPE_PRICE_PREMIUM,  # TODO: Create extension-specific price
                    "quantity": 1,
                }
            ],
            success_url=f"{settings.FRONTEND_URL}/extension/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/extension/canceled",
            metadata={
                "user_id": str(current_user.id),
                "platform": "chrome_extension",
                "tier": "extension_premium",
            },
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id),
                    "platform": "chrome_extension",
                }
            },
        )

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id,
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )


@router.post("/cancel")
async def cancel_subscription(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Cancel Chrome extension premium subscription.

    Subscription remains active until end of current billing period.

    Rate limit: 10 req/min per user

    Returns:
        dict: Cancellation confirmation with end date

    Raises:
        HTTPException: If user doesn't have premium or cancellation fails
    """
    # Rate limiting
    identifier = get_client_identifier(request, str(current_user.id))
    extension_rate_limiter.check_rate_limit("cancel", identifier, limit=10)
    if current_user.subscription_tier != "extension_premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active premium subscription to cancel",
        )

    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Subscription ID not found",
        )

    try:
        # Cancel subscription at period end (no immediate cancellation)
        subscription = stripe.Subscription.modify(
            current_user.subscription_id,
            cancel_at_period_end=True,
        )

        # Update user status
        current_user.subscription_status = "canceled"
        await current_user.save()

        return {
            "success": True,
            "message": "Subscription will be canceled at period end",
            "end_date": datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            ).isoformat(),
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )


@router.post("/webhook")
async def extension_webhook(request: Request) -> dict:
    """
    Handle Stripe webhooks for Chrome extension subscriptions.

    This endpoint receives and processes Stripe events:
    - checkout.session.completed: User completed premium purchase
    - customer.subscription.updated: Subscription changed
    - customer.subscription.deleted: Subscription ended

    Security: Verifies Stripe webhook signature to prevent spoofing.

    Returns:
        dict: Success status

    Raises:
        HTTPException: If signature verification fails or event processing errors
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature",
        )

    try:
        # Verify webhook signature (CRITICAL SECURITY)
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    # Process different event types
    if event["type"] == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"])
    elif event["type"] == "customer.subscription.updated":
        await _handle_subscription_updated(event["data"]["object"])
    elif event["type"] == "customer.subscription.deleted":
        await _handle_subscription_deleted(event["data"]["object"])

    return {"status": "success"}


async def _handle_checkout_completed(session: dict) -> None:
    """
    Handle successful checkout completion.

    Updates user to premium tier and stores subscription details.

    Args:
        session: Stripe checkout session object
    """
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        return

    user = await User.get(user_id)
    if not user:
        return

    # Update user to premium tier
    user.subscription_tier = "extension_premium"
    user.subscription_status = "active"
    user.subscription_id = session.get("subscription")
    user.subscription_start_date = datetime.now(timezone.utc)

    # Get subscription details for end date
    if session.get("subscription"):
        subscription = stripe.Subscription.retrieve(session["subscription"])
        user.subscription_end_date = datetime.fromtimestamp(
            subscription.current_period_end, tz=timezone.utc
        )

    await user.save()


async def _handle_subscription_updated(subscription: dict) -> None:
    """
    Handle subscription update events.

    Updates user subscription status and end date.

    Args:
        subscription: Stripe subscription object
    """
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    user = await User.find_one(User.stripe_customer_id == customer_id)
    if not user:
        return

    # Update subscription status
    user.subscription_status = subscription.get("status")
    user.subscription_end_date = datetime.fromtimestamp(
        subscription["current_period_end"], tz=timezone.utc
    )

    await user.save()


async def _handle_subscription_deleted(subscription: dict) -> None:
    """
    Handle subscription deletion (cancellation or expiration).

    Downgrades user to free tier.

    Args:
        subscription: Stripe subscription object
    """
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    user = await User.find_one(User.stripe_customer_id == customer_id)
    if not user:
        return

    # Downgrade to free tier
    user.subscription_tier = None
    user.subscription_status = None
    user.subscription_id = None
    user.subscription_end_date = None

    await user.save()
