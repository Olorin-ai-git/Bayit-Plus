"""Tests for trial tier change (Task 17) and trial extension (Task 18)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.trial_config import TrialConfig

_CHECKOUT_MOD = "app.api.routes.training.checkout"
_EXTEND_MOD = "app.api.routes.training.trial_extend"


def _active_tc(selected_tier="team", extension_days_total=0):
    return TrialConfig(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=10),
        selected_tier=selected_tier,
        stripe_customer_id="cus_test",
        stripe_subscription_id="sub_test",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
        extension_days_total=extension_days_total,
    )


def _grace_tc():
    return TrialConfig(
        state="grace",
        started_at=datetime.now(timezone.utc) - timedelta(days=18),
        expires_at=datetime.now(timezone.utc) - timedelta(days=4),
        selected_tier="team",
        stripe_customer_id="cus_test",
        stripe_subscription_id="sub_test",
        eval_credits_remaining=0,
        byoc_uploads_remaining=0,
        xapi_exports_remaining=0,
        assignments_remaining=0,
        branding_uploads_remaining=0,
    )


def _converted_tc():
    return TrialConfig(
        state="converted",
        started_at=datetime.now(timezone.utc) - timedelta(days=14),
        expires_at=datetime.now(timezone.utc),
        selected_tier="organization",
        stripe_customer_id="cus_test",
        stripe_subscription_id="sub_test",
        eval_credits_remaining=0,
        byoc_uploads_remaining=0,
        xapi_exports_remaining=0,
        assignments_remaining=0,
        branding_uploads_remaining=0,
    )


def _make_partner(trial_config, partner_id="test-partner"):
    partner = MagicMock()
    partner.id = "obj_id_123"
    partner.partner_id = partner_id
    partner.training_config = {
        "org_display_name": "Test Org",
        "org_tier": "trial",
        "trial_config": trial_config.model_dump(mode="json"),
    }
    return partner


def _make_partner_no_trial(partner_id="test-partner"):
    partner = MagicMock()
    partner.id = "obj_id_123"
    partner.partner_id = partner_id
    partner.training_config = {"org_display_name": "Paid Org"}
    return partner


def _mock_platform_config():
    from app.models.platform_config import SubscriptionPlan, TrialDefaults

    cfg = MagicMock()
    cfg.trial_defaults = TrialDefaults()
    cfg.subscription_plans = [
        SubscriptionPlan(
            id="team", name="Team", price_monthly=349,
            price_annual=279, stripe_price_id_monthly="price_team",
            stripe_price_id_annual="price_team_yr",
        ),
        SubscriptionPlan(
            id="organization", name="Organization", price_monthly=599,
            price_annual=479, stripe_price_id_monthly="price_org",
            stripe_price_id_annual="price_org_yr",
        ),
    ]
    return cfg


def _make_admin(partner_id="test-partner"):
    admin = MagicMock()
    admin.partner_id = partner_id
    admin.email = "admin@example.com"
    admin.role = "admin"
    return admin


def _make_superadmin():
    sa = MagicMock()
    sa.email = "super@olorin.ai"
    sa.role = "superadmin"
    return sa


# ------------------------------------------------------------------
# Task 17: POST /checkout/change-selected-tier
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_change_selected_tier_updates_stripe_and_db():
    """Happy path: tier switches from team to organization."""
    from app.api.routes.training.checkout import change_selected_tier
    from app.api.routes.training.checkout import ChangeTierRequest

    partner = _make_partner(_active_tc(selected_tier="team"))
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    mock_sub = {"items": {"data": [MagicMock(id="si_item_1")]}}

    with (
        patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_CHECKOUT_MOD}.PlatformConfig") as MockPC,
        patch(f"{_CHECKOUT_MOD}.stripe") as mock_stripe,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        mock_stripe.Subscription.retrieve.return_value = mock_sub
        mock_stripe.Subscription.modify.return_value = {}

        req = ChangeTierRequest(selected_tier="organization")
        result = await change_selected_tier(req, _make_admin())

    assert result["selected_tier"] == "organization"

    ip_coll.update_one.assert_called_once()
    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    assert update_set[
        "training_config.trial_config.selected_tier"
    ] == "organization"

    mock_stripe.Subscription.modify.assert_called_once()
    modify_kwargs = mock_stripe.Subscription.modify.call_args
    assert modify_kwargs[1]["items"][0]["price"] == "price_org"


@pytest.mark.asyncio
async def test_change_tier_rejects_non_trial():
    """Converted partner cannot change tier."""
    from app.api.routes.training.checkout import change_selected_tier
    from app.api.routes.training.checkout import ChangeTierRequest

    partner = _make_partner(_converted_tc())

    with patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        req = ChangeTierRequest(selected_tier="team")
        with pytest.raises(HTTPException) as exc:
            await change_selected_tier(req, _make_admin())
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_change_tier_allowed_in_grace():
    """Grace-period trial can still switch tier."""
    from app.api.routes.training.checkout import change_selected_tier
    from app.api.routes.training.checkout import ChangeTierRequest

    partner = _make_partner(_grace_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()
    mock_sub = {"items": {"data": [MagicMock(id="si_item_1")]}}

    with (
        patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_CHECKOUT_MOD}.PlatformConfig") as MockPC,
        patch(f"{_CHECKOUT_MOD}.stripe") as mock_stripe,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        mock_stripe.Subscription.retrieve.return_value = mock_sub
        mock_stripe.Subscription.modify.return_value = {}

        req = ChangeTierRequest(selected_tier="organization")
        result = await change_selected_tier(req, _make_admin())

    assert result["selected_tier"] == "organization"


@pytest.mark.asyncio
async def test_change_tier_rejects_no_partner():
    """Missing partner returns 404."""
    from app.api.routes.training.checkout import change_selected_tier
    from app.api.routes.training.checkout import ChangeTierRequest

    with patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=None)

        req = ChangeTierRequest(selected_tier="team")
        with pytest.raises(HTTPException) as exc:
            await change_selected_tier(req, _make_admin())
        assert exc.value.status_code == 404


# ------------------------------------------------------------------
# Task 18: POST /superadmin/training/trials/{partner_id}/extend
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extend_trial_happy_path():
    """Extend trial by 7 days within cap."""
    from app.api.routes.training.trial_extend import extend_trial
    from app.api.routes.training.trial_extend import ExtendTrialRequest

    tc = _active_tc(extension_days_total=0)
    partner = _make_partner(tc)
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with (
        patch(f"{_EXTEND_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_EXTEND_MOD}.PlatformConfig") as MockPC,
        patch(f"{_EXTEND_MOD}.stripe") as mock_stripe,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        mock_stripe.Subscription.modify.return_value = {}

        req = ExtendTrialRequest(days=7)
        result = await extend_trial("test-partner", req, _make_superadmin())

    assert result["extension_days_total"] == 7

    ip_coll.update_one.assert_called_once()
    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    assert update_set[
        "training_config.trial_config.extension_days_total"
    ] == 7

    mock_stripe.Subscription.modify.assert_called_once()
    call_kwargs = mock_stripe.Subscription.modify.call_args
    assert "trial_end" in call_kwargs[1]


@pytest.mark.asyncio
async def test_extend_trial_rejects_over_cap():
    """Extension that would exceed 30-day cap is rejected."""
    from app.api.routes.training.trial_extend import extend_trial
    from app.api.routes.training.trial_extend import ExtendTrialRequest

    tc = _active_tc(extension_days_total=25)
    partner = _make_partner(tc)

    with (
        patch(f"{_EXTEND_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_EXTEND_MOD}.PlatformConfig") as MockPC,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )

        req = ExtendTrialRequest(days=10)
        with pytest.raises(HTTPException) as exc:
            await extend_trial("test-partner", req, _make_superadmin())
        assert exc.value.status_code == 400
        assert "30-day cap" in exc.value.detail


@pytest.mark.asyncio
async def test_extend_trial_rejects_no_trial():
    """Partner without trial_config returns 400."""
    from app.api.routes.training.trial_extend import extend_trial
    from app.api.routes.training.trial_extend import ExtendTrialRequest

    partner = _make_partner_no_trial()

    with patch(f"{_EXTEND_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        req = ExtendTrialRequest(days=5)
        with pytest.raises(HTTPException) as exc:
            await extend_trial("test-partner", req, _make_superadmin())
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_extend_trial_rejects_unknown_partner():
    """Unknown partner_id returns 404."""
    from app.api.routes.training.trial_extend import extend_trial
    from app.api.routes.training.trial_extend import ExtendTrialRequest

    with patch(f"{_EXTEND_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=None)

        req = ExtendTrialRequest(days=5)
        with pytest.raises(HTTPException) as exc:
            await extend_trial("ghost", req, _make_superadmin())
        assert exc.value.status_code == 404


# ------------------------------------------------------------------
# POST /checkout/convert-now
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_convert_now_succeeds_during_active_trial():
    """Active trial: Stripe modify is called with trial_end=now, returns 200."""
    from app.api.routes.training.checkout import convert_now_endpoint

    partner = _make_partner(_active_tc())

    with (
        patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_CHECKOUT_MOD}.stripe") as mock_stripe,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        mock_stripe.Subscription.modify.return_value = {}

        result = await convert_now_endpoint(_make_admin())

    assert result["status"] == "conversion_initiated"
    mock_stripe.Subscription.modify.assert_called_once_with(
        "sub_test", trial_end="now",
    )


@pytest.mark.asyncio
async def test_convert_now_succeeds_during_grace():
    """Grace trial can also be force-converted."""
    from app.api.routes.training.checkout import convert_now_endpoint

    partner = _make_partner(_grace_tc())

    with (
        patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_CHECKOUT_MOD}.stripe") as mock_stripe,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        mock_stripe.Subscription.modify.return_value = {}

        result = await convert_now_endpoint(_make_admin())

    assert result["status"] == "conversion_initiated"


@pytest.mark.asyncio
async def test_convert_now_rejects_paid_org():
    """Partner with no trial_config (paid org) returns 400."""
    from app.api.routes.training.checkout import convert_now_endpoint

    partner = _make_partner_no_trial()

    with patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        with pytest.raises(HTTPException) as exc:
            await convert_now_endpoint(_make_admin())
        assert exc.value.status_code == 400
        assert "No active trial" in exc.value.detail


@pytest.mark.asyncio
async def test_convert_now_rejects_converted_trial():
    """Already-converted trial cannot be re-converted."""
    from app.api.routes.training.checkout import convert_now_endpoint

    partner = _make_partner(_converted_tc())

    with patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)

        with pytest.raises(HTTPException) as exc:
            await convert_now_endpoint(_make_admin())
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_convert_now_rejects_no_partner():
    """Missing partner returns 404."""
    from app.api.routes.training.checkout import convert_now_endpoint

    with patch(f"{_CHECKOUT_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc:
            await convert_now_endpoint(_make_admin())
        assert exc.value.status_code == 404
