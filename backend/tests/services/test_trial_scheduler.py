"""Tests for the hourly trial state scheduler (Task 19)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.integration_partner import IntegrationPartner
from app.models.platform_config import PlatformConfig
from app.models.trial_config import TrialConfig
from app.models.trial_history import TrialHistory
from app.services.training.trial_scheduler import run_trial_scheduler


def _ts(days_offset: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days_offset)


async def _create_trial_partner(
    state: str = "active",
    started_at: datetime | None = None,
    expires_at: datetime | None = None,
    locked_at: datetime | None = None,
    purge_at: datetime | None = None,
    sent_emails: dict | None = None,
) -> IntegrationPartner:
    """Insert a partner with trial_config at a given state."""
    tc = TrialConfig(
        state=state,
        started_at=started_at or _ts(-7),
        expires_at=expires_at or _ts(7),
        locked_at=locked_at,
        purge_at=purge_at,
        selected_tier="organization",
        stripe_customer_id="cus_sched",
        stripe_subscription_id="sub_sched",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
        sent_emails=sent_emails or {},
    )
    ts_slug = datetime.now(timezone.utc).timestamp()
    partner = IntegrationPartner(
        partner_id=f"sched-{state}-{ts_slug}",
        name="Scheduler Test Org",
        api_key_hash="$2b$12$fakehashfortesting000000000000000000000000000000",
        api_key_prefix="schedtes",
        contact_email="sched@test.olorin.ai",
        billing_tier="training",
        training_config={"trial_config": tc.model_dump(mode="json")},
    )
    await partner.insert()
    return partner


@pytest.mark.asyncio
async def test_active_to_grace_when_expired(olorin_db_client):
    p = await _create_trial_partner(
        state="active",
        started_at=_ts(-15),
        expires_at=_ts(-1),
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert tc["state"] == "grace"
    assert tc["locked_at"] is not None


@pytest.mark.asyncio
async def test_active_not_expired_stays_active(olorin_db_client):
    p = await _create_trial_partner(
        state="active",
        expires_at=_ts(5),
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert tc["state"] == "active"


@pytest.mark.asyncio
async def test_grace_to_locked(olorin_db_client):
    p = await _create_trial_partner(
        state="grace",
        locked_at=_ts(-1),
    )
    await TrialHistory(
        email="grace@test.olorin.ai",
        email_domain="test.olorin.ai",
        partner_id=p.partner_id,
        started_at=_ts(-17),
    ).insert()

    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert tc["state"] == "locked"
    assert tc["purge_at"] is not None

    th = await TrialHistory.find_one({"partner_id": p.partner_id})
    assert th.outcome == "locked"


@pytest.mark.asyncio
async def test_locked_to_purged(olorin_db_client):
    p = await _create_trial_partner(
        state="locked",
        purge_at=_ts(-1),
    )
    await TrialHistory(
        email="locked@test.olorin.ai",
        email_domain="test.olorin.ai",
        partner_id=p.partner_id,
        started_at=_ts(-50),
    ).insert()

    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert tc["state"] == "purged"
    assert doc.training_config.get("branding") is None

    th = await TrialHistory.find_one({"partner_id": p.partner_id})
    assert th.outcome == "purged"


@pytest.mark.asyncio
async def test_idempotent_no_double_transition(olorin_db_client):
    """Running scheduler twice on an expired active trial should stop at grace."""
    p = await _create_trial_partner(
        state="active",
        started_at=_ts(-15),
        expires_at=_ts(-1),
    )
    await run_trial_scheduler()
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    # Should be grace, not locked (locked_at is in the future)
    assert tc["state"] == "grace"


@pytest.mark.asyncio
async def test_day3_activation_email_marker(olorin_db_client):
    p = await _create_trial_partner(
        state="active",
        started_at=_ts(-4),
        expires_at=_ts(10),
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert "training_trial_activation" in tc.get("sent_emails", {})


@pytest.mark.asyncio
async def test_day7_midpoint_email_marker(olorin_db_client):
    p = await _create_trial_partner(
        state="active",
        started_at=_ts(-8),
        expires_at=_ts(6),
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert "training_trial_midpoint" in tc.get("sent_emails", {})


@pytest.mark.asyncio
async def test_last_chance_email_marker(olorin_db_client):
    p = await _create_trial_partner(
        state="locked",
        purge_at=_ts(15),  # 15 days until purge (<=20)
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert "training_last_chance" in tc.get("sent_emails", {})


@pytest.mark.asyncio
async def test_final_warning_email_marker(olorin_db_client):
    p = await _create_trial_partner(
        state="locked",
        purge_at=_ts(2),  # 2 days until purge (<=3)
    )
    await run_trial_scheduler()

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert "training_final_warning" in tc.get("sent_emails", {})
