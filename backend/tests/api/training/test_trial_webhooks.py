"""Tests for trial lifecycle Stripe webhook handlers (Tasks 13-16)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.trial_config import TrialConfig

_MOD = "app.api.routes.training.trial_webhooks"


def _active_tc(selected_tier="organization"):
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
        expires_at=datetime.now(timezone.utc) - timedelta(days=0),
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


def _mock_platform_config():
    from app.models.platform_config import SubscriptionPlan, TrialDefaults

    cfg = MagicMock()
    cfg.trial_defaults = TrialDefaults()
    cfg.tier_limits = {"free": 50, "team": 500, "organization": 2000}
    cfg.seat_limits = {"free": 5, "team": 25, "organization": 100}
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


def _invoice_paid_event(sub_id="sub_test"):
    return {"data": {"object": {"subscription": sub_id}}}


def _payment_failed_event(sub_id="sub_test"):
    return {"data": {"object": {"subscription": sub_id}}}


def _trial_will_end_event(sub_id="sub_test"):
    return {"data": {"object": {"id": sub_id}}}


def _subscription_deleted_event(sub_id="sub_test"):
    return {"data": {"object": {"id": sub_id}}}


# ------------------------------------------------------------------
# Task 13: invoice.paid -> converted
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invoice_paid_transitions_to_converted():
    """Active trial transitions to converted on invoice.paid."""
    from app.api.routes.training.trial_webhooks import handle_invoice_paid

    partner = _make_partner(_active_tc(selected_tier="organization"))
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()
    th_coll = MagicMock()
    th_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.PlatformConfig") as MockPC,
        patch(f"{_MOD}.TrialHistory") as MockTH,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        MockTH.get_pymongo_collection.return_value = th_coll

        await handle_invoice_paid(_invoice_paid_event())

    ip_coll.update_one.assert_called_once()
    call_args = ip_coll.update_one.call_args
    update_set = call_args[0][1]["$set"]
    assert update_set["training_config.trial_config.state"] == "converted"
    assert update_set["training_config.org_tier"] == "organization"
    assert update_set["training_config.credit_limit_monthly"] == 2000
    assert update_set["training_config.seat_limit"] == 100

    th_coll.update_one.assert_called_once()
    th_args = th_coll.update_one.call_args
    th_set = th_args[0][1]["$set"]
    assert th_set["outcome"] == "converted"
    assert th_set["outcome_at"] is not None


@pytest.mark.asyncio
async def test_invoice_paid_idempotent():
    """Second call for already-converted trial is a no-op."""
    from app.api.routes.training.trial_webhooks import handle_invoice_paid

    partner = _make_partner(_converted_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.PlatformConfig") as MockPC,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )

        await handle_invoice_paid(_invoice_paid_event())

    ip_coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_invoice_paid_no_subscription():
    """invoice.paid without subscription field is a no-op."""
    from app.api.routes.training.trial_webhooks import handle_invoice_paid

    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock()
        await handle_invoice_paid({"data": {"object": {"subscription": None}}})
    MockIP.find_one.assert_not_called()


# ------------------------------------------------------------------
# Task 14: invoice.payment_failed -> grace
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payment_failed_transitions_to_grace():
    """Active trial transitions to grace on payment failure."""
    from app.api.routes.training.trial_webhooks import (
        handle_invoice_payment_failed,
    )

    partner = _make_partner(_active_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.PlatformConfig") as MockPC,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )

        await handle_invoice_payment_failed(_payment_failed_event())

    ip_coll.update_one.assert_called_once()
    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    assert update_set["training_config.trial_config.state"] == "grace"
    locked_at = update_set["training_config.trial_config.locked_at"]
    assert locked_at > datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_payment_failed_only_from_active():
    """payment_failed for non-active trial is a no-op."""
    from app.api.routes.training.trial_webhooks import (
        handle_invoice_payment_failed,
    )

    partner = _make_partner(_grace_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll

        await handle_invoice_payment_failed(_payment_failed_event())

    ip_coll.update_one.assert_not_called()


# ------------------------------------------------------------------
# Task 15: customer.subscription.trial_will_end -> warning email
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_trial_will_end_marks_sent():
    """trial_will_end records sent_emails entry."""
    from app.api.routes.training.trial_webhooks import handle_trial_will_end

    partner = _make_partner(_active_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll

        await handle_trial_will_end(_trial_will_end_event())

    ip_coll.update_one.assert_called_once()
    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    key = "training_config.trial_config.sent_emails.training_trial_ending_soon"
    assert key in update_set


@pytest.mark.asyncio
async def test_trial_will_end_idempotent():
    """Second trial_will_end call is a no-op when email already sent."""
    from app.api.routes.training.trial_webhooks import handle_trial_will_end

    tc = _active_tc()
    tc.sent_emails["training_trial_ending_soon"] = datetime.now(timezone.utc)
    partner = _make_partner(tc)
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()

    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll

        await handle_trial_will_end(_trial_will_end_event())

    ip_coll.update_one.assert_not_called()


# ------------------------------------------------------------------
# Task 16: customer.subscription.deleted -> cancelled (bug fix)
# ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscription_deleted_transitions_to_cancelled():
    """subscription.deleted transitions to cancelled with purge_at."""
    from app.api.routes.training.trial_webhooks import (
        handle_subscription_deleted,
    )

    partner = _make_partner(_active_tc())
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()
    th_coll = MagicMock()
    th_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.PlatformConfig") as MockPC,
        patch(f"{_MOD}.TrialHistory") as MockTH,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        MockTH.get_pymongo_collection.return_value = th_coll

        await handle_subscription_deleted(_subscription_deleted_event())

    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    assert update_set["training_config.trial_config.state"] == "cancelled"
    purge_at = update_set["training_config.trial_config.purge_at"]
    assert purge_at > datetime.now(timezone.utc)

    th_set = th_coll.update_one.call_args[0][1]["$set"]
    assert th_set["outcome"] == "cancelled"


@pytest.mark.asyncio
async def test_subscription_deleted_does_not_revert_to_team():
    """Regression: org_tier must NOT be set to 'team' with 500 credits."""
    from app.api.routes.training.trial_webhooks import (
        handle_subscription_deleted,
    )

    partner = _make_partner(_active_tc(selected_tier="organization"))
    ip_coll = MagicMock()
    ip_coll.update_one = AsyncMock()
    th_coll = MagicMock()
    th_coll.update_one = AsyncMock()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.PlatformConfig") as MockPC,
        patch(f"{_MOD}.TrialHistory") as MockTH,
    ):
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = ip_coll
        MockPC.get_singleton = AsyncMock(
            return_value=_mock_platform_config()
        )
        MockTH.get_pymongo_collection.return_value = th_coll

        await handle_subscription_deleted(_subscription_deleted_event())

    update_set = ip_coll.update_one.call_args[0][1]["$set"]
    assert "training_config.org_tier" not in update_set
    assert "training_config.credit_limit_monthly" not in update_set
