from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price: float
    price_yearly: float
    includes_ai: bool
    ai_credits: int  # 0 = unlimited, >0 = one-time credit grant
    max_widgets: int  # 0 = unlimited
    max_profiles: int  # 0 = unlimited
    priority_support: bool


SUBSCRIPTION_PLANS = {
    "free": SubscriptionPlan(
        id="free",
        name="Free",
        price=0,
        price_yearly=0,
        includes_ai=False,
        ai_credits=50,
        max_widgets=1,
        max_profiles=1,
        priority_support=False,
    ),
    "plus": SubscriptionPlan(
        id="plus",
        name="Plus",
        price=6.99,
        price_yearly=49.90,
        includes_ai=True,
        ai_credits=0,
        max_widgets=0,
        max_profiles=0,
        priority_support=True,
    ),
}


class Subscription(Document):
    user_id: str
    plan_id: str  # free, plus
    status: str = "active"  # active, canceled, past_due, trialing

    # Stripe
    stripe_subscription_id: Optional[str] = None
    stripe_price_id: Optional[str] = None

    # Billing
    billing_period: str = "monthly"  # monthly, yearly
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False

    # Trial
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "subscriptions"
        indexes = [
            "user_id",
            "stripe_subscription_id",
        ]


class Invoice(Document):
    user_id: str
    subscription_id: str
    stripe_invoice_id: str

    amount: float
    currency: str = "usd"
    status: str  # paid, open, void, uncollectible

    invoice_url: Optional[str] = None
    invoice_pdf: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None

    class Settings:
        name = "invoices"
        indexes = [
            "user_id",
            "subscription_id",
        ]
