"""Tests for trial enforcement wiring in auth dependencies."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.trial_config import TrialConfig


def _locked_tc():
    return TrialConfig(
        state="locked",
        started_at=datetime.now(timezone.utc) - timedelta(days=20),
        expires_at=datetime.now(timezone.utc) - timedelta(days=6),
        locked_at=datetime.now(timezone.utc) - timedelta(days=3),
        selected_tier="team",
        stripe_customer_id="c",
        stripe_subscription_id="s",
        eval_credits_remaining=0,
        byoc_uploads_remaining=0,
        xapi_exports_remaining=0,
        assignments_remaining=0,
        branding_uploads_remaining=0,
    )


def _active_tc():
    return TrialConfig(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=10),
        selected_tier="team",
        stripe_customer_id="c",
        stripe_subscription_id="s",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
    )


def _grace_tc():
    return TrialConfig(
        state="grace",
        started_at=datetime.now(timezone.utc) - timedelta(days=18),
        expires_at=datetime.now(timezone.utc) - timedelta(days=4),
        selected_tier="team",
        stripe_customer_id="c",
        stripe_subscription_id="s",
        eval_credits_remaining=0,
        byoc_uploads_remaining=0,
        xapi_exports_remaining=0,
        assignments_remaining=0,
        branding_uploads_remaining=0,
    )


def _make_user(role="viewer", partner_id="test-partner"):
    user = MagicMock()
    user.id = "user-1"
    user.partner_id = partner_id
    user.role = role
    user.status = "active"
    user.email = "test@example.com"
    return user


def _make_partner(trial_config=None, training_config_dict=None):
    """Build a mock IntegrationPartner.

    If *training_config_dict* is provided it is used as-is (simulates
    the raw dict stored in MongoDB).  Otherwise a dict is synthesised
    from *trial_config* to match the real data shape.
    """
    partner = MagicMock()
    partner.partner_id = "test-partner"
    if training_config_dict is not None:
        partner.training_config = training_config_dict
    elif trial_config is not None:
        partner.training_config = {
            "org_display_name": "Test Org",
            "trial_config": trial_config.model_dump(mode="json"),
        }
    else:
        # Paid org: training_config present but no trial_config key
        partner.training_config = {
            "org_display_name": "Paid Org",
        }
    return partner


_DEPS = "app.api.routes.training.dependencies"


@pytest.mark.asyncio
async def test_viewer_blocked_when_trial_locked():
    """Viewer requests must fail 402 when trial is locked."""
    user = _make_user(role="viewer")
    partner = _make_partner(trial_config=_locked_tc())

    with (
        patch(f"{_DEPS}._resolve_user_from_jwt", new_callable=AsyncMock, return_value=user),
        patch(f"{_DEPS}.IntegrationPartner") as MockIP,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.dependencies import get_current_training_user

        creds = MagicMock()
        creds.credentials = "fake.jwt.token"

        with pytest.raises(HTTPException) as exc:
            await get_current_training_user(creds)
        assert exc.value.status_code == 402


@pytest.mark.asyncio
async def test_admin_allowed_in_grace():
    """Admin with grace-period trial must NOT be blocked."""
    user = _make_user(role="admin")
    partner = _make_partner(trial_config=_grace_tc())

    with (
        patch(f"{_DEPS}._resolve_user_from_jwt", new_callable=AsyncMock, return_value=user),
        patch(f"{_DEPS}.IntegrationPartner") as MockIP,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.dependencies import require_training_admin

        result = await require_training_admin(user)
        assert result is user


@pytest.mark.asyncio
async def test_admin_blocked_when_locked():
    """Admin with locked trial must get 402."""
    user = _make_user(role="admin")
    partner = _make_partner(trial_config=_locked_tc())

    with patch(f"{_DEPS}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.dependencies import require_training_admin

        with pytest.raises(HTTPException) as exc:
            await require_training_admin(user)
        assert exc.value.status_code == 402


@pytest.mark.asyncio
async def test_paid_org_unaffected():
    """Partner with no trial_config (paid) passes both gates."""
    user = _make_user(role="admin")
    partner = _make_partner()  # paid org, no trial_config

    with (
        patch(f"{_DEPS}._resolve_user_from_jwt", new_callable=AsyncMock, return_value=user),
        patch(f"{_DEPS}.IntegrationPartner") as MockIP,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)

        from app.api.routes.training.dependencies import (
            get_current_training_user,
            require_training_admin,
        )

        creds = MagicMock()
        creds.credentials = "fake.jwt.token"

        result_user = await get_current_training_user(creds)
        assert result_user is user

        result_admin = await require_training_admin(user)
        assert result_admin is user
