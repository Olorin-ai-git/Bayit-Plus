"""Reusable tier-gate FastAPI dependencies for the training platform.

Usage::

    from app.api.routes.training.tier_gates import require_tier

    @router.post("/exports")
    async def create_export(
        user: TrainingUser = Depends(require_tier("enterprise")),
    ):
        ...

For trial-aware routes that need to decrement caps::

    from app.api.routes.training.tier_gates import require_tier_or_trial

    @router.post("/byoc/import")
    async def import_source(
        tier_result: tuple = Depends(
            require_tier_or_trial("organization", trial_feature="byoc_uploads")
        ),
    ):
        user, partner = tier_result
        ...

The dependency authenticates the user, resolves the partner's org tier,
and raises 403 if the tier is not in the allowed set.  Higher tiers
always satisfy lower-tier requirements (enterprise > organization > team).
"""

import logging
from typing import Tuple

from fastapi import Depends, HTTPException, status

from app.api.routes.training.dependencies import (
    get_current_training_user,
    _parse_trial_config,
)
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

TIER_HIERARCHY: dict[str, int] = {
    "free": 0,
    "team": 1,
    "organization": 2,
    "enterprise": 3,
}


async def resolve_partner_tier(partner_id: str) -> str:
    """Return the org tier for a training partner, defaulting to 'team'."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": partner_id}
    )
    if not partner:
        return "team"
    tc = partner.training_config or {}
    return tc.get("org_tier", "team")


def require_tier(*minimum_tiers: str):
    """Return a FastAPI dependency that enforces a minimum tier.

    Accepts one or more tier names.  The user's org tier must be at
    least as high as the *lowest* tier listed (hierarchical check),
    or exactly match one of the listed tiers (explicit whitelist).

    Examples::

        Depends(require_tier("organization"))     # org or enterprise
        Depends(require_tier("enterprise"))        # enterprise only
    """
    min_level = min(
        TIER_HIERARCHY.get(t, 0) for t in minimum_tiers
    )

    async def _check(
        user: TrainingUser = Depends(get_current_training_user),
    ) -> TrainingUser:
        tier = await resolve_partner_tier(user.partner_id)
        user_level = TIER_HIERARCHY.get(tier, 0)
        if user_level < min_level:
            tier_names = " or ".join(sorted(minimum_tiers))
            logger.warning(
                "Tier gate blocked: user=%s tier=%s required=%s",
                user.email, tier, tier_names,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {tier_names} tier",
            )
        return user

    return _check


def require_tier_or_trial(
    *minimum_tiers: str, trial_feature: str,
):
    """Tier gate that lets active trial orgs bypass via demo caps.

    Returns ``(TrainingUser, IntegrationPartner)`` so the route can
    call ``decrement_trial_cap`` after the operation succeeds.

    For paid orgs (no trial_config or converted trial), the normal
    tier hierarchy check applies.  For active/grace trial orgs,
    ``check_trial_permits`` decides access based on remaining caps.
    """
    from app.services.training.trial_service import check_trial_permits

    min_level = min(
        TIER_HIERARCHY.get(t, 0) for t in minimum_tiers
    )

    async def _check(
        user: TrainingUser = Depends(get_current_training_user),
    ) -> Tuple[TrainingUser, IntegrationPartner]:
        partner = await IntegrationPartner.find_one(
            {"partner_id": user.partner_id}
        )
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        tc = _parse_trial_config(partner)

        if tc is not None and tc.state in {"active", "grace"}:
            from types import SimpleNamespace

            wrapper = SimpleNamespace(
                training_config=SimpleNamespace(trial_config=tc),
            )
            await check_trial_permits(wrapper, trial_feature)
            return user, partner

        # Paid org or converted trial: enforce tier hierarchy
        raw_tc = partner.training_config or {}
        tier = raw_tc.get("org_tier", "team") if isinstance(
            raw_tc, dict,
        ) else getattr(raw_tc, "org_tier", "team")
        user_level = TIER_HIERARCHY.get(tier, 0)
        if user_level < min_level:
            tier_names = " or ".join(sorted(minimum_tiers))
            logger.warning(
                "Tier gate blocked: user=%s tier=%s required=%s",
                user.email, tier, tier_names,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {tier_names} tier",
            )
        return user, partner

    return _check
