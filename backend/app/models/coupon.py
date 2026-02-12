"""
Coupon / Partner Rewards Models.

Coupons are offered by integration partners and redeemed with shekels.
Each coupon has a shekel cost and optional expiration.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class CouponStatus(str, Enum):
    """Coupon availability status."""

    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    DISABLED = "disabled"


class Coupon(Document):
    """
    Partner coupon available for shekel redemption.

    Managed by admin, linked to IntegrationPartner.
    """

    coupon_id: str = Field(..., description="Unique coupon identifier")
    partner_id: Optional[str] = Field(
        None, description="IntegrationPartner reference"
    )

    title: str = Field(..., max_length=200)
    title_he: str = Field(..., max_length=200)
    description: str = Field(..., max_length=500)
    description_he: str = Field(..., max_length=500)
    image_url: Optional[str] = None

    shekel_cost: int = Field(..., ge=1)
    original_value: str = Field(
        default="", description="Display value, e.g. '$10 off'"
    )

    total_quantity: int = Field(default=-1, description="-1 = unlimited")
    redeemed_count: int = Field(default=0, ge=0)
    max_per_user: int = Field(default=1, ge=1)

    status: CouponStatus = Field(default=CouponStatus.ACTIVE)
    expires_at: Optional[datetime] = None

    category: str = Field(default="general", max_length=50)
    tags: List[str] = Field(default_factory=list)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "coupons"
        indexes = [
            IndexModel([("coupon_id", 1)], unique=True),
            IndexModel([("status", 1)]),
            IndexModel([("category", 1)]),
            IndexModel([("shekel_cost", 1)]),
        ]

    @property
    def is_available(self) -> bool:
        """Check if coupon can still be redeemed."""
        if self.status != CouponStatus.ACTIVE:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        if self.total_quantity > 0 and self.redeemed_count >= self.total_quantity:
            return False
        return True


class CouponRedemption(Document):
    """
    Record of a coupon redemption by a user.

    Immutable audit trail of shekel-to-coupon exchanges.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)
    coupon_id: str = Field(...)
    partner_id: Optional[str] = None

    shekel_cost: int = Field(..., ge=1)
    redemption_code: str = Field(
        ..., description="Unique code for partner verification"
    )

    redeemed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "coupon_redemptions"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)]),
            IndexModel([("coupon_id", 1)]),
            IndexModel([("redeemed_at", -1)]),
        ]


class CouponResponse(BaseModel):
    """API response for a coupon."""

    coupon_id: str
    title: str
    title_he: str
    description: str
    description_he: str
    image_url: Optional[str] = None
    shekel_cost: int
    original_value: str
    is_available: bool
    category: str

    class Config:
        from_attributes = True


class RedemptionResponse(BaseModel):
    """API response for a coupon redemption."""

    coupon_id: str
    redemption_code: str
    shekel_cost: int
    redeemed_at: str

    class Config:
        from_attributes = True
