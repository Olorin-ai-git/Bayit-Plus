"""
Shekel Currency Models.

Virtual currency system for Hebrew engagement rewards.
Shekels are earned via missions/quizzes, spent on coupons/rewards.
Completely separate from Beta AI Credits.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class ShekelWallet(Document):
    """
    Per-profile shekel wallet.

    Tracks balance and lifetime stats for the virtual currency.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)

    balance: int = Field(default=0, ge=0)
    total_earned: int = Field(default=0, ge=0)
    total_spent: int = Field(default=0, ge=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "shekel_wallets"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1)], unique=True
            ),
            IndexModel([("balance", -1)]),
        ]


class TransactionType(str, Enum):
    """Types of shekel transactions."""

    MISSION_REWARD = "mission_reward"
    QUIZ_BONUS = "quiz_bonus"
    STREAK_BONUS = "streak_bonus"
    COUPON_REDEMPTION = "coupon_redemption"
    ADMIN_GRANT = "admin_grant"
    ADMIN_DEDUCT = "admin_deduct"
    TALK_BACK_REWARD = "talk_back_reward"
    PHRASE_LEARNING = "phrase_learning"
    OUTFIT_PURCHASE = "outfit_purchase"


class ShekelTransaction(Document):
    """
    Individual shekel transaction record.

    Immutable audit trail of all currency movements.
    """

    user_id: str = Field(...)
    profile_id: Optional[str] = Field(None)
    wallet_id: str = Field(...)

    transaction_type: TransactionType
    amount: int = Field(..., description="Positive=earn, negative=spend")
    balance_after: int = Field(..., ge=0)

    description: str = Field(..., max_length=200)
    description_he: str = Field(default="", max_length=200)

    reference_id: Optional[str] = Field(
        None, description="Mission ID, coupon ID, etc."
    )
    metadata: dict = Field(default_factory=dict)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "shekel_transactions"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)]),
            IndexModel([("wallet_id", 1)]),
            IndexModel([("transaction_type", 1)]),
            IndexModel([("created_at", -1)]),
        ]


class WalletResponse(BaseModel):
    """API response for wallet balance."""

    balance: int
    total_earned: int
    total_spent: int

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    """API response for a transaction."""

    transaction_type: str
    amount: int
    balance_after: int
    description: str
    description_he: str
    reference_id: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
