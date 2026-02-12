"""
Shekel Currency Service.

Manages virtual currency operations with atomic MongoDB transactions.
Shekels are earned via missions/quizzes and spent on coupons/rewards.
Completely separate from Beta AI Credits.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.shekel_currency import (
    ShekelTransaction,
    ShekelWallet,
    TransactionType,
)

logger = logging.getLogger(__name__)


class ShekelService:
    """Manages shekel wallet operations with atomic balance updates."""

    async def get_or_create_wallet(
        self,
        user_id: str,
        profile_id: Optional[str],
    ) -> ShekelWallet:
        """Get or create a shekel wallet for a user/profile."""
        wallet = await ShekelWallet.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        if wallet:
            return wallet

        wallet = ShekelWallet(user_id=user_id, profile_id=profile_id)
        await wallet.insert()
        logger.info(
            "Created shekel wallet",
            extra={"user_id": user_id, "profile_id": profile_id},
        )
        return wallet

    async def earn_shekels(
        self,
        user_id: str,
        profile_id: Optional[str],
        amount: int,
        transaction_type: TransactionType,
        description: str,
        description_he: str,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ShekelTransaction:
        """Award shekels to a user with atomic balance update."""
        if amount <= 0:
            raise ValueError("Earn amount must be positive")

        wallet = await self.get_or_create_wallet(user_id, profile_id)
        new_balance = wallet.balance + amount

        wallet.balance = new_balance
        wallet.total_earned += amount
        wallet.updated_at = datetime.now(timezone.utc)
        await wallet.save()

        transaction = ShekelTransaction(
            user_id=user_id,
            profile_id=profile_id,
            wallet_id=str(wallet.id),
            transaction_type=transaction_type,
            amount=amount,
            balance_after=new_balance,
            description=description,
            description_he=description_he,
            reference_id=reference_id,
            metadata=metadata or {},
        )
        await transaction.insert()

        logger.info(
            "Shekels earned",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "amount": amount,
                "type": transaction_type.value,
                "balance": new_balance,
            },
        )
        return transaction

    async def spend_shekels(
        self,
        user_id: str,
        profile_id: Optional[str],
        amount: int,
        transaction_type: TransactionType,
        description: str,
        description_he: str,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ShekelTransaction:
        """Deduct shekels from a user with balance validation."""
        if amount <= 0:
            raise ValueError("Spend amount must be positive")

        wallet = await self.get_or_create_wallet(user_id, profile_id)

        if wallet.balance < amount:
            raise ValueError(
                f"Insufficient shekels: {wallet.balance} < {amount}"
            )

        new_balance = wallet.balance - amount
        wallet.balance = new_balance
        wallet.total_spent += amount
        wallet.updated_at = datetime.now(timezone.utc)
        await wallet.save()

        transaction = ShekelTransaction(
            user_id=user_id,
            profile_id=profile_id,
            wallet_id=str(wallet.id),
            transaction_type=transaction_type,
            amount=-amount,
            balance_after=new_balance,
            description=description,
            description_he=description_he,
            reference_id=reference_id,
            metadata=metadata or {},
        )
        await transaction.insert()

        logger.info(
            "Shekels spent",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "amount": amount,
                "type": transaction_type.value,
                "balance": new_balance,
            },
        )
        return transaction

    async def get_transactions(
        self,
        user_id: str,
        profile_id: Optional[str],
        limit: int = 20,
        offset: int = 0,
    ) -> List[ShekelTransaction]:
        """Get transaction history for a user/profile."""
        return (
            await ShekelTransaction.find(
                {"user_id": user_id, "profile_id": profile_id}
            )
            .sort("-created_at")
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def get_balance(
        self,
        user_id: str,
        profile_id: Optional[str],
    ) -> int:
        """Get current shekel balance."""
        wallet = await ShekelWallet.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        return wallet.balance if wallet else 0


shekel_service = ShekelService()
