"""
Beta User Model

Represents users in the Beta 500 closed beta program.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from beanie import Document, Indexed
from pydantic import EmailStr, Field
import pymongo


class BetaUser(Document):
    """
    Beta 500 program participant.

    Attributes:
        email: User email (unique, indexed)
        name: User display name
        status: User status (pending_verification, active, expired, suspended)
        is_beta_user: Beta program participant flag
        invitation_code: Beta invitation code used
        device_fingerprint: SHA-256 device fingerprint for fraud detection
        verification_token: HMAC-SHA256 token for email verification
        verified_at: Timestamp when email was verified
        created_at: Signup timestamp
        expires_at: Beta program expiration date
    """

    email: Indexed(EmailStr, unique=True)  # type: ignore
    name: Optional[str] = Field(default=None, description="User display name")
    status: str = Field(
        default="pending_verification",
        pattern="^(pending_verification|active|expired|suspended)$"
    )
    is_beta_user: bool = Field(default=False, description="Beta program participant flag")
    invitation_code: Optional[str] = Field(default=None, description="Beta invitation code used")
    device_fingerprint: Optional[str] = Field(default=None, description="SHA-256 device fingerprint for fraud detection")
    verification_token: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

    class Settings:
        name = "beta_users"
        indexes = [
            pymongo.IndexModel([("email", pymongo.ASCENDING)], unique=True),
            pymongo.IndexModel([("status", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)]),
            pymongo.IndexModel([("verification_token", pymongo.ASCENDING)], sparse=True),
            pymongo.IndexModel([("expires_at", pymongo.ASCENDING)]),
            pymongo.IndexModel([("device_fingerprint", pymongo.ASCENDING)]),
            pymongo.IndexModel([("is_beta_user", pymongo.ASCENDING)]),
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "status": "active",
                "verified_at": "2026-01-29T12:00:00Z",
                "created_at": "2026-01-29T10:00:00Z",
                "expires_at": "2026-04-29T10:00:00Z"
            }
        }

    def is_active(self) -> bool:
        """Check if user is active (verified and not expired)."""
        return (
            self.status == "active" and
            self.verified_at is not None and
            (self.expires_at is None or self.expires_at > datetime.now(timezone.utc))
        )

    def is_expired(self) -> bool:
        """Check if beta period has expired."""
        return (
            self.expires_at is not None and
            self.expires_at <= datetime.now(timezone.utc)
        )

    def days_remaining(self) -> int:
        """Calculate days remaining in beta period."""
        if self.expires_at is None:
            return 0
        delta = self.expires_at - datetime.now(timezone.utc)
        return max(0, delta.days)
