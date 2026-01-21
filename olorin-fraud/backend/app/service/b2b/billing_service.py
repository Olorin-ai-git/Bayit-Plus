"""
B2B Billing Service.

Stripe integration for B2B partner billing, subscriptions, and invoices.

SYSTEM MANDATE Compliance:
- No hardcoded values: All Stripe keys from environment
- Complete implementation: No placeholders
- Uses existing MongoDB infrastructure
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import stripe

from app.models.b2b.billing import (
    B2BInvoice,
    B2BPaymentMethod,
    B2BPlan,
    B2BSubscription,
    BillingPeriod,
    InvoiceLineItem,
    InvoiceStatus,
    PaymentMethodType,
    ServiceInclusion,
    SubscriptionStatus,
)
from app.persistence.mongodb import get_mongodb_client
from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class B2BBillingService:
    """
    Service for managing B2B billing, subscriptions, and invoices via Stripe.
    """

    _instance = None
    _initialized = False

    # Collection names
    PLANS_COLLECTION = "b2b_billing_plans"
    SUBSCRIPTIONS_COLLECTION = "b2b_subscriptions"
    INVOICES_COLLECTION = "b2b_invoices"
    PAYMENT_METHODS_COLLECTION = "b2b_payment_methods"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(B2BBillingService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not B2BBillingService._initialized:
            self._configure_stripe()
            self.db = None
            B2BBillingService._initialized = True

    def _configure_stripe(self) -> None:
        """Configure Stripe API with credentials from environment."""
        config_loader = get_config_loader()

        # Load Stripe secret key
        stripe_key = config_loader.load_secret("OLORIN_B2B_STRIPE_SECRET_KEY")
        if not stripe_key:
            env = os.getenv("APP_ENV", "local")
            if env == "prd":
                raise ValueError(
                    "CRITICAL: OLORIN_B2B_STRIPE_SECRET_KEY must be configured in production"
                )
            logger.warning("Stripe secret key not configured - billing features disabled")
            self.stripe_enabled = False
            return

        stripe.api_key = stripe_key
        self.stripe_enabled = True

        # Load webhook secret for verification
        self.webhook_secret = config_loader.load_secret("OLORIN_B2B_STRIPE_WEBHOOK_SECRET")

        logger.info("Stripe B2B billing configured successfully")

    async def _get_db(self):
        """Get MongoDB database instance."""
        if self.db is None:
            client = await get_mongodb_client()
            self.db = client.get_default_database()
        return self.db

    # ==================== Plan Management ====================

    async def create_plan(
        self,
        plan_id: str,
        name: str,
        base_price_monthly: float,
        base_price_yearly: float,
        name_en: Optional[str] = None,
        description: Optional[str] = None,
        fraud_detection: Optional[ServiceInclusion] = None,
        content_ai: Optional[ServiceInclusion] = None,
        max_team_members: int = 5,
        max_api_keys: int = 10,
        max_api_calls_per_minute: int = 60,
        trial_days: int = 14,
    ) -> B2BPlan:
        """
        Create a new B2B subscription plan.

        Args:
            plan_id: Unique plan identifier (e.g., 'starter', 'growth')
            name: Display name
            base_price_monthly: Monthly price in USD
            base_price_yearly: Yearly price in USD
            ... other plan parameters

        Returns:
            Created B2BPlan
        """
        db = await self._get_db()
        collection = db[self.PLANS_COLLECTION]

        # Check for existing plan
        existing = await collection.find_one({"plan_id": plan_id})
        if existing:
            raise ValueError(f"Plan with ID '{plan_id}' already exists")

        # Create plan document
        plan = B2BPlan(
            plan_id=plan_id,
            name=name,
            name_en=name_en,
            description=description,
            base_price_monthly=base_price_monthly,
            base_price_yearly=base_price_yearly,
            fraud_detection=fraud_detection or ServiceInclusion(),
            content_ai=content_ai or ServiceInclusion(),
            max_team_members=max_team_members,
            max_api_keys=max_api_keys,
            max_api_calls_per_minute=max_api_calls_per_minute,
            trial_days=trial_days,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Create Stripe products and prices if enabled
        if self.stripe_enabled:
            try:
                # Create Stripe product
                product = stripe.Product.create(
                    name=f"Olorin.ai B2B - {name}",
                    description=description or f"Olorin.ai B2B {name} Plan",
                    metadata={"plan_id": plan_id},
                )
                plan.stripe_product_id = product.id

                # Create monthly price
                monthly_price = stripe.Price.create(
                    product=product.id,
                    unit_amount=int(base_price_monthly * 100),  # Stripe uses cents
                    currency="usd",
                    recurring={"interval": "month"},
                    metadata={"plan_id": plan_id, "billing_period": "monthly"},
                )
                plan.stripe_price_id_monthly = monthly_price.id

                # Create yearly price
                yearly_price = stripe.Price.create(
                    product=product.id,
                    unit_amount=int(base_price_yearly * 100),
                    currency="usd",
                    recurring={"interval": "year"},
                    metadata={"plan_id": plan_id, "billing_period": "yearly"},
                )
                plan.stripe_price_id_yearly = yearly_price.id

                logger.info(f"Created Stripe product and prices for plan: {plan_id}")
            except stripe.StripeError as e:
                logger.error(f"Failed to create Stripe product for plan {plan_id}: {e}")
                # Continue without Stripe integration

        # Insert into database
        doc = plan.model_dump(by_alias=True, exclude_unset=True)
        result = await collection.insert_one(doc)
        plan.id = result.inserted_id

        logger.info(f"Created B2B billing plan: {plan_id}")
        return plan

    async def get_plan(self, plan_id: str) -> Optional[B2BPlan]:
        """Get plan by ID."""
        db = await self._get_db()
        collection = db[self.PLANS_COLLECTION]

        doc = await collection.find_one({"plan_id": plan_id})
        if not doc:
            return None

        return B2BPlan(**doc)

    async def list_plans(self, active_only: bool = True, public_only: bool = True) -> List[B2BPlan]:
        """List available B2B plans."""
        db = await self._get_db()
        collection = db[self.PLANS_COLLECTION]

        query: Dict[str, Any] = {}
        if active_only:
            query["is_active"] = True
        if public_only:
            query["is_public"] = True

        plans = []
        cursor = collection.find(query).sort("display_order", 1)

        async for doc in cursor:
            plans.append(B2BPlan(**doc))

        return plans

    # ==================== Subscription Management ====================

    async def create_subscription(
        self,
        org_id: str,
        plan_id: str,
        billing_period: BillingPeriod = BillingPeriod.MONTHLY,
        stripe_customer_id: Optional[str] = None,
        start_trial: bool = True,
    ) -> B2BSubscription:
        """
        Create a new subscription for an organization.

        Args:
            org_id: Organization ID
            plan_id: Plan to subscribe to
            billing_period: Monthly or yearly billing
            stripe_customer_id: Stripe customer ID (if exists)
            start_trial: Whether to start with trial period

        Returns:
            Created B2BSubscription
        """
        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        # Get plan
        plan = await self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found")

        # Generate subscription_id
        subscription_id = f"sub_{secrets.token_urlsafe(16)}"

        # Calculate period dates
        now = datetime.now(timezone.utc)
        if billing_period == BillingPeriod.YEARLY:
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)

        # Determine initial status
        status = SubscriptionStatus.TRIALING if start_trial and plan.trial_days > 0 else SubscriptionStatus.ACTIVE

        # Create subscription document
        subscription = B2BSubscription(
            subscription_id=subscription_id,
            org_id=org_id,
            plan_id=plan_id,
            status=status,
            billing_period=billing_period,
            stripe_customer_id=stripe_customer_id,
            current_period_start=now,
            current_period_end=period_end,
            usage_reset_at=now,
            created_at=now,
            updated_at=now,
        )

        # Set trial period if applicable
        if start_trial and plan.trial_days > 0:
            subscription.trial_start = now
            subscription.trial_end = now + timedelta(days=plan.trial_days)

        # Create Stripe subscription if enabled and customer exists
        if self.stripe_enabled and stripe_customer_id:
            try:
                stripe_price_id = plan.get_stripe_price_id(billing_period)
                if stripe_price_id:
                    stripe_params: Dict[str, Any] = {
                        "customer": stripe_customer_id,
                        "items": [{"price": stripe_price_id}],
                        "metadata": {
                            "org_id": org_id,
                            "plan_id": plan_id,
                            "subscription_id": subscription_id,
                        },
                    }

                    if start_trial and plan.trial_days > 0:
                        stripe_params["trial_period_days"] = plan.trial_days

                    stripe_sub = stripe.Subscription.create(**stripe_params)
                    subscription.stripe_subscription_id = stripe_sub.id

                    logger.info(f"Created Stripe subscription for org: {org_id}")
            except stripe.StripeError as e:
                logger.error(f"Failed to create Stripe subscription for org {org_id}: {e}")
                # Continue with local subscription

        # Insert into database
        doc = subscription.model_dump(by_alias=True, exclude_unset=True)
        # Convert enums to strings
        doc["status"] = subscription.status.value
        doc["billing_period"] = subscription.billing_period.value
        result = await collection.insert_one(doc)
        subscription.id = result.inserted_id

        logger.info(f"Created B2B subscription: {subscription_id} for org: {org_id}")
        return subscription

    async def get_subscription(self, subscription_id: str) -> Optional[B2BSubscription]:
        """Get subscription by ID."""
        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        doc = await collection.find_one({"subscription_id": subscription_id})
        if not doc:
            return None

        # Convert string enums
        if "status" in doc and isinstance(doc["status"], str):
            doc["status"] = SubscriptionStatus(doc["status"])
        if "billing_period" in doc and isinstance(doc["billing_period"], str):
            doc["billing_period"] = BillingPeriod(doc["billing_period"])

        return B2BSubscription(**doc)

    async def get_organization_subscription(self, org_id: str) -> Optional[B2BSubscription]:
        """Get active subscription for an organization."""
        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        # Find active or trialing subscription
        doc = await collection.find_one({
            "org_id": org_id,
            "status": {"$in": ["active", "trialing", "past_due"]},
        })

        if not doc:
            return None

        # Convert string enums
        if "status" in doc and isinstance(doc["status"], str):
            doc["status"] = SubscriptionStatus(doc["status"])
        if "billing_period" in doc and isinstance(doc["billing_period"], str):
            doc["billing_period"] = BillingPeriod(doc["billing_period"])

        return B2BSubscription(**doc)

    async def cancel_subscription(
        self,
        subscription_id: str,
        reason: Optional[str] = None,
        cancel_immediately: bool = False,
    ) -> Optional[B2BSubscription]:
        """
        Cancel a subscription.

        Args:
            subscription_id: Subscription to cancel
            reason: Cancellation reason
            cancel_immediately: If True, cancel now. If False, cancel at period end.

        Returns:
            Updated subscription
        """
        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        subscription = await self.get_subscription(subscription_id)
        if not subscription:
            return None

        now = datetime.now(timezone.utc)
        updates: Dict[str, Any] = {
            "canceled_at": now,
            "cancellation_reason": reason,
            "updated_at": now,
        }

        if cancel_immediately:
            updates["status"] = SubscriptionStatus.CANCELED.value
        else:
            updates["cancel_at_period_end"] = True

        # Cancel in Stripe if applicable
        if self.stripe_enabled and subscription.stripe_subscription_id:
            try:
                if cancel_immediately:
                    stripe.Subscription.delete(subscription.stripe_subscription_id)
                else:
                    stripe.Subscription.modify(
                        subscription.stripe_subscription_id,
                        cancel_at_period_end=True,
                    )
                logger.info(f"Canceled Stripe subscription: {subscription.stripe_subscription_id}")
            except stripe.StripeError as e:
                logger.error(f"Failed to cancel Stripe subscription: {e}")

        result = await collection.find_one_and_update(
            {"subscription_id": subscription_id},
            {"$set": updates},
            return_document=True,
        )

        if not result:
            return None

        # Convert string enums
        if "status" in result and isinstance(result["status"], str):
            result["status"] = SubscriptionStatus(result["status"])
        if "billing_period" in result and isinstance(result["billing_period"], str):
            result["billing_period"] = BillingPeriod(result["billing_period"])

        logger.info(f"Canceled B2B subscription: {subscription_id}")
        return B2BSubscription(**result)

    # ==================== Customer Management ====================

    async def create_stripe_customer(
        self,
        org_id: str,
        email: str,
        name: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """
        Create a Stripe customer for an organization.

        Returns:
            Stripe customer ID or None if Stripe disabled
        """
        if not self.stripe_enabled:
            return None

        try:
            customer_metadata = {"org_id": org_id}
            if metadata:
                customer_metadata.update(metadata)

            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=customer_metadata,
            )

            logger.info(f"Created Stripe customer for org: {org_id}")
            return customer.id
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe customer for org {org_id}: {e}")
            return None

    # ==================== Invoice Management ====================

    async def create_invoice(
        self,
        org_id: str,
        period_start: datetime,
        period_end: datetime,
        line_items: List[InvoiceLineItem],
        subscription_id: Optional[str] = None,
    ) -> B2BInvoice:
        """
        Create an invoice for an organization.

        Args:
            org_id: Organization ID
            period_start: Billing period start
            period_end: Billing period end
            line_items: Invoice line items
            subscription_id: Optional associated subscription

        Returns:
            Created B2BInvoice
        """
        db = await self._get_db()
        collection = db[self.INVOICES_COLLECTION]

        # Generate IDs
        invoice_id = f"inv_{secrets.token_urlsafe(16)}"
        invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{secrets.token_hex(4).upper()}"

        # Calculate due date (Net 30)
        due_date = datetime.now(timezone.utc) + timedelta(days=30)

        # Create invoice document
        invoice = B2BInvoice(
            invoice_id=invoice_id,
            invoice_number=invoice_number,
            org_id=org_id,
            subscription_id=subscription_id,
            period_start=period_start,
            period_end=period_end,
            line_items=line_items,
            status=InvoiceStatus.DRAFT,
            due_date=due_date,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Calculate totals
        invoice.calculate_totals()

        # Insert into database
        doc = invoice.model_dump(by_alias=True, exclude_unset=True)
        doc["status"] = invoice.status.value
        result = await collection.insert_one(doc)
        invoice.id = result.inserted_id

        logger.info(f"Created B2B invoice: {invoice_id} for org: {org_id}")
        return invoice

    async def get_invoice(self, invoice_id: str) -> Optional[B2BInvoice]:
        """Get invoice by ID."""
        db = await self._get_db()
        collection = db[self.INVOICES_COLLECTION]

        doc = await collection.find_one({"invoice_id": invoice_id})
        if not doc:
            return None

        # Convert string enum
        if "status" in doc and isinstance(doc["status"], str):
            doc["status"] = InvoiceStatus(doc["status"])

        return B2BInvoice(**doc)

    async def list_organization_invoices(
        self,
        org_id: str,
        limit: int = 50,
        status: Optional[InvoiceStatus] = None,
    ) -> List[B2BInvoice]:
        """List invoices for an organization."""
        db = await self._get_db()
        collection = db[self.INVOICES_COLLECTION]

        query: Dict[str, Any] = {"org_id": org_id}
        if status:
            query["status"] = status.value

        invoices = []
        cursor = collection.find(query).sort("created_at", -1).limit(limit)

        async for doc in cursor:
            if "status" in doc and isinstance(doc["status"], str):
                doc["status"] = InvoiceStatus(doc["status"])
            invoices.append(B2BInvoice(**doc))

        return invoices

    # ==================== Webhook Handling ====================

    async def handle_stripe_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Handle Stripe webhook event.

        Args:
            payload: Raw webhook payload
            signature: Stripe signature header

        Returns:
            Dict with event type and handling result
        """
        if not self.stripe_enabled or not self.webhook_secret:
            raise ValueError("Stripe webhooks not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid Stripe webhook payload: {e}")
            raise ValueError("Invalid payload")
        except stripe.SignatureVerificationError as e:
            logger.error(f"Invalid Stripe webhook signature: {e}")
            raise ValueError("Invalid signature")

        event_type = event["type"]
        data = event["data"]["object"]

        logger.info(f"Processing Stripe webhook: {event_type}")

        # Handle different event types
        if event_type == "customer.subscription.updated":
            await self._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            await self._handle_subscription_deleted(data)
        elif event_type == "invoice.paid":
            await self._handle_invoice_paid(data)
        elif event_type == "invoice.payment_failed":
            await self._handle_payment_failed(data)

        return {"event_type": event_type, "handled": True}

    async def _handle_subscription_updated(self, data: Dict[str, Any]) -> None:
        """Handle subscription.updated webhook."""
        stripe_sub_id = data.get("id")
        if not stripe_sub_id:
            return

        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        # Map Stripe status to our status
        stripe_status = data.get("status")
        status_map = {
            "trialing": SubscriptionStatus.TRIALING,
            "active": SubscriptionStatus.ACTIVE,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELED,
            "unpaid": SubscriptionStatus.UNPAID,
            "incomplete": SubscriptionStatus.INCOMPLETE,
        }
        new_status = status_map.get(stripe_status, SubscriptionStatus.ACTIVE)

        await collection.update_one(
            {"stripe_subscription_id": stripe_sub_id},
            {
                "$set": {
                    "status": new_status.value,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def _handle_subscription_deleted(self, data: Dict[str, Any]) -> None:
        """Handle subscription.deleted webhook."""
        stripe_sub_id = data.get("id")
        if not stripe_sub_id:
            return

        db = await self._get_db()
        collection = db[self.SUBSCRIPTIONS_COLLECTION]

        await collection.update_one(
            {"stripe_subscription_id": stripe_sub_id},
            {
                "$set": {
                    "status": SubscriptionStatus.CANCELED.value,
                    "canceled_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def _handle_invoice_paid(self, data: Dict[str, Any]) -> None:
        """Handle invoice.paid webhook."""
        stripe_invoice_id = data.get("id")
        if not stripe_invoice_id:
            return

        db = await self._get_db()
        collection = db[self.INVOICES_COLLECTION]

        await collection.update_one(
            {"stripe_invoice_id": stripe_invoice_id},
            {
                "$set": {
                    "status": InvoiceStatus.PAID.value,
                    "paid_at": datetime.now(timezone.utc),
                    "amount_paid": data.get("amount_paid", 0) / 100,  # Convert from cents
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def _handle_payment_failed(self, data: Dict[str, Any]) -> None:
        """Handle invoice.payment_failed webhook."""
        stripe_invoice_id = data.get("id")
        if not stripe_invoice_id:
            return

        # Update subscription to past_due
        subscription_id = data.get("subscription")
        if subscription_id:
            db = await self._get_db()
            collection = db[self.SUBSCRIPTIONS_COLLECTION]

            await collection.update_one(
                {"stripe_subscription_id": subscription_id},
                {
                    "$set": {
                        "status": SubscriptionStatus.PAST_DUE.value,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

        logger.warning(f"Payment failed for invoice: {stripe_invoice_id}")


# Global instance
_b2b_billing_service: Optional[B2BBillingService] = None


def get_b2b_billing_service() -> B2BBillingService:
    """Get the global B2B billing service instance."""
    global _b2b_billing_service
    if _b2b_billing_service is None:
        _b2b_billing_service = B2BBillingService()
    return _b2b_billing_service
