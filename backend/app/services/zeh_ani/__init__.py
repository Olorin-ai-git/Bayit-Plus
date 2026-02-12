"""Zeh Ani -- Real-Time Hebrew Identity Engine services."""

from typing import Tuple

from app.core.logging_config import get_logger

logger = get_logger(__name__)


async def deduct_zeh_ani_credits(
    user_id: str,
    feature: str,
    usage_amount: float,
    metadata: dict,
) -> Tuple[bool, int]:
    """
    Deduct beta credits for a Zeh Ani feature.

    Instantiates BetaCreditService with proper DI and delegates to its
    atomic deduct_credits method. Returns (success, remaining_credits).
    """
    from app.core.config import get_settings
    from app.core.database import db
    from app.services.beta.credit_service import BetaCreditService
    from app.services.olorin.metering.service import MeteringService

    credit_service = BetaCreditService(
        settings=get_settings(),
        metering_service=MeteringService(),
        db=db,
    )
    success, remaining = await credit_service.deduct_credits(
        user_id=user_id,
        feature=feature,
        usage_amount=usage_amount,
        metadata=metadata,
    )
    if not success:
        logger.warning(
            "Credit deduction failed for Zeh Ani feature",
            extra={
                "user_id": user_id,
                "feature": feature,
                "usage_amount": usage_amount,
            },
        )
    return success, remaining
