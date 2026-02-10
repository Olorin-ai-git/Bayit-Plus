"""
Mobile Payment Integration - Stripe Payment Intents for React Native

Handles mobile payment processing via Stripe Payment Sheet integration.
"""

import logging
from typing import Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Stripe with secret key from configuration
stripe.api_key = settings.STRIPE_SECRET_KEY


class CreatePaymentIntentRequest(BaseModel):
    """Request body for creating a payment intent."""
    plan_id: str


class PaymentIntentResponse(BaseModel):
    """Response containing Stripe payment intent details for mobile."""
    payment_intent_secret: str
    ephemeral_key: str
    customer_id: str


# Plan configuration (prices in cents)
PLAN_PRICES = {
    "basic": 999,     # $9.99/month
    "premium": 1499,  # $14.99/month
    "family": 1999,   # $19.99/month
}


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user: User = Depends(get_current_user)
) -> PaymentIntentResponse:
    """
    Create a Stripe Payment Intent for mobile checkout.

    This endpoint generates the necessary Stripe components for React Native
    Payment Sheet integration:
    - Payment Intent (for processing the payment)
    - Ephemeral Key (for mobile SDK authentication)
    - Customer ID (for returning customer convenience)

    Args:
        request: Payment intent creation request with plan_id
        current_user: Authenticated user from JWT token

    Returns:
        PaymentIntentResponse with payment_intent_secret, ephemeral_key, customer_id

    Raises:
        HTTPException: If Stripe API calls fail or plan_id is invalid
    """
    try:
        # Validate plan ID
        if request.plan_id not in PLAN_PRICES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid plan_id: {request.plan_id}. Must be one of: {list(PLAN_PRICES.keys())}"
            )

        amount = PLAN_PRICES[request.plan_id]

        logger.info(
            f"Creating payment intent for user {current_user.email}, "
            f"plan={request.plan_id}, amount=${amount/100:.2f}"
        )

        # Get or create Stripe customer
        if not current_user.stripe_customer_id:
            logger.info(f"Creating new Stripe customer for user {current_user.email}")
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.display_name or current_user.email.split('@')[0],
                metadata={
                    "user_id": str(current_user.id),
                    "firebase_uid": current_user.firebase_uid
                }
            )
            # Save Stripe customer ID to user document
            current_user.stripe_customer_id = customer.id
            await current_user.save()
            logger.info(f"Created Stripe customer {customer.id} for user {current_user.email}")
        else:
            logger.info(f"Using existing Stripe customer {current_user.stripe_customer_id}")
            customer = stripe.Customer.retrieve(current_user.stripe_customer_id)

        # Create ephemeral key for mobile SDK
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer.id,
            stripe_version="2024-12-18.acacia"  # Latest Stripe API version
        )
        logger.debug(f"Created ephemeral key for customer {customer.id}")

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            customer=customer.id,
            metadata={
                "user_id": str(current_user.id),
                "firebase_uid": current_user.firebase_uid,
                "plan_id": request.plan_id,
                "user_email": current_user.email
            },
            automatic_payment_methods={"enabled": True}
        )

        logger.info(
            f"Payment intent created: {payment_intent.id}, "
            f"amount=${amount/100:.2f}, "
            f"customer={customer.id}"
        )

        return PaymentIntentResponse(
            payment_intent_secret=payment_intent.client_secret,
            ephemeral_key=ephemeral_key.secret,
            customer_id=customer.id
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Payment processing error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error creating payment intent: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to create payment session. Please try again."
        )
