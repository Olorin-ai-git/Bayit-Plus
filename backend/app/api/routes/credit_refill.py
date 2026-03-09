"""
Monthly credit refill endpoint for Cloud Scheduler.

Triggers monthly AI credit refill for all users based on tier.
Protected by internal API key -- not for public consumption.
"""

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService
from app.core.database import get_database

logger = get_logger(__name__)

router = APIRouter()


def _verify_internal_key(api_key: str) -> None:
    """Validate internal API key from request header."""
    if not settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Internal cron API key not configured",
        )
    if api_key != settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


def _build_credit_service() -> BetaCreditService:
    """Construct BetaCreditService with injected dependencies."""
    db = get_database()
    metering = MeteringService()
    return BetaCreditService(
        settings=settings,
        metering_service=metering,
        db=db,
    )


@router.post("/internal/credit-refill")
async def trigger_monthly_credit_refill(
    x_internal_api_key: str = Header(..., alias="X-Internal-Api-Key"),
) -> dict:
    """
    Trigger monthly credit refill for all users.

    Called by Cloud Scheduler on the 1st of each month.
    """
    _verify_internal_key(x_internal_api_key)

    credit_service = _build_credit_service()
    users = await User.find_all().to_list()
    refilled_count = 0
    error_count = 0

    for user in users:
        user_id = str(user.id)
        is_plus = user.subscription_tier == "plus"
        try:
            await credit_service.refill_monthly_credits(
                user_id=user_id, is_plus=is_plus
            )
            refilled_count += 1
        except Exception as exc:
            error_count += 1
            logger.error(
                "Credit refill failed for user",
                extra={"user_id": user_id, "error": str(exc)},
            )

    logger.info(
        "Monthly credit refill completed",
        extra={
            "refilled_count": refilled_count,
            "error_count": error_count,
            "total_users": len(users),
        },
    )

    return {
        "refilled": refilled_count,
        "errors": error_count,
        "total": len(users),
    }
