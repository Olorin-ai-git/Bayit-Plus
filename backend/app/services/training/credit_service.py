"""Training platform credit management service."""

import logging

from app.core.config import Settings
from app.models.integration_partner import IntegrationPartner

logger = logging.getLogger(__name__)


class TrainingCreditService:
    """Manages per-feature AI credit deduction for training orgs."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._rate_map = {
            "pause_ask_voice": settings.TRAINING_CREDIT_PAUSE_ASK_VOICE,
            "pause_ask_lipsync": settings.TRAINING_CREDIT_PAUSE_ASK_LIPSYNC,
            "companion": settings.TRAINING_CREDIT_COMPANION,
            "comprehension": settings.TRAINING_CREDIT_COMPREHENSION,
            "search": settings.TRAINING_CREDIT_SEARCH,
            "talk_back": settings.TRAINING_CREDIT_TALK_BACK,
            "cultural": settings.TRAINING_CREDIT_CULTURAL,
            "recap": settings.TRAINING_CREDIT_RECAP,
        }

    def get_cost(self, feature: str) -> int:
        """Return credit cost for a training feature."""
        if feature not in self._rate_map:
            raise ValueError(
                f"Unknown training feature: {feature}. "
                f"Valid: {list(self._rate_map.keys())}"
            )
        return self._rate_map[feature]

    def get_all_rates(self) -> dict[str, int]:
        """Return all feature rates. Used by pricing transparency UI."""
        return dict(self._rate_map)

    async def deduct(
        self,
        partner_id: str,
        feature: str,
    ) -> tuple[bool, int]:
        """
        Atomically deduct credits for a training feature.

        Uses MongoDB find_one_and_update with $inc for atomicity.
        The query includes a balance check so the update only
        applies if sufficient credits remain.

        Returns:
            (success, credits_remaining)
        """
        cost = self.get_cost(feature)
        if cost == 0:
            return (True, -1)

        coll = IntegrationPartner.get_pymongo_collection()

        result = await coll.find_one_and_update(
            {
                "partner_id": partner_id,
                "$expr": {
                    "$lte": [
                        {"$add": ["$training_config.credits_used", cost]},
                        "$training_config.credit_limit_monthly",
                    ]
                },
            },
            {
                "$inc": {
                    "training_config.credits_used": cost,
                    "training_config.credits_remaining": -cost,
                }
            },
            return_document=True,
        )

        if result is None:
            logger.warning(
                "Training credit deduction failed — insufficient credits",
                extra={
                    "partner_id": partner_id,
                    "feature": feature,
                    "cost": cost,
                },
            )
            return (False, 0)

        remaining = result.get("training_config", {}).get(
            "credits_remaining", 0
        )

        logger.info(
            "Training credits deducted",
            extra={
                "partner_id": partner_id,
                "feature": feature,
                "cost": cost,
                "remaining": remaining,
            },
        )
        return (True, remaining)
