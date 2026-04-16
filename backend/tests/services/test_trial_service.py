from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from app.models.trial_config import TrialConfig
from app.services.training.trial_service import check_trial_permits


def _make_partner(tc: TrialConfig | None):
    p = MagicMock()
    if tc is None:
        p.training_config = MagicMock(trial_config=None)
    else:
        p.training_config = MagicMock(trial_config=tc)
    return p


def _active_tc(**overrides):
    base = dict(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        selected_tier="organization",
        stripe_customer_id="c", stripe_subscription_id="s",
        eval_credits_remaining=50, byoc_uploads_remaining=5,
        xapi_exports_remaining=1, assignments_remaining=3,
        branding_uploads_remaining=1,
    )
    base.update(overrides)
    return TrialConfig(**base)


@pytest.mark.asyncio
async def test_paid_org_is_noop():
    await check_trial_permits(_make_partner(None), "byoc_uploads")


@pytest.mark.asyncio
@pytest.mark.parametrize("state", ["locked", "cancelled", "purged"])
async def test_blocked_states_raise_402(state):
    with pytest.raises(HTTPException) as e:
        await check_trial_permits(_make_partner(_active_tc(state=state)), "byoc_uploads")
    assert e.value.status_code == 402


@pytest.mark.asyncio
async def test_grace_permits_all_features():
    await check_trial_permits(_make_partner(_active_tc(state="grace")), "viewer_feature")
    await check_trial_permits(_make_partner(_active_tc(state="grace")), "byoc_uploads")


@pytest.mark.asyncio
async def test_active_cap_exhausted_raises_402():
    with pytest.raises(HTTPException) as e:
        await check_trial_permits(
            _make_partner(_active_tc(byoc_uploads_remaining=0)), "byoc_uploads"
        )
    assert e.value.status_code == 402


@pytest.mark.asyncio
async def test_active_cap_available_permits():
    await check_trial_permits(
        _make_partner(_active_tc(byoc_uploads_remaining=3)), "byoc_uploads"
    )


@pytest.mark.asyncio
async def test_viewer_feature_state_only():
    await check_trial_permits(_make_partner(_active_tc()), "viewer_feature")


@pytest.mark.asyncio
async def test_converted_state_is_noop():
    await check_trial_permits(_make_partner(_active_tc(state="converted")), "byoc_uploads")
