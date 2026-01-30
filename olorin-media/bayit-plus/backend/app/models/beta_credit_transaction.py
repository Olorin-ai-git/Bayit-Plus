"""
Beta Credit Transaction Model

Audit trail for all credit operations (deductions, refunds, expirations).
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from beanie import Document
from pydantic import Field


class BetaCreditTransaction(Document):
    """
    Credit transaction record for audit trail.

    Attributes:
        user_id: Reference to BetaUser ID
        credit_id: Reference to BetaCredit ID
        transaction_type: Type of transaction (debit, credit, refund, expired)
        amount: Credit amount (negative for debits, positive for credits)
        feature: Feature that consumed credits (live_dubbing, ai_search, etc.)
        balance_after: Remaining balance after transaction
        metadata: Additional transaction metadata
        created_at: Transaction timestamp
    """

    user_id: str
    credit_id: str
    transaction_type: str = Field(
        pattern="^(debit|credit|refund|expired)$"
    )
    amount: int
    feature: Optional[str] = None
    balance_after: int = Field(ge=0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "beta_credit_transactions"
        indexes = [
            [("user_id", 1), ("created_at", -1)],  # User activity timeline
            [("feature", 1), ("created_at", -1)],  # Feature analytics
            [("credit_id", 1), ("created_at", -1)],  # Credit audit trail
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "credit_id": "507f191e810c19729de860ea",
                "transaction_type": "debit",
                "amount": -120,
                "feature": "live_dubbing",
                "balance_after": 3750,
                "metadata": {
                    "session_id": "sess_abc123",
                    "duration_seconds": 120
                },
                "created_at": "2026-01-29T14:30:00Z"
            }
        }

    def is_debit(self) -> bool:
        """Check if transaction is a debit (credit consumption)."""
        return self.transaction_type == "debit" and self.amount < 0

    def is_credit(self) -> bool:
        """Check if transaction is a credit (credit addition)."""
        return self.transaction_type == "credit" and self.amount > 0

    def is_refund(self) -> bool:
        """Check if transaction is a refund."""
        return self.transaction_type == "refund"
