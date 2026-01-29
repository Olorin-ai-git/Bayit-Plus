"""
Beta User Model

Represents users in the Beta 500 closed beta program.
"""

from datetime import datetime, timedelta
from typing import Optional
from beanie import Document, Indexed
from pydantic import EmailStr, Field


class BetaUser(Document):
    """
    Beta 500 program participant.

    Attributes:
        email: User email (unique, indexed)
        status: User status (pending_verification, active, expired, suspended)
        verification_token: HMAC-SHA256 token for email verification
        verified_at: Timestamp when email was verified
        created_at: Signup timestamp
        expires_at: Beta program expiration date
    """

    email: Indexed(EmailStr, unique=True)  # type: ignore
    status: str = Field(
        default="pending_verification",
        pattern="^(pending_verification|active|expired|suspended)$"
    )
    verification_token: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    class Settings:
        name = "beta_users"
        indexes = [
            "email",  # Unique index for email lookups
            [("status", 1), ("created_at", -1)],  # Status + creation time
            "verification_token",  # Sparse index for token lookups
            "expires_at",  # Expiration queries
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
            (self.expires_at is None or self.expires_at > datetime.utcnow())
        )

    def is_expired(self) -> bool:
        """Check if beta period has expired."""
        return (
            self.expires_at is not None and
            self.expires_at <= datetime.utcnow()
        )

    def days_remaining(self) -> int:
        """Calculate days remaining in beta period."""
        if self.expires_at is None:
            return 0
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
