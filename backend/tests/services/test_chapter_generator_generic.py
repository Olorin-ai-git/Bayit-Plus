"""Tests for generate_chapters_from_transcript_generic."""
import json
from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_generic_generator_parses_claude_response():
    from app.services.chapter_generator import (
        generate_chapters_from_transcript_generic,
    )

    fake_response = MagicMock()
    fake_response.content = [MagicMock(text=json.dumps({
        "chapters": [
            {"start_time": 0, "end_time": 120, "title": "Introduction",
             "summary": "Overview"},
            {"start_time": 120, "end_time": 360, "title": "Demo Walkthrough",
             "summary": "Live demo"},
        ],
    }))]

    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_response

    with patch(
        "app.services.chapter_generator.anthropic.Anthropic",
        return_value=fake_client,
    ):
        result = await generate_chapters_from_transcript_generic(
            content_id="c1",
            content_title="Test Video",
            duration=360,
            transcript="lorem ipsum " * 20,
        )

    assert len(result.chapters) == 2
    assert result.chapters[0].title == "Introduction"
    assert result.chapters[0].title_en == "Introduction"
    assert result.chapters[1].end_time == 360
    assert result.source == "ai_transcript"


@pytest.mark.asyncio
async def test_generic_generator_returns_empty_on_claude_failure():
    """When Claude fails, the generic generator returns an empty result —
    NOT a Hebrew news fallback. The pipeline stage handler is responsible
    for treating empty as a soft failure (warning, no chapters)."""
    from app.services.chapter_generator import (
        generate_chapters_from_transcript_generic,
    )

    fake_client = MagicMock()
    fake_client.messages.create.side_effect = RuntimeError("api down")

    with patch(
        "app.services.chapter_generator.anthropic.Anthropic",
        return_value=fake_client,
    ):
        result = await generate_chapters_from_transcript_generic(
            content_id="c1",
            content_title="Test",
            duration=360,
            transcript="lorem ipsum",
        )

    assert result.chapters == []
    assert result.source == "ai_failed"
