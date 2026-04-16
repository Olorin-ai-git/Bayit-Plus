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
async def test_trial_history_email_indexed(olorin_db_client):
    """email is indexed but NOT unique — application-layer dedup with
    domain-conversion carveouts is the authoritative gate."""
    await TrialHistory(
        email="bob@foo.com", email_domain="foo.com",
        card_fingerprint=None, partner_id="p2",
        started_at=datetime.now(timezone.utc),
    ).insert()
    # A second insert with the same email must succeed at the DB layer; the
    # carveout for previously-converted users requires this. The dedup
    # service is responsible for rejecting at the API layer.
    await TrialHistory(
        email="bob@foo.com", email_domain="foo.com",
        card_fingerprint=None, partner_id="p3",
        started_at=datetime.now(timezone.utc),
    ).insert()

    # Both rows are persisted.
    matches = await TrialHistory.find({"email": "bob@foo.com"}).to_list()
    assert len(matches) == 2


@pytest.mark.asyncio
async def test_trial_history_indexes_registered(olorin_db_client):
    idx = await TrialHistory.get_pymongo_collection().index_information()
    # Sanity: email index present (NOT unique), plus email_domain and
    # card_fingerprint indexes.
    assert any(k.startswith("email_") for k in idx), f"no email index: {idx}"
    assert not any(
        k.startswith("email_") and idx[k].get("unique") for k in idx
    ), f"email index must not be unique: {idx}"
    assert any("email_domain" in k for k in idx), f"no email_domain index: {idx}"
    assert any("card_fingerprint" in k for k in idx), f"no card_fingerprint index: {idx}"
