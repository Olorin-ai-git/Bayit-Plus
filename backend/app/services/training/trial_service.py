"""Trial enforcement service.

See spec section 'Enforcement' and plan section 'Shared Types'.
"""
import logging

from fastapi import HTTPException, status

from app.models.integration_partner import IntegrationPartner

logger = logging.getLogger(__name__)


_STATE_BLOCK = {"locked", "cancelled", "purged"}
_STATE_PASS = {"converted"}
_CAP_FEATURES = {
    "eval_credits", "byoc_uploads", "xapi_exports",
    "assignments", "branding_uploads",
}


async def check_trial_permits(partner, feature: str) -> None:
    """Raise 402 if trial state or per-feature cap blocks this action.

    No-op when partner has no trial_config (paid org) or is converted.
    """
    tc = getattr(partner.training_config, "trial_config", None)
    if tc is None:
        return
    if tc.state in _STATE_PASS:
        return
    if tc.state in _STATE_BLOCK:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Trial ended. Upgrade to resume.",
        )
    if tc.state == "grace":
        return  # grace permits continued use; read-only enforced per-route
    # state == "active"
    if feature == "viewer_feature":
        return
    if feature not in _CAP_FEATURES:
        return
    remaining = getattr(tc, f"{feature}_remaining", None)
    if remaining is not None and remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Trial preview cap reached for {feature}. Upgrade.",
        )


async def decrement_trial_cap(partner_id, feature: str) -> bool:
    """Atomic decrement of trial_config.<feature>_remaining.

    Uses $inc: -1 with a $gt: 0 filter guard so it never goes negative.
    Returns True if decremented, False if cap already at zero.
    """
    if feature not in _CAP_FEATURES:
        raise ValueError(f"Unknown cap feature: {feature}")
    path = f"training_config.trial_config.{feature}_remaining"
    result = await IntegrationPartner.get_pymongo_collection().find_one_and_update(
        {"_id": partner_id, path: {"$gt": 0}},
        {"$inc": {path: -1}},
    )
    return result is not None
