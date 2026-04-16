"""Trial enforcement service.

See spec section 'Enforcement' and plan section 'Shared Types'.
"""
from fastapi import HTTPException, status


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
