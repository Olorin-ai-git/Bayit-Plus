"""
Verification Token Model
Manages temporary tokens for email and phone verification
"""
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class VerificationToken(Document):
    """Temporary tokens for email and phone verification."""
    user_id: str
    token: str  # UUID4 for email, 6-digit code for phone
    type: str  # "email" or "phone"
    contact: str  # email address or phone number
    expires_at: datetime
    used: bool = False
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "verification_tokens"
        indexes = [
            "token",
            "user_id",
            "expires_at",
            ("type", "used"),
        ]

    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)."""
        return not self.used and self.expires_at > datetime.utcnow()
