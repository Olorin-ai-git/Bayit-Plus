"""Detect training portal users in main app routes and deduct credits."""

import logging
from typing import Optional

from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User
from app.services.training.credit_service import TrainingCreditService

logger = logging.getLogger(__name__)

_credit_service: TrainingCreditService | None = None


def _get_credit_service() -> TrainingCreditService:
    global _credit_service
    if _credit_service is None:
        _credit_service = TrainingCreditService(settings)
    return _credit_service


def get_training_partner_id(user: User) -> Optional[str]:
    """Return partner_id if user is a training portal user, else None."""
    return getattr(user, "_training_partner_id", None)


async def deduct_training_credits_if_applicable(
    user: User,
    feature: str,
) -> None:
    """
    If the user is a training user, deduct credits. Raise 402 if insufficient.
    If the user is a B2C user, this is a no-op.
    """
    partner_id = get_training_partner_id(user)
    if not partner_id:
        return

    svc = _get_credit_service()
    success, remaining = await svc.deduct(
        partner_id=partner_id,
        feature=feature,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient AI credits. Upgrade your plan for more credits.",
            headers={"X-Credits-Remaining": "0"},
        )

    logger.info(
        "Training credits deducted via main route",
        extra={
            "partner_id": partner_id,
            "feature": feature,
            "remaining": remaining,
        },
    )
