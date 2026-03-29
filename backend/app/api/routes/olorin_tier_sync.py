"""
Internal endpoint for syncing Olorin tier from Stripe checkout.
Protected by internal API key.
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()

PRODUCT_TO_TIER = {
    "olorin-fan": "fan",
    "olorin-superfan": "superfan",
}


class TierSyncRequest(BaseModel):
    email: str
    product: str
    action: str  # "activate" or "deactivate"


def _verify_internal_key(api_key: str) -> None:
    if not settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(status_code=503, detail="Internal API key not configured")
    if api_key != settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


async def _sync_tier(email: str, product: str, action: str) -> dict:
    user = await User.find_one({"email": email})
    if not user:
        logger.warning(
            "Tier sync: user not found",
            extra={"email": email, "product": product},
        )
        return {"status": "user_not_found", "email": email}

    if action == "activate":
        new_tier = PRODUCT_TO_TIER.get(product, "free")
    else:
        new_tier = "free"

    old_tier = user.olorin_tier
    user.olorin_tier = new_tier
    await user.save()

    logger.info(
        "Olorin tier synced",
        extra={
            "email": email,
            "old_tier": old_tier,
            "new_tier": new_tier,
            "action": action,
        },
    )

    return {"status": "synced", "email": email, "tier": new_tier}


@router.post("/internal/olorin-tier-sync")
async def olorin_tier_sync(
    body: TierSyncRequest,
    x_internal_api_key: str = Header(..., alias="X-Internal-Api-Key"),
) -> dict:
    _verify_internal_key(x_internal_api_key)
    return await _sync_tier(body.email, body.product, body.action)
