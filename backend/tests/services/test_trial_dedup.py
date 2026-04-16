"""Tests for re-trial dedup logic (check_duplicate)."""
from datetime import datetime, timezone

import pytest

from app.models.trial_history import TrialHistory
from app.services.training.trial_dedup import check_duplicate


async def _insert_history(
    email: str, domain: str, fp: str | None = None, outcome: str | None = None,
) -> None:
    await TrialHistory(
        email=email,
        email_domain=domain,
        card_fingerprint=fp,
        partner_id=f"pid_{email}",
        started_at=datetime.now(timezone.utc),
        outcome=outcome,
    ).insert()


@pytest.mark.asyncio
async def test_block_on_exact_email(olorin_db_client):
    await _insert_history("a@foo.com", "foo.com")
    assert await check_duplicate(email="a@foo.com", domain="foo.com", fp=None) is True


@pytest.mark.asyncio
async def test_allow_new_email(olorin_db_client):
    assert await check_duplicate(email="new@bar.com", domain="bar.com", fp=None) is False


@pytest.mark.asyncio
async def test_block_on_card_fingerprint(olorin_db_client):
    await _insert_history("a@foo.com", "foo.com", fp="fp_1")
    assert await check_duplicate(email="b@bar.com", domain="bar.com", fp="fp_1") is True


@pytest.mark.asyncio
async def test_block_on_corporate_domain(olorin_db_client):
    await _insert_history("a@acme.corp", "acme.corp")
    assert await check_duplicate(email="b@acme.corp", domain="acme.corp", fp=None) is True


@pytest.mark.asyncio
async def test_allow_public_domain_reuse(olorin_db_client):
    await _insert_history("a@gmail.com", "gmail.com")
    assert await check_duplicate(email="b@gmail.com", domain="gmail.com", fp=None) is False


@pytest.mark.asyncio
async def test_converted_corporate_domain_allows_reuse(olorin_db_client):
    await _insert_history("a@acme.corp", "acme.corp", outcome="converted")
    assert await check_duplicate(email="b@acme.corp", domain="acme.corp", fp=None) is False


@pytest.mark.asyncio
async def test_no_fp_match_when_fp_is_none(olorin_db_client):
    await _insert_history("a@foo.com", "foo.com", fp=None)
    # fp=None should NOT match existing fp=None records
    assert await check_duplicate(email="b@bar.com", domain="bar.com", fp=None) is False
