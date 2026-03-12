"""
Beta Credits Client API

Authenticated endpoints for client-side credit operations with dedup.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService

logger = get_logger(__name__)
router = APIRouter(prefix="/beta/credits", tags=["beta-credits"])


class ClientDeductRequest(BaseModel):
    """Client-facing credit deduction request with dedup fields."""

    amount: int
    reason: str
    feature_id: Optional[str] = None
    content_id: Optional[str] = None


class ClientDeductResponse(BaseModel):
    """Client-facing credit deduction response."""

    remaining_credits: int
    total_credits: int
    used_credits: int
    is_low: bool
    is_critical: bool
    already_unlocked: bool


async def _get_credit_service(
    settings: Settings = Depends(get_settings),
    db=Depends(get_database),
) -> BetaCreditService:
    """Dependency injection for BetaCreditService."""
    return BetaCreditService(
        settings=settings,
        metering_service=MeteringService(),
        db=db,
    )


async def _check_already_unlocked(
    user_id: str,
    feature_id: str,
    content_id: str,
) -> bool:
    """Check if user already unlocked this feature for this content."""
    existing = await BetaCreditTransaction.find_one(
        {
            "user_id": user_id,
            "feature": "vod_feature_unlock",
            "transaction_type": "debit",
            "metadata.feature_id": feature_id,
            "metadata.content_id": content_id,
        }
    )
    return existing is not None


@router.post("/use", response_model=ClientDeductResponse)
async def use_credits(
    request: ClientDeductRequest,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(_get_credit_service),
):
    """
    Authenticated credit deduction with dedup for VOD AI features.

    If the user already unlocked this feature for this content,
    returns the current balance with already_unlocked=True and
    does not deduct again.
    """
    user_id = str(current_user.id)

    try:
        # Dedup check when feature_id and content_id are present
        if request.feature_id and request.content_id:
            already = await _check_already_unlocked(
                user_id, request.feature_id, request.content_id
            )
            if already:
                return await _build_response(
                    credit_service, user_id, already_unlocked=True
                )

        # Deduct credits
        success, remaining = await credit_service.deduct_credits(
            user_id=user_id,
            feature="vod_feature_unlock",
            usage_amount=request.amount,
            metadata={
                "reason": request.reason,
                "feature_id": request.feature_id,
                "content_id": request.content_id,
            },
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits",
            )

        return await _build_response(
            credit_service, user_id, already_unlocked=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Client credit deduction error",
            extra={"user_id": user_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credit deduction failed",
        )


async def _build_response(
    credit_service: BetaCreditService,
    user_id: str,
    already_unlocked: bool,
) -> ClientDeductResponse:
    """Build standardized response with current balance."""
    credit = await BetaCredit.find_one(
        {"user_id": user_id, "is_expired": False}
    )

    if not credit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit record not found",
        )

    is_low, _ = await credit_service.is_low_balance(user_id)
    is_critical, _ = await credit_service.is_critical_balance(user_id)

    return ClientDeductResponse(
        remaining_credits=credit.remaining_credits,
        total_credits=credit.total_credits,
        used_credits=credit.used_credits,
        is_low=is_low,
        is_critical=is_critical,
        already_unlocked=already_unlocked,
    )
