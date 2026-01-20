"""
B2B Billing Models.

MongoDB models for subscription plans, subscriptions, invoices, and payment methods.

SYSTEM MANDATE Compliance:
- No hardcoded values: All pricing and limits configurable
- Complete implementation: No placeholders
- Configuration-driven: All values from models or config
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field, field_validator


class PyObjectId(BsonObjectId):
    """Custom ObjectId type for Pydantic compatibility."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not BsonObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return BsonObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, handler):
        return {"type": "string"}


class BillingPeriod(str, Enum):
    """Billing period options."""

    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(str, Enum):
    """Subscription status states."""

    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"


class InvoiceStatus(str, Enum):
    """Invoice status states."""

    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class PaymentMethodType(str, Enum):
    """Payment method types."""

    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    INVOICE = "invoice"


class ServiceInclusion(BaseModel):
    """Service-specific inclusions in a plan."""

    # Base inclusions
    included_requests: int = Field(default=0, ge=0, description="Included API requests")
    included_minutes: float = Field(default=0.0, ge=0.0, description="Included processing minutes")
    included_tokens: int = Field(default=0, ge=0, description="Included LLM tokens")

    # Overage rates (USD)
    overage_rate_per_request: float = Field(default=0.0, ge=0.0)
    overage_rate_per_minute: float = Field(default=0.0, ge=0.0)
    overage_rate_per_1k_tokens: float = Field(default=0.0, ge=0.0)

    # Feature flags
    features_enabled: List[str] = Field(default_factory=list)


class B2BPlan(BaseModel):
    """
    B2B subscription plan definition.

    Stores in MongoDB collection: b2b_billing_plans
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Plan identification
    plan_id: str = Field(..., min_length=1, max_length=100, description="e.g., starter, growth, enterprise")
    name: str = Field(..., min_length=1, max_length=255)
    name_en: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)

    # Pricing (USD)
    base_price_monthly: float = Field(..., ge=0.0)
    base_price_yearly: float = Field(..., ge=0.0)

    # Service-specific inclusions
    fraud_detection: ServiceInclusion = Field(default_factory=ServiceInclusion)
    content_ai: ServiceInclusion = Field(default_factory=ServiceInclusion)

    # Organization limits
    max_team_members: int = Field(default=5, ge=1)
    max_api_keys: int = Field(default=10, ge=1)
    max_webhooks: int = Field(default=5, ge=1)

    # Rate limits
    max_api_calls_per_minute: int = Field(default=60, ge=1)
    max_api_calls_per_hour: int = Field(default=1000, ge=1)
    max_concurrent_requests: int = Field(default=10, ge=1)

    # Support
    support_level: str = Field(default="standard", description="standard, priority, dedicated")
    sla_uptime_percentage: float = Field(default=99.5, ge=0.0, le=100.0)

    # Stripe integration
    stripe_price_id_monthly: Optional[str] = Field(default=None)
    stripe_price_id_yearly: Optional[str] = Field(default=None)
    stripe_product_id: Optional[str] = Field(default=None)

    # Status
    is_active: bool = Field(default=True)
    is_public: bool = Field(default=True, description="Visible on pricing page")
    display_order: int = Field(default=0, ge=0)

    # Trial settings
    trial_days: int = Field(default=14, ge=0)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def get_price(self, period: BillingPeriod) -> float:
        """Get price for billing period."""
        if period == BillingPeriod.YEARLY:
            return self.base_price_yearly
        return self.base_price_monthly

    def get_stripe_price_id(self, period: BillingPeriod) -> Optional[str]:
        """Get Stripe price ID for billing period."""
        if period == BillingPeriod.YEARLY:
            return self.stripe_price_id_yearly
        return self.stripe_price_id_monthly

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "plan_id": self.plan_id,
            "name": self.name,
            "name_en": self.name_en,
            "description": self.description,
            "base_price_monthly": self.base_price_monthly,
            "base_price_yearly": self.base_price_yearly,
            "fraud_detection": self.fraud_detection.model_dump(),
            "content_ai": self.content_ai.model_dump(),
            "max_team_members": self.max_team_members,
            "max_api_keys": self.max_api_keys,
            "max_api_calls_per_minute": self.max_api_calls_per_minute,
            "support_level": self.support_level,
            "sla_uptime_percentage": self.sla_uptime_percentage,
            "trial_days": self.trial_days,
            "is_active": self.is_active,
        }


class B2BSubscription(BaseModel):
    """
    Partner subscription to a B2B plan.

    Stores in MongoDB collection: b2b_subscriptions
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Subscription identification
    subscription_id: str = Field(..., min_length=1, max_length=255)
    org_id: str = Field(..., min_length=1, max_length=255)
    plan_id: str = Field(..., min_length=1, max_length=100)

    # Status
    status: SubscriptionStatus = Field(default=SubscriptionStatus.INCOMPLETE)
    billing_period: BillingPeriod = Field(default=BillingPeriod.MONTHLY)

    # Stripe integration
    stripe_subscription_id: Optional[str] = Field(default=None)
    stripe_customer_id: Optional[str] = Field(default=None)

    # Billing period dates
    current_period_start: datetime = Field(...)
    current_period_end: datetime = Field(...)

    # Trial
    trial_start: Optional[datetime] = Field(default=None)
    trial_end: Optional[datetime] = Field(default=None)

    # Cancellation
    cancel_at_period_end: bool = Field(default=False)
    canceled_at: Optional[datetime] = Field(default=None)
    cancellation_reason: Optional[str] = Field(default=None)

    # Usage tracking
    usage_reset_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]

    def is_in_trial(self) -> bool:
        """Check if subscription is in trial period."""
        return self.status == SubscriptionStatus.TRIALING

    def is_past_due(self) -> bool:
        """Check if subscription has payment issues."""
        return self.status in [SubscriptionStatus.PAST_DUE, SubscriptionStatus.UNPAID]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "subscription_id": self.subscription_id,
            "org_id": self.org_id,
            "plan_id": self.plan_id,
            "status": self.status.value,
            "billing_period": self.billing_period.value,
            "current_period_start": self.current_period_start.isoformat(),
            "current_period_end": self.current_period_end.isoformat(),
            "trial_start": self.trial_start.isoformat() if self.trial_start else None,
            "trial_end": self.trial_end.isoformat() if self.trial_end else None,
            "cancel_at_period_end": self.cancel_at_period_end,
            "canceled_at": self.canceled_at.isoformat() if self.canceled_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class InvoiceLineItem(BaseModel):
    """Line item on an invoice."""

    description: str = Field(..., min_length=1)
    service_category: str = Field(..., description="fraud_detection or content_ai")
    quantity: float = Field(..., ge=0.0)
    unit_price: float = Field(..., ge=0.0)
    amount: float = Field(..., ge=0.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class B2BInvoice(BaseModel):
    """
    Partner invoice for billing.

    Stores in MongoDB collection: b2b_invoices
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Invoice identification
    invoice_id: str = Field(..., min_length=1, max_length=255)
    invoice_number: str = Field(..., min_length=1, max_length=50)
    org_id: str = Field(..., min_length=1, max_length=255)
    subscription_id: Optional[str] = Field(default=None)

    # Period
    period_start: datetime = Field(...)
    period_end: datetime = Field(...)

    # Line items
    line_items: List[InvoiceLineItem] = Field(default_factory=list)

    # Amounts (USD)
    subtotal: float = Field(default=0.0, ge=0.0)
    tax_amount: float = Field(default=0.0, ge=0.0)
    tax_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    discount_amount: float = Field(default=0.0, ge=0.0)
    total_amount: float = Field(default=0.0, ge=0.0)
    amount_paid: float = Field(default=0.0, ge=0.0)
    amount_due: float = Field(default=0.0, ge=0.0)

    # Service breakdown
    fraud_detection_amount: float = Field(default=0.0, ge=0.0)
    content_ai_amount: float = Field(default=0.0, ge=0.0)
    base_amount: float = Field(default=0.0, ge=0.0)

    # Currency
    currency: str = Field(default="usd", min_length=3, max_length=3)

    # Status
    status: InvoiceStatus = Field(default=InvoiceStatus.DRAFT)

    # Stripe integration
    stripe_invoice_id: Optional[str] = Field(default=None)
    stripe_payment_intent_id: Optional[str] = Field(default=None)

    # PDF
    invoice_pdf_url: Optional[str] = Field(default=None)
    hosted_invoice_url: Optional[str] = Field(default=None)

    # Payment
    due_date: Optional[datetime] = Field(default=None)
    paid_at: Optional[datetime] = Field(default=None)
    payment_method_id: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finalized_at: Optional[datetime] = Field(default=None)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def is_paid(self) -> bool:
        """Check if invoice is fully paid."""
        return self.status == InvoiceStatus.PAID

    def is_overdue(self) -> bool:
        """Check if invoice is overdue."""
        if not self.due_date:
            return False
        return (
            self.status == InvoiceStatus.OPEN and datetime.now(timezone.utc) > self.due_date
        )

    def calculate_totals(self) -> None:
        """Recalculate invoice totals from line items."""
        self.subtotal = sum(item.amount for item in self.line_items)
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount
        self.amount_due = self.total_amount - self.amount_paid

        # Calculate service breakdown
        self.fraud_detection_amount = sum(
            item.amount for item in self.line_items if item.service_category == "fraud_detection"
        )
        self.content_ai_amount = sum(
            item.amount for item in self.line_items if item.service_category == "content_ai"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice_number,
            "org_id": self.org_id,
            "subscription_id": self.subscription_id,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "subtotal": self.subtotal,
            "tax_amount": self.tax_amount,
            "tax_rate": self.tax_rate,
            "discount_amount": self.discount_amount,
            "total_amount": self.total_amount,
            "amount_paid": self.amount_paid,
            "amount_due": self.amount_due,
            "fraud_detection_amount": self.fraud_detection_amount,
            "content_ai_amount": self.content_ai_amount,
            "currency": self.currency,
            "status": self.status.value,
            "invoice_pdf_url": self.invoice_pdf_url,
            "hosted_invoice_url": self.hosted_invoice_url,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class B2BPaymentMethod(BaseModel):
    """
    Payment method for a partner organization.

    Stores in MongoDB collection: b2b_payment_methods
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Identification
    payment_method_id: str = Field(..., min_length=1, max_length=255)
    org_id: str = Field(..., min_length=1, max_length=255)

    # Type
    type: PaymentMethodType = Field(...)

    # Card details (masked)
    card_brand: Optional[str] = Field(default=None, description="visa, mastercard, etc.")
    card_last4: Optional[str] = Field(default=None, min_length=4, max_length=4)
    card_exp_month: Optional[int] = Field(default=None, ge=1, le=12)
    card_exp_year: Optional[int] = Field(default=None, ge=2020)

    # Bank details (masked)
    bank_name: Optional[str] = Field(default=None)
    bank_last4: Optional[str] = Field(default=None, min_length=4, max_length=4)

    # Stripe integration
    stripe_payment_method_id: Optional[str] = Field(default=None)

    # Status
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)

    # Billing address
    billing_address: Optional[Dict[str, str]] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def get_display_name(self) -> str:
        """Get human-readable display name for payment method."""
        if self.type == PaymentMethodType.CARD and self.card_brand and self.card_last4:
            return f"{self.card_brand.title()} •••• {self.card_last4}"
        if self.type == PaymentMethodType.BANK_TRANSFER and self.bank_name:
            return f"{self.bank_name} •••• {self.bank_last4}" if self.bank_last4 else self.bank_name
        return self.type.value.replace("_", " ").title()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "payment_method_id": self.payment_method_id,
            "org_id": self.org_id,
            "type": self.type.value,
            "display_name": self.get_display_name(),
            "card_brand": self.card_brand,
            "card_last4": self.card_last4,
            "card_exp_month": self.card_exp_month,
            "card_exp_year": self.card_exp_year,
            "bank_name": self.bank_name,
            "is_default": self.is_default,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
