"""Tests for trial-aware tier gates and cap decrement wiring."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.trial_config import TrialConfig


def _active_tc(byoc=5, assignments=3, xapi=1, branding=1):
    return TrialConfig(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=10),
        selected_tier="team",
        stripe_customer_id="c",
        stripe_subscription_id="s",
        eval_credits_remaining=50,
        byoc_uploads_remaining=byoc,
        xapi_exports_remaining=xapi,
        assignments_remaining=assignments,
        branding_uploads_remaining=branding,
    )


def _exhausted_tc(feature: str):
    """Active trial with the specified feature cap at zero."""
    caps = {
        "byoc_uploads": 0, "assignments": 0,
        "xapi_exports": 0, "branding_uploads": 0,
    }
    caps[feature] = 0
    return TrialConfig(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=10),
        selected_tier="team",
        stripe_customer_id="c",
        stripe_subscription_id="s",
        eval_credits_remaining=50,
        byoc_uploads_remaining=caps["byoc_uploads"],
        xapi_exports_remaining=caps["xapi_exports"],
        assignments_remaining=caps["assignments"],
        branding_uploads_remaining=caps["branding_uploads"],
    )


def _make_user(role="admin", partner_id="test-partner"):
    user = MagicMock()
    user.id = "user-1"
    user.partner_id = partner_id
    user.role = role
    user.status = "active"
    user.email = "admin@example.com"
    user.display_name = "Admin"
    return user


def _make_partner(trial_config=None, org_tier="team"):
    partner = MagicMock()
    partner.id = "partner-oid-1"
    partner.partner_id = "test-partner"
    if trial_config is not None:
        partner.training_config = {
            "org_display_name": "Test Org",
            "org_tier": org_tier,
            "trial_config": trial_config.model_dump(mode="json"),
        }
    else:
        partner.training_config = {
            "org_display_name": "Paid Org",
            "org_tier": org_tier,
        }
    return partner


_GATES = "app.api.routes.training.tier_gates"


@pytest.mark.asyncio
async def test_trial_org_bypasses_tier_check():
    """Active trial org should pass require_tier_or_trial even on 'team' tier."""
    user = _make_user()
    partner = _make_partner(trial_config=_active_tc(), org_tier="team")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        result = await guard(user)
        assert result == (user, partner)


@pytest.mark.asyncio
async def test_trial_org_blocked_when_cap_exhausted():
    """Active trial org with zero remaining cap should get 402."""
    user = _make_user()
    tc = _exhausted_tc("byoc_uploads")
    partner = _make_partner(trial_config=tc, org_tier="team")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        with pytest.raises(HTTPException) as exc:
            await guard(user)
        assert exc.value.status_code == 402


@pytest.mark.asyncio
async def test_paid_org_uses_tier_hierarchy():
    """Paid org (no trial_config) on 'organization' tier passes org gate."""
    user = _make_user()
    partner = _make_partner(org_tier="organization")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        result = await guard(user)
        assert result == (user, partner)


@pytest.mark.asyncio
async def test_paid_org_blocked_below_tier():
    """Paid org on 'team' tier should be blocked by org-level gate."""
    user = _make_user()
    partner = _make_partner(org_tier="team")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        with pytest.raises(HTTPException) as exc:
            await guard(user)
        assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_converted_trial_uses_tier_hierarchy():
    """Converted trial should fall through to normal tier check."""
    tc = _active_tc()
    tc.state = "converted"
    user = _make_user()
    partner = _make_partner(trial_config=tc, org_tier="organization")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        result = await guard(user)
        assert result == (user, partner)


@pytest.mark.asyncio
async def test_original_require_tier_unchanged():
    """Original require_tier still returns just a TrainingUser."""
    user = _make_user()

    with patch(
        f"{_GATES}.resolve_partner_tier",
        new_callable=AsyncMock,
        return_value="organization",
    ):
        from app.api.routes.training.tier_gates import require_tier

        guard = require_tier("organization")
        result = await guard(user)
        assert result is user


@pytest.mark.asyncio
async def test_grace_trial_passes_gate():
    """Grace-period trial should pass the tier-or-trial gate."""
    tc = _active_tc()
    tc.state = "grace"
    user = _make_user()
    partner = _make_partner(trial_config=tc, org_tier="team")

    with patch(f"{_GATES}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.tier_gates import require_tier_or_trial

        guard = require_tier_or_trial(
            "organization", trial_feature="byoc_uploads",
        )
        result = await guard(user)
        assert result == (user, partner)
