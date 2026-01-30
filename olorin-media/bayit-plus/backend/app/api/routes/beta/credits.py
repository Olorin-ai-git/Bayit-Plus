"""
Beta Credits API

Endpoints for credit balance and deduction management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.core.security import get_current_user, get_current_admin_user
from app.models.user import User
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


class SimpleCreditBalanceResponse(BaseModel):
    """Simplified credit balance response for frontend."""
    balance: int
    is_beta_user: bool


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


@router.get("/balance", response_model=SimpleCreditBalanceResponse)
async def get_my_credit_balance(
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
    db = Depends(get_database)
):
    """
    Get current authenticated user's credit balance.

    Returns:
        Simplified credit balance with is_beta_user flag
    """
    try:
        # Check if user is beta user (use raw MongoDB query)
        beta_user = await db.beta_users.find_one({"email": current_user.email})
        if not beta_user or not beta_user.get("is_beta_user", False):
            return SimpleCreditBalanceResponse(
                balance=0,
                is_beta_user=False
            )

        # Get credit record (use raw MongoDB query)
        credit = await db.beta_credits.find_one({
            "user_id": str(current_user.id),
            "is_expired": False
        })

        if not credit:
            return SimpleCreditBalanceResponse(
                balance=0,
                is_beta_user=True
            )

        return SimpleCreditBalanceResponse(
            balance=credit.get("remaining_credits", 0),
            is_beta_user=True
        )
    except Exception as e:
        logger.error(
            "Error fetching credit balance",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit balance"
        )


@router.get("/balance/{user_id}", response_model=CreditBalanceResponse)
async def get_credit_balance(
    user_id: str,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service)
):
    """
    Get user's credit balance (admin-only or self).

    Requires authentication. Non-admin users can only view their own balance.

    Args:
        user_id: User ID
        current_user: Authenticated user

    Returns:
        Credit balance details

    Raises:
        HTTPException: 403 if user is not admin and user_id doesn't match current user
    """
    # Authorization: Admin or self-only
    if current_user.role != "admin" and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's balance"
        )
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
    current_user: User = Depends(get_current_admin_user),
    credit_service: BetaCreditService = Depends(get_credit_service)
):
    """
    Deduct credits (admin-only internal endpoint).

    **SECURITY**: This endpoint requires admin authentication.
    It should only be called by internal services with admin credentials.

    Args:
        request: Deduction request
        current_user: Authenticated admin user

    Returns:
        Deduction result with remaining credits

    Raises:
        HTTPException: 401 if not authenticated, 403 if not admin
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
