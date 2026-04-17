"""/ask v2: unified retrieval, mode detection, candidate logging, tier gating."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app
from app.models.ask_candidate import AskCandidate
from app.models.training_user import TrainingUser
from app.services.olorin.search.unified_retrieval import (
    CanonicalHit,
    UnifiedResults,
    VideoHit,
)


def _user(partner_id="p1", role="viewer"):
    u = TrainingUser.model_construct(
        email="u@ex.com", password_hash="x", partner_id=partner_id,
        role=role, display_name="U", status="active",
    )
    u.id = "uid1"
    return u


@pytest.mark.asyncio
async def test_ask_canonical_verbatim_above_threshold_charges_zero_credits(monkeypatch):
    u = _user()
    app.dependency_overrides[get_current_training_user] = lambda: u

    async def fake_get_tier(_pid):
        return "organization"

    unified = UnifiedResults(
        canonical_hits=[CanonicalHit(
            canonical_id="c1", question="Q?", answer="Stored A.",
            boosted_score=0.95, raw_score=0.68, status="active",
        )],
        video_hits=[],
        document_hits=[],
    )

    with patch("app.api.routes.training.knowledge._get_tier", new=AsyncMock(side_effect=fake_get_tier)), \
         patch("app.api.routes.training.knowledge.generate_embedding", new=AsyncMock(return_value=[0.1]*3)), \
         patch("app.api.routes.training.knowledge.client_manager",
               new=SimpleNamespace(is_initialized=True, pinecone_index=SimpleNamespace(), initialize=AsyncMock())), \
         patch("app.api.routes.training.knowledge.query_unified_corpus", new=AsyncMock(return_value=unified)), \
         patch("app.api.routes.training.knowledge._record_candidate", new=AsyncMock()), \
         patch("app.api.routes.training.knowledge._call_claude", new=AsyncMock(return_value="SHOULD NOT BE CALLED")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/ask", json={"question": "what is x?"})

    app.dependency_overrides.clear()
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "canonical_verbatim"
    assert data["credits_charged"] == 0
    assert data["answer"] == "Stored A."


@pytest.mark.asyncio
async def test_ask_blended_mode_below_threshold_charges_one_credit():
    u = _user()
    app.dependency_overrides[get_current_training_user] = lambda: u

    unified = UnifiedResults(
        canonical_hits=[CanonicalHit(
            canonical_id="c1", question="Q?", answer="A.",
            boosted_score=0.70, raw_score=0.50, status="active",
        )],
        video_hits=[VideoHit(
            content_id="v1", title="V", text="excerpt",
            timestamp_seconds=10.0, boosted_score=0.6, raw_score=0.6,
        )],
        document_hits=[],
    )

    with patch("app.api.routes.training.knowledge._get_tier", new=AsyncMock(return_value="organization")), \
         patch("app.api.routes.training.knowledge.generate_embedding", new=AsyncMock(return_value=[0.1]*3)), \
         patch("app.api.routes.training.knowledge.client_manager",
               new=SimpleNamespace(is_initialized=True, pinecone_index=SimpleNamespace(), initialize=AsyncMock())), \
         patch("app.api.routes.training.knowledge.query_unified_corpus", new=AsyncMock(return_value=unified)), \
         patch("app.api.routes.training.knowledge._record_candidate", new=AsyncMock()), \
         patch("app.api.routes.training.knowledge._call_claude", new=AsyncMock(return_value="Synthesized.")), \
         patch("app.api.routes.training.knowledge.deduct_training_credits", new=AsyncMock(return_value=49)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/ask", json={"question": "q??"})

    app.dependency_overrides.clear()
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "blended"
    assert data["credits_charged"] == 1


@pytest.mark.asyncio
async def test_ask_no_match_returns_zero_credits():
    u = _user()
    app.dependency_overrides[get_current_training_user] = lambda: u

    unified = UnifiedResults()
    with patch("app.api.routes.training.knowledge._get_tier", new=AsyncMock(return_value="organization")), \
         patch("app.api.routes.training.knowledge.generate_embedding", new=AsyncMock(return_value=[0.1]*3)), \
         patch("app.api.routes.training.knowledge.client_manager",
               new=SimpleNamespace(is_initialized=True, pinecone_index=SimpleNamespace(), initialize=AsyncMock())), \
         patch("app.api.routes.training.knowledge.query_unified_corpus", new=AsyncMock(return_value=unified)), \
         patch("app.api.routes.training.knowledge._record_candidate", new=AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/ask", json={"question": "q??"})

    app.dependency_overrides.clear()
    data = r.json()
    assert data["mode"] == "no_match"
    assert data["credits_charged"] == 0


@pytest.mark.asyncio
async def test_team_tier_allowed_with_global_scope():
    u = _user()
    app.dependency_overrides[get_current_training_user] = lambda: u

    unified = UnifiedResults()
    with patch("app.api.routes.training.knowledge._get_tier", new=AsyncMock(return_value="team")), \
         patch("app.api.routes.training.knowledge.generate_embedding", new=AsyncMock(return_value=[0.1]*3)), \
         patch("app.api.routes.training.knowledge.client_manager",
               new=SimpleNamespace(is_initialized=True, pinecone_index=SimpleNamespace(), initialize=AsyncMock())), \
         patch("app.api.routes.training.knowledge.query_unified_corpus", new=AsyncMock(return_value=unified)) as mq, \
         patch("app.api.routes.training.knowledge._record_candidate", new=AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/ask", json={"question": "q??"})

    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert mq.await_args.kwargs["tier"] == "team"
