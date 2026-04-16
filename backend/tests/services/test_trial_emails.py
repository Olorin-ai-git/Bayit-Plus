"""Tests for idempotent trial email dispatch (Task 21)."""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.models.integration_partner import IntegrationPartner
from app.models.trial_config import TrialConfig
from app.services.training.trial_emails import (
    send_trial_welcome,
    send_trial_activation,
    send_retrial_blocked,
)


def _ts(days_offset: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days_offset)


async def _create_trial_partner(sent_emails: dict | None = None) -> IntegrationPartner:
    tc = TrialConfig(
        state="active",
        started_at=_ts(-3),
        expires_at=_ts(11),
        selected_tier="organization",
        stripe_customer_id="cus_email_test",
        stripe_subscription_id="sub_email_test",
        eval_credits_remaining=50,
        byoc_uploads_remaining=5,
        xapi_exports_remaining=1,
        assignments_remaining=3,
        branding_uploads_remaining=1,
        sent_emails=sent_emails or {},
    )
    ts_slug = datetime.now(timezone.utc).timestamp()
    partner = IntegrationPartner(
        partner_id=f"email-test-{ts_slug}",
        name="Email Test Org",
        api_key_hash="$2b$12$fakehashfortesting000000000000000000000000000000",
        api_key_prefix="emailtst",
        contact_email="test@email.olorin.ai",
        billing_tier="training",
        training_config={
            "org_display_name": "Email Test Org",
            "trial_config": tc.model_dump(mode="json"),
        },
    )
    await partner.insert()
    return partner


@pytest.mark.asyncio
@patch("app.services.training.trial_emails._dispatch_email", new_callable=AsyncMock)
async def test_welcome_email_idempotent(mock_dispatch, olorin_db_client):
    """First call sends, second call is a no-op."""
    p = await _create_trial_partner()

    sent = await send_trial_welcome(p.id, "test@email.olorin.ai", "Org", "May 01, 2026")
    assert sent is True

    sent2 = await send_trial_welcome(p.id, "test@email.olorin.ai", "Org", "May 01, 2026")
    assert sent2 is False

    doc = await IntegrationPartner.get(p.id)
    tc = doc.training_config["trial_config"]
    assert "training_trial_welcome" in tc.get("sent_emails", {})

    assert mock_dispatch.call_count == 1


@pytest.mark.asyncio
@patch("app.services.training.trial_emails._dispatch_email", new_callable=AsyncMock)
async def test_activation_skips_if_already_marked(mock_dispatch, olorin_db_client):
    """If sent_emails already has the key, skip without sending."""
    p = await _create_trial_partner(
        sent_emails={"training_trial_activation": _ts().isoformat()},
    )

    sent = await send_trial_activation(p.id, "test@email.olorin.ai", "Org")
    assert sent is False
    mock_dispatch.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.training.trial_emails._dispatch_email", new_callable=AsyncMock)
async def test_retrial_blocked_sends_directly(mock_dispatch, olorin_db_client):
    """retrial_blocked has no partner context — just dispatches."""
    await send_retrial_blocked("blocked@test.olorin.ai")
    mock_dispatch.assert_called_once_with(
        "training_retrial_blocked", "blocked@test.olorin.ai", {},
    )
