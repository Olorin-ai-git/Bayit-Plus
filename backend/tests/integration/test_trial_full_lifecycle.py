"""Full trial lifecycle: signup -> trial -> auto-convert via invoice.paid webhook."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.models.integration_partner import IntegrationPartner
from app.models.trial_config import TrialConfig
from app.models.trial_history import TrialHistory
from app.api.routes.training.trial_webhooks import handle_invoice_paid
from app.services.training.trial_dedup import check_duplicate
from app.services.training.trial_service import decrement_trial_cap


def _trial_config(**overrides) -> TrialConfig:
    now = datetime.now(timezone.utc)
    base = dict(
        state="active",
        started_at=now,
        expires_at=now + timedelta(days=14),
        selected_tier="organization",
        stripe_customer_id="cus_lifecycle",
        stripe_subscription_id="sub_lifecycle",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
    )
    base.update(overrides)
    return TrialConfig(**base)


async def _insert_trial_partner(
    slug: str, tc: TrialConfig, email: str = "test@test.olorin.ai",
) -> IntegrationPartner:
    partner = IntegrationPartner(
        partner_id=slug,
        name="Lifecycle Org",
        api_key_hash="$2b$12$fakehashfortesting00000000000000000000000000000",
        api_key_prefix="lftestxx",
        contact_email=email,
        billing_tier="training",
        training_config={
            "org_tier": "trial",
            "trial_config": tc.model_dump(mode="json"),
            "credit_limit_monthly": 50,
            "seat_limit": 25,
            "credits_remaining": 0,
            "credits_used": 0,
        },
    )
    await partner.insert()
    return partner


@pytest.mark.asyncio
@patch(
    "app.api.routes.training.trial_webhooks.trial_emails.send_converted",
    new_callable=AsyncMock,
)
async def test_full_trial_lifecycle(mock_email, olorin_db_client):
    """Signup creates partner with trial -> invoice.paid converts."""
    tc = _trial_config()
    partner = await _insert_trial_partner("lifecycle-test", tc)

    await TrialHistory(
        email="lifecycle@test.com",
        email_domain="test.com",
        card_fingerprint="fp_lifecycle",
        partner_id=partner.partner_id,
        started_at=datetime.now(timezone.utc),
    ).insert()

    event = {
        "type": "invoice.paid",
        "data": {"object": {
            "subscription": "sub_lifecycle",
            "billing_reason": "subscription_cycle",
        }},
    }
    await handle_invoice_paid(event)

    p = await IntegrationPartner.get(partner.id)
    tc_data = p.training_config
    assert isinstance(tc_data, dict)
    assert tc_data["trial_config"]["state"] == "converted"
    assert tc_data["org_tier"] == "organization"

    hist = await TrialHistory.find_one({"partner_id": partner.partner_id})
    assert hist.outcome == "converted"
    mock_email.assert_awaited_once()


@pytest.mark.asyncio
async def test_cap_exhaustion_blocks_6th_upload(olorin_db_client):
    """5 BYOC uploads succeed, 6th returns False (cap exhausted)."""
    tc = _trial_config(
        stripe_customer_id="cus_cap",
        stripe_subscription_id="sub_cap",
    )
    partner = await _insert_trial_partner("cap-test", tc)

    for _ in range(5):
        assert await decrement_trial_cap(partner.id, "byoc_uploads") is True

    assert await decrement_trial_cap(partner.id, "byoc_uploads") is False


@pytest.mark.asyncio
async def test_retrial_block_same_email(olorin_db_client):
    """Second signup attempt with same email -> blocked by dedup."""
    await TrialHistory(
        email="dup@corp.com",
        email_domain="corp.com",
        card_fingerprint="fp_dup",
        partner_id="pid_dup",
        started_at=datetime.now(timezone.utc),
    ).insert()
    assert await check_duplicate(
        email="dup@corp.com", domain="corp.com", fp=None,
    ) is True


@pytest.mark.asyncio
async def test_retrial_allow_different_email(olorin_db_client):
    """Signup with a brand-new email passes dedup."""
    assert await check_duplicate(
        email="fresh@newcorp.com", domain="newcorp.com", fp=None,
    ) is False


@pytest.mark.asyncio
@patch(
    "app.api.routes.training.trial_webhooks.trial_emails.send_converted",
    new_callable=AsyncMock,
)
async def test_invoice_paid_idempotent(mock_email, olorin_db_client):
    """Calling handle_invoice_paid twice does not double-convert."""
    tc = _trial_config(
        stripe_customer_id="cus_idem",
        stripe_subscription_id="sub_idem",
    )
    partner = await _insert_trial_partner("idem-test", tc)
    await TrialHistory(
        email="idem@test.com",
        email_domain="test.com",
        card_fingerprint="fp_idem",
        partner_id=partner.partner_id,
        started_at=datetime.now(timezone.utc),
    ).insert()

    event = {
        "type": "invoice.paid",
        "data": {"object": {"subscription": "sub_idem"}},
    }
    await handle_invoice_paid(event)
    await handle_invoice_paid(event)

    # Email sent only on first invocation
    assert mock_email.await_count == 1
