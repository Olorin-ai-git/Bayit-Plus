"""Zeh Ani -- Real-Time Hebrew Identity Engine services."""

from __future__ import annotations

from typing import TYPE_CHECKING, Tuple

from app.core.logging_config import get_logger

if TYPE_CHECKING:
    from app.models.user import User

logger = get_logger(__name__)


async def deduct_zeh_ani_credits(
    user_id: str,
    feature: str,
    usage_amount: float,
    metadata: dict,
    user: User | None = None,
) -> Tuple[bool, int]:
    """
    Deduct beta credits for a Zeh Ani feature.

    Admin users bypass credit deduction entirely.
    Returns (success, remaining_credits).
    """
    if user and user.is_admin_user():
        logger.info(
            "Admin user - skipping credit deduction",
            extra={
                "user_id": user_id,
                "feature": feature,
            },
        )
        return True, -1

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
