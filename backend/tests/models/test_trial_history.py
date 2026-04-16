from datetime import datetime, timezone
import pytest
from app.models.trial_history import TrialHistory


@pytest.mark.asyncio
async def test_trial_history_inserts_and_queries(olorin_db_client):
    await TrialHistory(
        email="alice@acme.corp",
        email_domain="acme.corp",
        card_fingerprint="fp_abc",
        partner_id="pid_1",
        started_at=datetime.now(timezone.utc),
    ).insert()

    found = await TrialHistory.find_one({"email": "alice@acme.corp"})
    assert found is not None
    assert found.email_domain == "acme.corp"
    assert found.outcome is None


@pytest.mark.asyncio
async def test_trial_history_email_unique(olorin_db_client):
    await TrialHistory(
        email="bob@foo.com", email_domain="foo.com",
        card_fingerprint=None, partner_id="p2",
        started_at=datetime.now(timezone.utc),
    ).insert()
    with pytest.raises(Exception):
        await TrialHistory(
            email="bob@foo.com", email_domain="foo.com",
            card_fingerprint=None, partner_id="p3",
            started_at=datetime.now(timezone.utc),
        ).insert()
