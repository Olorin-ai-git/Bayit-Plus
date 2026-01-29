"""
Beta Credits API

Endpoints for credit balance and deduction management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/beta/credits", tags=["beta-credits"])


class CreditBalanceResponse(BaseModel):
    """Credit balance response."""
    user_id: str
    remaining_credits: int
    total_credits: int
    used_credits: int
    is_low: bool
    is_critical: bool


class DeductRequest(BaseModel):
    """Credit deduction request."""
    user_id: str
    feature: str
    usage_amount: float
    metadata: dict = {}


class DeductResponse(BaseModel):
    """Credit deduction response."""
    success: bool
    remaining_credits: int
    message: str


async def get_credit_service(
    settings: Settings = Depends(get_settings),
    db = Depends(get_database)
) -> BetaCreditService:
    """Dependency injection for BetaCreditService."""
    metering_service = MeteringService()
    return BetaCreditService(
        settings=settings,
        metering_service=metering_service,
        db=db
    )


@router.get("/balance/{user_id}", response_model=CreditBalanceResponse)
async def get_credit_balance(
    user_id: str,
    credit_service: BetaCreditService = Depends(get_credit_service)
):
    """
    Get user's credit balance.

    Args:
        user_id: User ID

    Returns:
        Credit balance details
    """
    try:
        from app.models.beta_credit import BetaCredit
        
        # Get credit record
        credit = await BetaCredit.find_one(
            BetaCredit.user_id == user_id,
            BetaCredit.is_expired == False
        )

        if not credit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit record not found"
            )

        # Check thresholds
        is_low, _ = await credit_service.is_low_balance(user_id)
        is_critical, _ = await credit_service.is_critical_balance(user_id)

        return CreditBalanceResponse(
            user_id=user_id,
            remaining_credits=credit.remaining_credits,
            total_credits=credit.total_credits,
            used_credits=credit.used_credits,
            is_low=is_low,
            is_critical=is_critical
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching credit balance",
            extra={"user_id": user_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit balance"
        )


@router.post("/deduct", response_model=DeductResponse)
async def deduct_credits(
    request: DeductRequest,
    credit_service: BetaCreditService = Depends(get_credit_service)
):
    """
    Deduct credits (internal endpoint for services).

    Args:
        request: Deduction request

    Returns:
        Deduction result with remaining credits
    """
    try:
        success, remaining = await credit_service.deduct_credits(
            user_id=request.user_id,
            feature=request.feature,
            usage_amount=request.usage_amount,
            metadata=request.metadata
        )

        if not success:
            return DeductResponse(
                success=False,
                remaining_credits=remaining,
                message="Insufficient credits"
            )

        return DeductResponse(
            success=True,
            remaining_credits=remaining,
            message="Credits deducted successfully"
        )

    except Exception as e:
        logger.error(
            "Credit deduction error",
            extra={
                "user_id": request.user_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credit deduction failed"
        )
