"""/ask surfaces document_hits when unified retrieval returns them."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app
from app.models.training_user import TrainingUser
from app.services.olorin.search.unified_retrieval import (
    DocumentHit,
    UnifiedResults,
    VideoHit,
)


def _user():
    u = TrainingUser.model_construct(
        email="u@e", password_hash="x", partner_id="p1",
        role="viewer", display_name="U", status="active",
    )
    u.id = "uid1"
    return u


@pytest.mark.asyncio
async def test_document_hits_rendered_in_response():
    u = _user()
    app.dependency_overrides[get_current_training_user] = lambda: u

    unified = UnifiedResults(
        canonical_hits=[],
        video_hits=[VideoHit(
            content_id="v1", title="V", text="x",
            timestamp_seconds=0, boosted_score=0.7, raw_score=0.7,
        )],
        document_hits=[DocumentHit(
            document_id="d1", title="Policy.pdf", chunk_index=3,
            text="pages snippet", page_number=7,
            boosted_score=0.8, raw_score=0.65,
        )],
    )

    with patch("app.api.routes.training.knowledge._get_tier", new=AsyncMock(return_value="organization")), \
         patch("app.api.routes.training.knowledge.generate_embedding", new=AsyncMock(return_value=[0.1])), \
         patch("app.api.routes.training.knowledge.client_manager",
               new=SimpleNamespace(is_initialized=True, pinecone_index=SimpleNamespace(), initialize=AsyncMock())), \
         patch("app.api.routes.training.knowledge.query_unified_corpus", new=AsyncMock(return_value=unified)), \
         patch("app.api.routes.training.knowledge._record_candidate", new=AsyncMock()), \
         patch("app.api.routes.training.knowledge._call_claude", new=AsyncMock(return_value="synth")), \
         patch("app.api.routes.training.knowledge.deduct_training_credits", new=AsyncMock(return_value=49)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/ask", json={"question": "what?"})

    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert len(body["document_hits"]) == 1
    hit = body["document_hits"][0]
    assert hit["document_id"] == "d1"
    assert hit["page_number"] == 7
    assert hit["title"] == "Policy.pdf"
