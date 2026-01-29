"""Signup checkout service for creating Stripe payment sessions.

This service handles creating Stripe checkout sessions during user signup,
with signed metadata to prevent tampering.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import stripe
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import generate_session_token
from app.models.subscription import SUBSCRIPTION_PLANS
from app.models.user import User

logger = get_logger(__name__)


class CheckoutResult(BaseModel):
    """Result of checkout session creation.

    Attributes:
        session_id: Stripe checkout session ID
        url: Checkout URL to redirect user to
        expires_at: When the checkout session expires
    """

    session_id: str
    url: str
    expires_at: datetime


class SignupCheckoutService:
    """Service for creating payment checkout during signup.

    This service:
    - Creates Stripe checkout sessions with signed metadata
    - Prevents metadata tampering with HMAC tokens
    - Configures trial periods and redirects
    - Supports localization
    """

    def __init__(self):
        """Initialize Stripe client with API key from settings."""
        stripe.api_key = settings.STRIPE_SECRET_KEY

    async def create_checkout_session(
        self,
        user: User,
        plan_id: str,
    ) -> CheckoutResult:
        """Create Stripe checkout session with signed metadata.

        Args:
            user: User creating the subscription
            plan_id: Plan ID (basic, premium, family)

        Returns:
            CheckoutResult with session ID and URL

        Raises:
            ValueError: If plan_id is invalid
            stripe.error.StripeError: If Stripe API fails

        Security:
            - Generates signed session token to bind user+plan to session
            - Token prevents metadata tampering attacks
            - Token expires after PAYMENT_CHECKOUT_SESSION_TTL_HOURS
        """
        # Validate plan exists
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            raise ValueError(f"Invalid plan: {plan_id}")

        # Get Stripe price ID from settings
        price_id = self._get_stripe_price_id(plan_id)
        if not price_id:
            logger.error(
                "Missing Stripe price ID",
                extra={"plan_id": plan_id}
            )
            raise ValueError(f"Stripe price not configured for plan: {plan_id}")

        # Generate signed token (prevents tampering)
        session_token = generate_session_token(
            str(user.id),
            plan_id,
            settings.SECRET_KEY
        )

        logger.info(
            "Creating checkout session",
            extra={
                "user_id": str(user.id),
                "plan_id": plan_id,
                "email": user.email,
            }
        )

        try:
            # Create Stripe checkout session
            checkout_session = stripe.checkout.Session.create(
                customer_email=user.email,
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                subscription_data={
                    "trial_period_days": settings.SIGNUP_TRIAL_PERIOD_DAYS,
                    "metadata": {
                        "session_token": session_token,  # Signed token (tamper-proof)
                        "user_id": str(user.id),  # For debugging (not used for auth)
                    }
                },
                success_url=f"{settings.FRONTEND_URL}{settings.PAYMENT_SUCCESS_PATH}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}{settings.PAYMENT_CANCELLED_PATH}",
                metadata={
                    "session_token": session_token,  # Also in top-level metadata
                },
                locale=self._map_language_to_stripe_locale(user.preferred_language),
                allow_promotion_codes=True,  # Allow discount codes
            )

            logger.info(
                "Checkout session created",
                extra={
                    "session_id": checkout_session.id,
                    "user_id": str(user.id),
                    "plan_id": plan_id,
                }
            )

            # Calculate expiration (Stripe default: 24 hours)
            expires_at = datetime.now(timezone.utc) + timedelta(
                hours=settings.PAYMENT_CHECKOUT_SESSION_TTL_HOURS
            )

            return CheckoutResult(
                session_id=checkout_session.id,
                url=checkout_session.url,
                expires_at=expires_at,
            )

        except stripe.error.StripeError as e:
            logger.error(
                "Stripe checkout session creation failed",
                extra={
                    "error": str(e),
                    "user_id": str(user.id),
                    "plan_id": plan_id,
                }
            )
            raise

    def _get_stripe_price_id(self, plan_id: str) -> Optional[str]:
        """Get Stripe price ID for a plan from settings.

        Args:
            plan_id: Plan ID (basic, premium, family)

        Returns:
            Stripe price ID or None if not configured
        """
        price_mapping = {
            "basic": settings.STRIPE_PRICE_BASIC,
            "premium": settings.STRIPE_PRICE_PREMIUM,
            "family": settings.STRIPE_PRICE_FAMILY,
        }
        return price_mapping.get(plan_id)

    def _map_language_to_stripe_locale(self, language: str) -> str:
        """Map user language preference to Stripe locale.

        Args:
            language: User preferred language (he, en, es, etc.)

        Returns:
            Stripe locale code (he, en, es, etc.)

        Stripe supported locales:
        https://stripe.com/docs/api/checkout/sessions/create#create_checkout_session-locale
        """
        # Stripe supports these languages
        stripe_locales = {
            "he": "he",  # Hebrew
            "en": "en",  # English
            "es": "es",  # Spanish
            "fr": "fr",  # French
            "it": "it",  # Italian
            "ja": "ja",  # Japanese
            "zh": "zh",  # Chinese
        }

        return stripe_locales.get(language, "en")  # Default to English
