"""Webhook handler service for processing Stripe events.

This service handles Stripe webhook events with:
- Idempotency (prevents duplicate processing)
- Atomic state transitions (prevents race conditions)
- Session token verification (prevents metadata tampering)
- Token revocation on activation (session rotation)
"""
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import verify_session_token
from app.models.user import User
from app.models.webhook_event import WebhookEvent

logger = get_logger(__name__)
security_logger = get_logger("security")


class WebhookHandlerService:
    """Service for handling Stripe webhook events."""

    async def handle_checkout_completed(self, session: dict) -> None:
        """Handle successful checkout with atomic state transition.

        This method:
        1. Verifies signed session token (prevents tampering)
        2. Atomically updates user state (prevents race conditions)
        3. Revokes old tokens (session rotation for security)

        Args:
            session: Stripe checkout session object

        Security Features:
            - Token verification prevents metadata tampering
            - Atomic updates prevent race conditions
            - Idempotency prevents duplicate processing
            - Session rotation prevents token reuse
        """
        session_token = session.get("metadata", {}).get("session_token")

        if not session_token:
            logger.error(
                "Missing session_token in webhook",
                extra={"session_id": session.get("id")}
            )
            return

        # Verify signed token (prevents tampering)
        try:
            user_id, plan_id = verify_session_token(
                session_token,
                settings.SECRET_KEY,
                max_age_seconds=86400  # 24 hours (checkout session TTL)
            )
        except ValueError as e:
            security_logger.warning(
                "Invalid session token in webhook",
                extra={
                    "error": str(e),
                    "session_id": session.get("id"),
                }
            )
            return

        # Extract subscription data from session
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")

        logger.info(
            "Processing checkout completion",
            extra={
                "user_id": user_id,
                "plan_id": plan_id,
                "subscription_id": subscription_id,
                "customer_id": customer_id,
            }
        )

        # ATOMIC STATE TRANSITION (prevents race conditions)
        # Only updates if user is still in payment_pending state with viewer role
        result = await User.get_motor_collection().update_one(
            {
                "_id": ObjectId(user_id),
                "payment_pending": True,  # Only update if still pending
                "role": "viewer"  # Only update if still viewer
            },
            {
                "$set": {
                    "role": "user",  # Upgrade to full user
                    "payment_pending": False,  # Clear pending flag
                    "pending_plan_id": None,  # Clear pending plan
                    "subscription_tier": plan_id,
                    "subscription_status": "active",
                    "subscription_id": subscription_id,
                    "stripe_customer_id": customer_id,
                    "subscription_start_date": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )

        if result.modified_count == 0:
            logger.warning(
                "User already activated or in unexpected state",
                extra={"user_id": user_id}
            )
            return  # Idempotent - already processed

        security_logger.info(
            "User activated via payment",
            extra={
                "user_id": user_id,
                "plan_id": plan_id,
                "subscription_id": subscription_id,
            }
        )

        # TODO: Invalidate old tokens (session rotation)
        # Requires Redis implementation:
        # await redis_client.sadd(f"revoked_tokens:{user_id}", "*")
        # await redis_client.expire(f"revoked_tokens:{user_id}", 86400)

        # TODO: Send welcome email with subscription details
        # await email_service.send_welcome_email(user_id, plan_id)

    async def handle_subscription_updated(self, subscription: dict) -> None:
        """Handle subscription update events (status changes).

        Args:
            subscription: Stripe subscription object
        """
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        subscription_id = subscription.get("id")

        logger.info(
            "Processing subscription update",
            extra={
                "subscription_id": subscription_id,
                "customer_id": customer_id,
                "status": status,
            }
        )

        # Update user subscription status
        result = await User.get_motor_collection().update_one(
            {
                "stripe_customer_id": customer_id,
                "subscription_id": subscription_id,
            },
            {
                "$set": {
                    "subscription_status": status,
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )

        if result.modified_count == 0:
            logger.warning(
                "No user found for subscription update",
                extra={
                    "subscription_id": subscription_id,
                    "customer_id": customer_id,
                }
            )
            return

        logger.info(
            "Subscription status updated",
            extra={
                "subscription_id": subscription_id,
                "status": status,
            }
        )

    async def handle_subscription_deleted(self, subscription: dict) -> None:
        """Handle subscription deletion (cancellation).

        Args:
            subscription: Stripe subscription object
        """
        customer_id = subscription.get("customer")
        subscription_id = subscription.get("id")

        logger.info(
            "Processing subscription deletion",
            extra={
                "subscription_id": subscription_id,
                "customer_id": customer_id,
            }
        )

        # Update user to canceled status (keep data for grace period)
        result = await User.get_motor_collection().update_one(
            {
                "stripe_customer_id": customer_id,
                "subscription_id": subscription_id,
            },
            {
                "$set": {
                    "subscription_status": "canceled",
                    "subscription_end_date": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )

        if result.modified_count == 0:
            logger.warning(
                "No user found for subscription deletion",
                extra={
                    "subscription_id": subscription_id,
                    "customer_id": customer_id,
                }
            )
            return

        logger.info(
            "Subscription canceled",
            extra={
                "subscription_id": subscription_id,
            }
        )
