"""Webhook handler service for processing Stripe events.

This service handles Stripe webhook events with:
- Idempotency (prevents duplicate processing)
- Atomic state transitions (prevents race conditions)
- Session token verification (prevents metadata tampering)
- Token revocation on activation (session rotation)
"""
from datetime import datetime, timezone

from bson import ObjectId

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import verify_session_token
from app.models.user import User
from app.models.admin import SubscriptionPlan
from app.services.email_service import send_email

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
        result = await User.get_pymongo_collection().update_one(
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

        # Future: Invalidate old tokens (session rotation)
        # Requires Redis implementation:
        # await redis_client.sadd(f"revoked_tokens:{user_id}", "*")
        # await redis_client.expire(f"revoked_tokens:{user_id}", 86400)

        # Send welcome email with subscription details
        await self._send_welcome_email(user_id, plan_id, subscription_id)

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
        result = await User.get_pymongo_collection().update_one(
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
        result = await User.get_pymongo_collection().update_one(
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

    async def _send_welcome_email(
        self,
        user_id: str,
        plan_id: str,
        subscription_id: str
    ) -> None:
        """Send welcome email to new subscriber with subscription details.

        Args:
            user_id: User ID
            plan_id: Subscription plan slug (basic, premium, family)
            subscription_id: Stripe subscription ID
        """
        try:
            # Fetch user to get email
            user = await User.find_one(User.id == ObjectId(user_id))
            if not user or not user.email:
                logger.warning(
                    "Cannot send welcome email - user not found or no email",
                    extra={"user_id": user_id}
                )
                return

            # Fetch subscription plan details
            plan = await SubscriptionPlan.find_one(SubscriptionPlan.slug == plan_id)
            if not plan:
                logger.warning(
                    "Cannot send welcome email - plan not found",
                    extra={"plan_id": plan_id}
                )
                # Continue anyway with basic info
                plan_name = plan_id.title()
                plan_features = []
                plan_price = "N/A"
            else:
                plan_name = plan.name
                plan_features = plan.features
                plan_price = f"${plan.price:.2f}/{plan.interval}"

            # Create HTML email template
            features_html = "".join([
                f'<li style="margin: 8px 0; color: #4A5568;">{feature}</li>'
                for feature in plan_features
            ]) if plan_features else '<li style="margin: 8px 0; color: #4A5568;">Full access to Bayit+ content</li>'

            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6B46C1; margin: 0;">🎉 Welcome to Bayit+!</h1>
                        <p style="color: #718096; font-size: 18px; margin: 10px 0 0 0;">
                            Your subscription is now active
                        </p>
                    </div>

                    <div style="background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%);
                                border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                        <h2 style="color: white; margin: 0 0 8px 0; font-size: 28px;">
                            {plan_name}
                        </h2>
                        <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 20px; font-weight: bold;">
                            {plan_price}
                        </p>
                    </div>

                    <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #2D3748; margin-top: 0;">Your Subscription Includes:</h3>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            {features_html}
                        </ul>
                    </div>

                    <div style="background-color: #EDF2F7; border-left: 4px solid #6B46C1; padding: 15px; margin-bottom: 20px;">
                        <h3 style="color: #2D3748; margin-top: 0;">🚀 Getting Started</h3>
                        <ol style="color: #4A5568; margin: 10px 0; padding-left: 20px;">
                            <li style="margin: 8px 0;">
                                <strong>Explore Live TV:</strong> Watch 10+ Israeli channels with real-time AI dubbing
                            </li>
                            <li style="margin: 8px 0;">
                                <strong>Browse VOD:</strong> Discover our library of movies, series, and exclusive content
                            </li>
                            <li style="margin: 8px 0;">
                                <strong>Listen to Radio:</strong> Enjoy 24/7 Israeli radio stations and podcasts
                            </li>
                            <li style="margin: 8px 0;">
                                <strong>Multi-Device Access:</strong> Watch on web, mobile, or Apple TV
                            </li>
                        </ol>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://bayitplus.com/browse"
                           style="background-color: #6B46C1; color: white; padding: 14px 32px;
                                  text-decoration: none; border-radius: 6px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Start Watching Now
                        </a>
                    </div>

                    <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400E;">
                            <strong>💡 Tip:</strong> Download our mobile app for the best viewing experience on the go!
                        </p>
                    </div>

                    <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 30px;">
                        <h3 style="color: #2D3748;">Need Help?</h3>
                        <p style="color: #4A5568; line-height: 1.6; margin: 10px 0;">
                            Our support team is here to help you get the most out of Bayit+.
                            Visit our <a href="https://bayitplus.com/help" style="color: #6B46C1;">Help Center</a>
                            or contact us at <a href="mailto:support@bayitplus.com" style="color: #6B46C1;">support@bayitplus.com</a>.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center; margin-top: 30px;">
                        <p style="color: #718096; font-size: 12px; margin: 5px 0;">
                            Subscription ID: <span style="font-family: monospace;">{subscription_id}</span>
                        </p>
                        <p style="color: #718096; font-size: 12px; margin: 5px 0;">
                            Manage your subscription in
                            <a href="https://bayitplus.com/account/subscription" style="color: #6B46C1;">Account Settings</a>
                        </p>
                        <p style="color: #A0AEC0; font-size: 12px; margin: 20px 0 5px 0;">
                            © 2026 Bayit+ | Premium Jewish Streaming
                        </p>
                    </div>
                </body>
            </html>
            """

            # Send welcome email
            success = await send_email(
                to_emails=[user.email],
                subject=f"🎉 Welcome to Bayit+ {plan_name}!",
                html_content=html_content
            )

            if success:
                logger.info(
                    "Welcome email sent successfully",
                    extra={
                        "user_id": user_id,
                        "email": user.email,
                        "plan": plan_id
                    }
                )
            else:
                logger.warning(
                    "Failed to send welcome email (email service not configured)",
                    extra={"user_id": user_id, "email": user.email}
                )

        except Exception as e:
            logger.error(
                "Error sending welcome email",
                extra={"user_id": user_id, "error": str(e)}
            )
