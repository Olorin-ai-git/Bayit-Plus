"""Training platform user model for Olorin Training workspace."""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING, IndexModel


TrainingRole = Literal["admin", "viewer", "teacher", "superadmin"]
TrainingUserStatus = Literal["pending", "active", "deactivated"]


class TrainingConfig(BaseModel):
    """Training-specific org settings embedded on IntegrationPartner."""

    org_display_name: str = Field(
        ..., description="Organization display name"
    )
    logo_url: Optional[str] = Field(
        default=None, description="Organization logo URL"
    )
    accent_color: Optional[str] = Field(
        default=None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Accent color (hex)",
    )
    seat_limit: int = Field(
        default=25, ge=1, description="Maximum employees"
    )
    credit_limit_monthly: int = Field(
        default=500, ge=0, description="Monthly AI credit allocation"
    )
    trial_ends_at: Optional[datetime] = Field(
        default=None, description="Trial expiration date"
    )
    org_tier: str = Field(
        default="team",
        pattern=r"^(team|organization|trial)$",
        description="Organization sub-tier",
    )
    credits_used: int = Field(
        default=0, ge=0, description="Credits consumed this billing period"
    )
    credits_remaining: int = Field(
        default=0,
        ge=0,
        description=(
            "Credits remaining in this billing period — D-16; default=0 required "
            "so existing TrainingConfig docs without this field deserialize without "
            "AttributeError"
        ),
    )
    stripe_customer_id: Optional[str] = Field(
        default=None, description="Stripe customer ID"
    )
    stripe_subscription_id: Optional[str] = Field(
        default=None, description="Stripe subscription ID"
    )


class TrainingUser(Document):
    """Employee or admin in a training organization."""

    email: EmailStr = Field(..., description="User email")
    password_hash: str = Field(..., description="bcrypt hashed password")
    partner_id: str = Field(
        ..., description="Organization partner_id reference"
    )
    role: TrainingRole = Field(
        default="viewer", description="User role in the org"
    )
    display_name: str = Field(..., description="Display name")
    department: Optional[str] = Field(
        default=None, description="Department or team"
    )
    status: TrainingUserStatus = Field(
        default="pending", description="Account status"
    )
    email_verified: bool = Field(
        default=True,
        description="Email verification status (default True for backward compat)",
    )

    invited_by: Optional[str] = Field(
        default=None, description="ID of admin who sent the invite"
    )
    invite_token: Optional[str] = Field(
        default=None, description="One-time invite acceptance token"
    )
    invited_at: Optional[datetime] = Field(default=None)
    activated_at: Optional[datetime] = Field(default=None)
    last_login_at: Optional[datetime] = Field(default=None)

    password_reset_token: Optional[str] = Field(
        default=None, description="One-time password reset token"
    )
    password_reset_expires_at: Optional[datetime] = Field(
        default=None, description="Password reset token expiry"
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "training_users"
        indexes = [
            IndexModel(
                [("email", ASCENDING), ("partner_id", ASCENDING)],
                unique=True,
                name="email_partner_unique",
            ),
            "partner_id",
            "status",
            [("partner_id", 1), ("status", 1)],
            [("partner_id", 1), ("role", 1)],
            IndexModel(
                [("invite_token", ASCENDING)],
                unique=True,
                sparse=True,
                name="invite_token_unique",
            ),
            IndexModel(
                [("password_reset_token", ASCENDING)],
                unique=True,
                sparse=True,
                name="password_reset_token_unique",
            ),
        ]
