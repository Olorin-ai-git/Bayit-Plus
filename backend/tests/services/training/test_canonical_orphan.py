"""Orphan citations when their cited Content is deleted."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.canonical_orphan import handle_content_deletion


@pytest.mark.asyncio
async def test_flips_to_pending_review_when_all_citations_orphan():
    doc = {
        "_id": "cm1", "partner_id": "p1", "scope": "partner",
        "citations": [
            {"type": "video", "content_id": "v1", "orphaned": False},
        ],
        "status": "active",
    }

    async def _cursor():
        yield doc

    with patch(
        "app.services.training.canonical_orphan._iter_citing",
        return_value=_cursor(),
    ), patch(
        "app.services.training.canonical_orphan._update_canonical",
        new=AsyncMock(),
    ) as mu:
        stats = await handle_content_deletion("v1")
    assert stats["flipped_pending_review"] == 1
    call = mu.await_args.kwargs
    assert call["new_status"] == "pending_review"
    assert call["citations"][0]["orphaned"] is True


@pytest.mark.asyncio
async def test_keeps_active_on_partial_orphan():
    doc = {
        "_id": "cm1", "partner_id": "p1", "scope": "partner",
        "citations": [
            {"type": "video", "content_id": "v1", "orphaned": False},
            {"type": "video", "content_id": "v2", "orphaned": False},
        ],
        "status": "active",
    }

    async def _cursor():
        yield doc

    with patch(
        "app.services.training.canonical_orphan._iter_citing",
        return_value=_cursor(),
    ), patch(
        "app.services.training.canonical_orphan._update_canonical",
        new=AsyncMock(),
    ) as mu:
        stats = await handle_content_deletion("v1")
    assert stats["flipped_pending_review"] == 0
    assert stats["partial_orphaned"] == 1
    call = mu.await_args.kwargs
    assert call["new_status"] == "active"
