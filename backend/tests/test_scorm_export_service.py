"""Tests for SCORM export pipeline orchestrator."""

import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.vod_interaction import ContentCharacter
from app.services.olorin.scorm_export.export_service import (
    run_export_pipeline,
    _resolve_tier,
    _resolve_max_characters,
)


def test_resolve_tier_team():
    assert _resolve_tier("team") == "team"


def test_resolve_tier_organization():
    assert _resolve_tier("organization") == "organization"


def test_resolve_tier_enterprise():
    assert _resolve_tier("enterprise") == "enterprise"


def test_resolve_tier_unknown():
    assert _resolve_tier("unknown") == "team"


def test_resolve_max_characters_team():
    assert _resolve_max_characters("team") == 3


def test_resolve_max_characters_organization():
    assert _resolve_max_characters("organization") == 10


def test_resolve_max_characters_enterprise():
    assert _resolve_max_characters("enterprise") >= 100


def _make_export(**overrides):
    defaults = dict(
        id="exp_test_1",
        partner_id="test",
        content_id="nonexistent",
        created_by="admin",
        export_token="tok_test",
        tier_at_export="organization",
        status="pending",
        progress_pct=0,
        error=None,
        completion_rule="video_plus_quiz",
        video_threshold_pct=80,
        quiz_pass_pct=70,
        included_characters=None,
        video_source="stream",
        token_cap=500,
        token_used=0,
        characters_included=0,
        qa_pairs_generated=0,
        character_status=[],
        package_url=None,
        package_size_bytes=None,
        completed_at=None,
    )
    defaults.update(overrides)
    ns = SimpleNamespace(**defaults)
    ns.save = AsyncMock()
    return ns


@pytest.mark.asyncio
async def test_run_export_pipeline_validates_content():
    """Pipeline should fail if content not found."""
    export = _make_export()

    with patch(
        "app.services.olorin.scorm_export.export_service.Content"
    ) as MockContent:
        MockContent.get = AsyncMock(return_value=None)

        await run_export_pipeline(export)

    assert export.status == "failed"
    assert "not found" in (export.error or "").lower()


@pytest.mark.asyncio
async def test_run_export_pipeline_no_characters():
    """Pipeline should fail if content has no characters."""
    export = _make_export(content_id="c_no_chars")

    mock_content = MagicMock()
    mock_content.interactive_characters = []

    with patch(
        "app.services.olorin.scorm_export.export_service.Content"
    ) as MockContent:
        MockContent.get = AsyncMock(return_value=mock_content)

        await run_export_pipeline(export)

    assert export.status == "failed"
    assert "no extracted characters" in (export.error or "").lower()
