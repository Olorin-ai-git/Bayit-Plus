from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import BaseModel, Field


class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price: float
    price_yearly: float
    features: list[str]
    max_streams: int
    quality: str  # sd, hd, 4k
    includes_live: bool
    includes_ai: bool
    includes_downloads: bool


SUBSCRIPTION_PLANS = {
    "basic": SubscriptionPlan(
        id="basic",
        name="בסיסי",
        price=9.99,
        price_yearly=99.90,
        features=[
            "כל תוכן ה-VOD",
            "רדיו ופודקאסטים",
            "צפייה על מכשיר אחד",
            "איכות SD",
        ],
        max_streams=1,
        quality="sd",
        includes_live=False,
        includes_ai=False,
        includes_downloads=False,
    ),
    "premium": SubscriptionPlan(
        id="premium",
        name="פרימיום",
        price=14.99,
        price_yearly=149.90,
        features=[
            "כל תוכן ה-VOD",
            "ערוצי שידור חי",
            "רדיו ופודקאסטים",
            "עוזר AI חכם",
            "צפייה על 2 מכשירים",
            "איכות HD",
        ],
        max_streams=2,
        quality="hd",
        includes_live=True,
        includes_ai=True,
        includes_downloads=False,
    ),
    "family": SubscriptionPlan(
        id="family",
        name="משפחתי",
        price=19.99,
        price_yearly=199.90,
        features=[
            "כל תוכן ה-VOD",
            "ערוצי שידור חי",
            "רדיו ופודקאסטים",
            "עוזר AI חכם",
            "צפייה על 4 מכשירים",
            "איכות 4K",
            "5 פרופילים משפחתיים",
            "הורדה לצפייה אופליין",
        ],
        max_streams=4,
        quality="4k",
        includes_live=True,
        includes_ai=True,
        includes_downloads=True,
    ),
}


class Subscription(Document):
    user_id: str
    plan_id: str  # basic, premium, family
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
