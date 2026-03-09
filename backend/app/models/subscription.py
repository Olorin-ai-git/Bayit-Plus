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
    "free": SubscriptionPlan(
        id="free",
        name="חינם",
        price=0,
        price_yearly=0,
        features=[
            "כל ערוצי השידור החי",
            "רדיו ופודקאסטים",
            "ספרי שמע",
            "חיבור תוכן BYOC",
            "צפייה על מכשיר אחד",
            "איכות HD",
            "50 קרדיטי AI בחודש",
        ],
        max_streams=1,
        quality="hd",
        includes_live=True,
        includes_ai=False,
        includes_downloads=False,
    ),
    "plus": SubscriptionPlan(
        id="plus",
        name="פלוס",
        price=6.99,
        price_yearly=49.99,
        features=[
            "כל ערוצי השידור החי",
            "רדיו ופודקאסטים",
            "ספרי שמע",
            "חיבור תוכן BYOC",
            "עוזר AI חכם",
            "דיבוב AI בזמן אמת",
            "צפייה על 4 מכשירים",
            "איכות 4K",
            "500 קרדיטי AI בחודש",
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
