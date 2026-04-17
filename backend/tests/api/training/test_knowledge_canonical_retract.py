"""DELETE /canonical/{id}: hard-delete vector, soft-delete Mongo row."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import require_training_admin
from app.main import app
from app.models.training_user import TrainingUser


def _admin():
    u = TrainingUser.model_construct(
        email="a@e", password_hash="x", partner_id="p1",
        role="admin", display_name="A", status="active",
    )
    u.id = "adm1"
    return u


@pytest.mark.asyncio
async def test_retract_marks_status_and_deletes_vector():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    loaded = SimpleNamespace(
        id="cm1", partner_id="p1", scope="partner",
        question="Q", answer="A", citations=[], status="active",
        stale_after_months=6,
        last_verified_at=datetime.now(timezone.utc),
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.knowledge_canonical._load_own",
        new=AsyncMock(return_value=loaded),
    ), patch(
        "app.api.routes.training.knowledge_canonical._delete_from_pinecone",
        new=AsyncMock(),
    ) as mdel:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.delete("/api/v1/training/knowledge/canonical/cm1")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert loaded.status == "retracted"
    mdel.assert_awaited_once_with("cm1")
