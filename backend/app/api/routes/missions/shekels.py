"""
Shekel Currency Routes.

Endpoints for wallet balance, transaction history,
and earn rate information.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import get_current_user
from app.models.shekel_currency import (
    TransactionResponse,
    WalletResponse,
)
from app.models.user import User
from app.services.mission.shekel_service import shekel_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/shekels", tags=["shekels"])


class EarnRateResponse(BaseModel):
    """API response for shekel earn rates."""
    mission_easy_min: int
    mission_easy_max: int
    mission_medium_min: int
    mission_medium_max: int
    mission_hard_min: int
    mission_hard_max: int
    perfect_quiz_bonus: int
    streak_multiplier: float
    phrase_learn_reward: int


@router.get("/balance", response_model=WalletResponse)
async def get_balance(
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Get shekel wallet balance for a user/profile."""
    wallet = await shekel_service.get_or_create_wallet(
        user_id=str(user.id),
        profile_id=profile_id,
    )
    return WalletResponse(
        balance=wallet.balance,
        total_earned=wallet.total_earned,
        total_spent=wallet.total_spent,
    )


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    profile_id: Optional[str] = Query(None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get shekel transaction history."""
    transactions = await shekel_service.get_transactions(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=limit,
        offset=offset,
    )

    return [
        TransactionResponse(
            transaction_type=t.transaction_type.value,
            amount=t.amount,
            balance_after=t.balance_after,
            description=t.description,
            description_he=t.description_he,
            reference_id=t.reference_id,
            created_at=t.created_at.isoformat(),
        )
        for t in transactions
    ]


@router.get("/earn-rates", response_model=EarnRateResponse)
async def get_earn_rates(
    user: User = Depends(get_current_user),
):
    """Get current shekel earn rates from configuration."""
    return EarnRateResponse(
        mission_easy_min=settings.SHEKEL_MISSION_EASY_MIN,
        mission_easy_max=settings.SHEKEL_MISSION_EASY_MAX,
        mission_medium_min=settings.SHEKEL_MISSION_MEDIUM_MIN,
        mission_medium_max=settings.SHEKEL_MISSION_MEDIUM_MAX,
        mission_hard_min=settings.SHEKEL_MISSION_HARD_MIN,
        mission_hard_max=settings.SHEKEL_MISSION_HARD_MAX,
        perfect_quiz_bonus=settings.SHEKEL_PERFECT_QUIZ_BONUS,
        streak_multiplier=settings.SHEKEL_STREAK_BONUS_MULTIPLIER,
        phrase_learn_reward=settings.SHEKEL_PHRASE_LEARN_REWARD,
    )
