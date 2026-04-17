"""Nightly sweep: flips active -> stale past stale_after_months."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.canonical_staleness import run_canonical_staleness_sweep


@pytest.mark.asyncio
async def test_sweep_flips_expired_to_stale():
    old = datetime.now(timezone.utc) - timedelta(days=200)
    fresh = datetime.now(timezone.utc) - timedelta(days=10)
    rows = [
        {"_id": "a", "status": "active", "stale_after_months": 6,
         "last_verified_at": old, "partner_id": "p1",
         "scope": "partner", "question": "Q", "answer": "A"},
        {"_id": "b", "status": "active", "stale_after_months": 6,
         "last_verified_at": fresh, "partner_id": "p1",
         "scope": "partner", "question": "Q", "answer": "A"},
    ]
    async def _cursor():
        for r in rows:
            yield r

    with patch(
        "app.services.training.canonical_staleness._iter_active_canonicals",
        return_value=_cursor(),
    ), patch(
        "app.services.training.canonical_staleness._flip_to_stale",
        new=AsyncMock(),
    ) as mflip, patch(
        "app.services.training.canonical_staleness._resync_pinecone",
        new=AsyncMock(),
    ) as mres:
        stats = await run_canonical_staleness_sweep()

    assert stats["flipped"] == 1
    mflip.assert_awaited_once()
    mres.assert_awaited_once()


@pytest.mark.asyncio
async def test_sweep_skips_null_stale_after():
    old = datetime.now(timezone.utc) - timedelta(days=2000)
    rows = [
        {"_id": "a", "status": "active", "stale_after_months": None,
         "last_verified_at": old, "partner_id": "p1",
         "scope": "partner", "question": "Q", "answer": "A"},
    ]
    async def _cursor():
        for r in rows:
            yield r

    with patch(
        "app.services.training.canonical_staleness._iter_active_canonicals",
        return_value=_cursor(),
    ), patch(
        "app.services.training.canonical_staleness._flip_to_stale",
        new=AsyncMock(),
    ) as mflip:
        stats = await run_canonical_staleness_sweep()
    assert stats["flipped"] == 0
    mflip.assert_not_awaited()
