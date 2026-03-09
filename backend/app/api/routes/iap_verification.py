"""
IAP (In-App Purchase) verification endpoints for Apple App Store
and Google Play subscriptions.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.beta.credit_service import credit_service
from app.services.payment.iap_verification_service import (
    AppleIAPVerifier,
    GooglePlayVerifier,
    IAPVerificationResult,
)

logger = get_logger(__name__)
router = APIRouter()

_plus_product_ids = frozenset(settings.IAP_PLUS_PRODUCT_IDS.split(","))


class AppleVerifyRequest(BaseModel):
    transaction_id: str
    signed_transaction: str


class GoogleVerifyRequest(BaseModel):
    purchase_token: str
    product_id: str


async def _upgrade_to_plus(
    user: User, store_transaction_id: str, store_name: str
) -> dict:
    """Upgrade user to Plus tier and refill credits."""
    user.subscription_tier = "plus"
    user.subscription_status = "active"
    user.subscription_id = store_transaction_id
    if user.role == "viewer":
        user.role = "user"
    await user.save()

    if credit_service._service is not None:
        await credit_service._service.refill_monthly_credits(
            user_id=str(user.id), is_plus=True
        )

    logger.info(
        "User upgraded to Plus via IAP",
        extra={
            "user_id": str(user.id),
            "store": store_name,
            "transaction_id": store_transaction_id,
        },
    )

    return {"status": "ok", "tier": "plus"}


def _validate_product(result: IAPVerificationResult) -> None:
    """Raise if the verified product is not a Plus tier product."""
    if result.product_id not in _plus_product_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Product {result.product_id} is not a Plus subscription",
        )


@router.post("/verify-apple")
async def verify_apple_purchase(
    request: AppleVerifyRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify an Apple App Store signed transaction and upgrade user."""
    verifier = AppleIAPVerifier(settings)
    result = await verifier.verify_transaction(request.signed_transaction)

    if not result.valid:
        logger.warning(
            "Apple IAP verification rejected",
            extra={
                "user_id": str(current_user.id),
                "error": result.error,
            },
        )
        raise HTTPException(
            status_code=400,
            detail=f"Apple verification failed: {result.error}",
        )

    _validate_product(result)

    return await _upgrade_to_plus(
        current_user,
        result.original_transaction_id,
        "apple",
    )


@router.post("/verify-google")
async def verify_google_purchase(
    request: GoogleVerifyRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify a Google Play purchase token and upgrade user."""
    if request.product_id not in _plus_product_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Product {request.product_id} is not a Plus subscription",
        )

    verifier = GooglePlayVerifier(settings)
    result = await verifier.verify_purchase(
        request.product_id, request.purchase_token
    )

    if not result.valid:
        logger.warning(
            "Google Play IAP verification rejected",
            extra={
                "user_id": str(current_user.id),
                "error": result.error,
            },
        )
        raise HTTPException(
            status_code=400,
            detail=f"Google verification failed: {result.error}",
        )

    return await _upgrade_to_plus(
        current_user,
        request.purchase_token,
        "google",
    )
