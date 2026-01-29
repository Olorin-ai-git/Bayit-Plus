"""
Beta Credit Model

Tracks AI credit allocation and usage for Beta 500 users.
"""

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field, field_validator


class BetaCredit(Document):
    """
    AI credit allocation for a beta user.

    Attributes:
        user_id: Reference to BetaUser ID (unique, indexed)
        total_credits: Total credits allocated
        used_credits: Credits consumed
        remaining_credits: Credits available
        is_expired: Whether credits have expired
        created_at: Credit allocation timestamp
        updated_at: Last update timestamp
    """

    user_id: Indexed(str, unique=True)  # type: ignore
    total_credits: int = Field(ge=0)
    used_credits: int = Field(default=0, ge=0)
    remaining_credits: int = Field(ge=0)
    is_expired: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "beta_credits"
        indexes = [
            "user_id",  # Unique index
            [("is_expired", 1), ("remaining_credits", 1)],  # Active credits query
            [("updated_at", -1)],  # Recent updates
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "total_credits": 5000,
                "used_credits": 1250,
                "remaining_credits": 3750,
                "is_expired": False,
                "created_at": "2026-01-29T10:00:00Z",
                "updated_at": "2026-01-29T14:30:00Z"
            }
        }

    @field_validator('remaining_credits', mode='before')
    @classmethod
    def validate_remaining(cls, v, info):
        """Ensure remaining credits is non-negative."""
        if v < 0:
            raise ValueError("remaining_credits cannot be negative")
        return v

    def usage_percentage(self) -> float:
        """Calculate percentage of credits used."""
        if self.total_credits == 0:
            return 0.0
        return (self.used_credits / self.total_credits) * 100

    def is_low_balance(self, threshold: int) -> bool:
        """Check if remaining credits are below threshold."""
        return self.remaining_credits < threshold

    def can_deduct(self, amount: int) -> bool:
        """Check if sufficient credits available for deduction."""
        return not self.is_expired and self.remaining_credits >= amount
