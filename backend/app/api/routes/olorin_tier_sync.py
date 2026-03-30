"""
Internal endpoint for syncing Olorin tier from Stripe checkout.
Protected by internal API key.

When a user pays via Stripe, the checkout webhook calls this endpoint
to set their olorin_tier and allocate credits. If the user doesn't
exist yet (paid before visiting demo.olorin.ai), we create them.
"""

import hmac

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Literal

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
    action: Literal["activate", "deactivate"]


def _verify_internal_key(api_key: str) -> None:
    if not settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(status_code=503, detail="Internal API key not configured")
    if not hmac.compare_digest(api_key, settings.INTERNAL_CRON_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")


async def _create_user_for_tier_sync(email: str) -> User:
    """
    Create a new User when Stripe payment arrives before first login.

    Registers at auth.olorin.ai (same derived-password pattern as
    demo-token) and creates the local User document.
    """
    from app.api.routes.auth_demo_token import _derive_demo_password
    from app.services.auth_service_client import get_auth_service_client

    auth_client = get_auth_service_client()
    password = _derive_demo_password(email)
    name = email.split("@")[0]

    try:
        auth_response = await auth_client.register(
            email=email, password=password, name=name,
        )
    except ValueError:
        # Already registered at auth service — login instead
        auth_response = await auth_client.login(
            email=email, password=password,
        )

    user = await auth_client.create_user_in_bayit_db(
        auth_service_user_id=auth_response["user_id"],
        email=auth_response["email"],
        name=auth_response.get("name", name),
        role=auth_response.get("role", "user"),
    )
    user.payment_pending = False
    await user.save()

    logger.info(
        "Created user during tier sync",
        extra={"email": email, "user_id": str(user.id)},
    )
    return user


async def _allocate_tier_credits(
    user_id: str, tier: str, is_plus: bool = False,
) -> None:
    """Immediately allocate credits matching the activated tier."""
    from app.core.database import get_database
    from app.services.beta.credit_service import BetaCreditService
    from app.services.olorin.metering.service import MeteringService

    db = get_database()
    credit_svc = BetaCreditService(
        settings=settings,
        metering_service=MeteringService(),
        db=db,
    )
    await credit_svc.refill_monthly_credits(
        user_id=user_id,
        olorin_tier=tier,
        is_plus=is_plus,
    )
    logger.info(
        "Credits allocated for tier activation",
        extra={"user_id": user_id, "tier": tier},
    )


async def _sync_tier(email: str, product: str, action: str) -> dict:
    user = await User.find_one({"email": email})

    if not user:
        if action == "deactivate":
            logger.warning(
                "Tier sync deactivate: user not found, nothing to do",
                extra={"email": email, "product": product},
            )
            return {"status": "user_not_found", "email": email}

        try:
            user = await _create_user_for_tier_sync(email)
        except Exception as exc:
            logger.error(
                "Tier sync: failed to create user",
                extra={"email": email, "error": str(exc)},
            )
            return {"status": "user_creation_failed", "email": email}

    if action == "activate":
        new_tier = PRODUCT_TO_TIER.get(product)
        if new_tier is None:
            logger.warning(
                "Unknown product in tier sync, ignoring",
                extra={"email": email, "product": product},
            )
            return {"status": "unknown_product", "product": product}
    else:
        new_tier = "free"

    old_tier = user.olorin_tier
    user.olorin_tier = new_tier
    await user.save()

    # Allocate credits immediately — don't wait for monthly cron
    try:
        is_plus = getattr(user, "subscription_tier", "free") == "plus"
        await _allocate_tier_credits(str(user.id), new_tier, is_plus)
    except Exception as exc:
        logger.error(
            "Tier sync: credit allocation failed",
            extra={
                "email": email,
                "tier": new_tier,
                "error": str(exc),
            },
        )
        # Tier is set even if credits fail — cron will catch up

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
