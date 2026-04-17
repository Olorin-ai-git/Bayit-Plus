"""Review queue: list, filter tabs, dismiss. Admin-only."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.main import app
from app.models.training_user import TrainingUser


def _user(role="admin", partner_id="p1"):
    u = TrainingUser.model_construct(
        email="u@ex.com", password_hash="x", partner_id=partner_id,
        role=role, display_name="U", status="active",
    )
    u.id = "uid1"
    return u


@pytest.mark.asyncio
async def test_list_candidates_requires_admin():
    app.dependency_overrides[get_current_training_user] = lambda: _user(role="viewer")
    async def _block():
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    app.dependency_overrides[require_training_admin] = _block
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/v1/training/knowledge/candidates")
    app.dependency_overrides.clear()
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_candidates_filters_by_tab_new():
    admin = _user(role="admin")
    app.dependency_overrides[require_training_admin] = lambda: admin
    fake_rows = [
        {"_id": "c1", "partner_id": "p1", "asker_user_id": "u1",
         "question": "q1", "answer": "a1", "mode": "blended",
         "sources": [], "canonical_hits": [], "credits_charged": 1,
         "dismissed": False, "promoted_to": None,
         "created_at": datetime.now(timezone.utc), "scope": "partner"},
    ]
    with patch(
        "app.api.routes.training.knowledge_candidates._fetch_candidates",
        new=AsyncMock(return_value=(fake_rows, 1)),
    ) as mf:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/knowledge/candidates?tab=new&limit=20")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert mf.await_args.kwargs["tab"] == "new"


@pytest.mark.asyncio
async def test_dismiss_candidate_marks_row():
    admin = _user(role="admin")
    app.dependency_overrides[require_training_admin] = lambda: admin
    with patch(
        "app.api.routes.training.knowledge_candidates._mark_dismissed",
        new=AsyncMock(return_value=True),
    ) as md:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/candidates/abc/dismiss")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert md.await_args.kwargs["candidate_id"] == "abc"
    assert md.await_args.kwargs["reviewer_id"] == "uid1"


@pytest.mark.asyncio
async def test_dismiss_blocks_cross_partner():
    admin = _user(role="admin", partner_id="pA")
    app.dependency_overrides[require_training_admin] = lambda: admin
    with patch(
        "app.api.routes.training.knowledge_candidates._mark_dismissed",
        new=AsyncMock(return_value=False),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/candidates/abc/dismiss")
    app.dependency_overrides.clear()
    assert r.status_code == 404
