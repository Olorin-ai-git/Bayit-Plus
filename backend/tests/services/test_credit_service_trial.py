"""Tests for trial-org credit routing through eval_credits_remaining."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.integration_partner import IntegrationPartner
from app.models.trial_config import TrialConfig
from app.services.training.credit_service import TrainingCreditService


async def _create_trial_partner(
    eval_credits: int = 50,
) -> IntegrationPartner:
    """Insert a partner with active trial_config for credit testing."""
    tc = TrialConfig(
        state="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        selected_tier="organization",
        stripe_customer_id="cus_test",
        stripe_subscription_id="sub_test",
        eval_credits_remaining=eval_credits,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
    )
    partner = IntegrationPartner(
        partner_id=f"trial-credit-{datetime.now(timezone.utc).timestamp()}",
        name="Trial Credit Test Org",
        api_key_hash="$2b$12$fakehashfortesting000000000000000000000000000000",
        api_key_prefix="trcredit",
        contact_email="trial-credit@test.olorin.ai",
        billing_tier="training",
        training_config={"trial_config": tc.model_dump(mode="json")},
    )
    await partner.insert()
    return partner


async def _create_paid_partner(
    credits_remaining: int = 500,
) -> IntegrationPartner:
    """Insert a paid partner (no trial_config) for regression testing."""
    partner = IntegrationPartner(
        partner_id=f"paid-credit-{datetime.now(timezone.utc).timestamp()}",
        name="Paid Credit Test Org",
        api_key_hash="$2b$12$fakehashfortesting000000000000000000000000000000",
        api_key_prefix="pdcredit",
        contact_email="paid-credit@test.olorin.ai",
        billing_tier="training",
        training_config={
            "credits_remaining": credits_remaining,
            "credits_used": 0,
            "credit_limit_monthly": 500,
        },
    )
    await partner.insert()
    return partner


def _make_service() -> TrainingCreditService:
    """Build a TrainingCreditService with default test settings."""
    from unittest.mock import MagicMock

    mock = MagicMock()
    mock.TRAINING_CREDIT_PAUSE_ASK_VOICE = 1
    mock.TRAINING_CREDIT_PAUSE_ASK_LIPSYNC = 3
    mock.TRAINING_CREDIT_COMPANION = 1
    mock.TRAINING_CREDIT_COMPREHENSION = 1
    mock.TRAINING_CREDIT_SEARCH = 2
    mock.TRAINING_CREDIT_TALK_BACK = 3
    mock.TRAINING_CREDIT_CULTURAL = 2
    mock.TRAINING_CREDIT_RECAP = 2
    return TrainingCreditService(mock)


# ── Trial org: eval_credits_remaining ──


@pytest.mark.asyncio
async def test_trial_partner_decrements_eval_credits(olorin_db_client):
    p = await _create_trial_partner(eval_credits=50)
    svc = _make_service()
    ok, remaining = await svc.deduct(
        partner_id=p.partner_id, feature="companion",
    )
    assert ok is True
    assert remaining == 49
    refreshed = await IntegrationPartner.get(p.id)
    tc = refreshed.training_config
    if isinstance(tc, dict):
        assert tc["trial_config"]["eval_credits_remaining"] == 49
    else:
        assert tc.trial_config.eval_credits_remaining == 49


@pytest.mark.asyncio
async def test_trial_partner_blocks_at_zero(olorin_db_client):
    p = await _create_trial_partner(eval_credits=0)
    svc = _make_service()
    ok, remaining = await svc.deduct(
        partner_id=p.partner_id, feature="companion",
    )
    assert ok is False
    assert remaining == 0


@pytest.mark.asyncio
async def test_trial_multi_credit_feature(olorin_db_client):
    """search costs 2 credits — verify multi-credit atomic deduct."""
    p = await _create_trial_partner(eval_credits=5)
    svc = _make_service()
    ok, remaining = await svc.deduct(
        partner_id=p.partner_id, feature="search",
    )
    assert ok is True
    assert remaining == 3


@pytest.mark.asyncio
async def test_trial_insufficient_for_multi_credit(olorin_db_client):
    """search costs 2 but only 1 credit left — should fail."""
    p = await _create_trial_partner(eval_credits=1)
    svc = _make_service()
    ok, _ = await svc.deduct(
        partner_id=p.partner_id, feature="search",
    )
    assert ok is False


@pytest.mark.asyncio
async def test_trial_does_not_touch_paid_credits(olorin_db_client):
    """Trial deduction must not decrement credits_remaining."""
    p = await _create_trial_partner(eval_credits=50)
    svc = _make_service()
    await svc.deduct(partner_id=p.partner_id, feature="companion")
    refreshed = await IntegrationPartner.get(p.id)
    tc = refreshed.training_config
    paid_remaining = (
        tc.get("credits_remaining", 0) if isinstance(tc, dict)
        else getattr(tc, "credits_remaining", 0)
    )
    assert paid_remaining == 0  # unchanged from initial


# ── Paid org: credits_remaining (regression) ──


@pytest.mark.asyncio
async def test_paid_partner_decrements_credits_remaining(olorin_db_client):
    p = await _create_paid_partner(credits_remaining=500)
    svc = _make_service()
    ok, remaining = await svc.deduct(
        partner_id=p.partner_id, feature="companion",
    )
    assert ok is True
    assert remaining == 499


@pytest.mark.asyncio
async def test_paid_partner_blocks_at_zero(olorin_db_client):
    p = await _create_paid_partner(credits_remaining=0)
    svc = _make_service()
    ok, _ = await svc.deduct(
        partner_id=p.partner_id, feature="companion",
    )
    assert ok is False
