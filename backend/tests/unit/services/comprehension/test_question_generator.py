"""Unit tests for ComprehensionQuestionGeneration (D-08, D-09, D-13)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.schemas.comprehension import AdaptLevel
from app.services.olorin.comprehension import (
    question_generator as qgen_module,
)
from app.services.olorin.comprehension.question_generator import (
    ComprehensionQuestionGeneration,
)


def _make_mock_anthropic_client(tool_input: dict) -> tuple[SimpleNamespace, dict]:
    captured: dict = {}
    tool_block = SimpleNamespace(type="tool_use", input=tool_input)
    response = SimpleNamespace(content=[tool_block])

    async def _create(**kwargs):
        captured.update(kwargs)
        return response

    create_mock = AsyncMock(side_effect=_create)
    client = SimpleNamespace(messages=SimpleNamespace(create=create_mock))
    return client, captured


def _base_tool_input(adapt: AdaptLevel) -> dict:
    return {
        "question_text": "What changed Walter's mind?",
        "adapt_level": adapt.value,
        "in_character_phrasing": "Say, pal...",
    }


class TestQuestionGenerator:
    @pytest.mark.asyncio
    async def test_q1_initial_prompt_contains_required_fields(
        self, monkeypatch,
    ) -> None:
        client, captured = _make_mock_anthropic_client(
            _base_tool_input(AdaptLevel.INITIAL),
        )
        monkeypatch.setattr(
            qgen_module, "get_anthropic_client", lambda: client,
        )
        gen = ComprehensionQuestionGeneration()
        await gen.generate(
            character_name="Walter Burns",
            personality_traits=["sharp-tongued", "ambitious", "devoted"],
            scene_context="SCENE_MARKER_XYZ",
            rubric="RUBRIC_MARKER_ABC",
            adapt_level=AdaptLevel.INITIAL,
            memory_context="<memory>MEMORY_MARKER_QRS</memory>",
        )
        system_msg = captured["system"]
        user_msg = captured["messages"][0]["content"]
        combined = system_msg + "\n" + user_msg
        assert "Walter Burns" in combined
        assert "sharp-tongued" in combined
        assert "SCENE_MARKER_XYZ" in user_msg
        assert "RUBRIC_MARKER_ABC" in user_msg

    @pytest.mark.asyncio
    async def test_q2_memory_context_verbatim(self, monkeypatch) -> None:
        client, captured = _make_mock_anthropic_client(
            _base_tool_input(AdaptLevel.INITIAL),
        )
        monkeypatch.setattr(
            qgen_module, "get_anthropic_client", lambda: client,
        )
        gen = ComprehensionQuestionGeneration()
        memory = "<memory>summary: X. Recent: At 10s...Student...Walter...</memory>"
        await gen.generate(
            character_name="Walter",
            personality_traits=[],
            scene_context="s",
            rubric="r",
            adapt_level=AdaptLevel.INITIAL,
            memory_context=memory,
        )
        user_msg = captured["messages"][0]["content"]
        assert memory in user_msg

    @pytest.mark.asyncio
    async def test_q3_no_prior_score_leakage(self, monkeypatch) -> None:
        client, captured = _make_mock_anthropic_client(
            _base_tool_input(AdaptLevel.INITIAL),
        )
        monkeypatch.setattr(
            qgen_module, "get_anthropic_client", lambda: client,
        )
        gen = ComprehensionQuestionGeneration()
        await gen.generate(
            character_name="Walter",
            personality_traits=[],
            scene_context="s",
            rubric="r",
            adapt_level=AdaptLevel.INITIAL,
            memory_context="<memory>only chat</memory>",
        )
        user_msg = captured["messages"][0]["content"]
        sys_msg = captured["system"]
        combined = sys_msg + "\n" + user_msg
        for forbidden in ("RubricScore", "prior_score", "prior_rationale"):
            assert forbidden not in combined

    @pytest.mark.asyncio
    async def test_q4_adapt_level_instructions(self, monkeypatch) -> None:
        cases = [
            (AdaptLevel.HARDER, "harder follow-up"),
            (AdaptLevel.SIMPLER_RETRY, "simpler"),
            (AdaptLevel.ANSWER_REVEAL, "teaching, not scolding"),
        ]
        for adapt, needle in cases:
            client, captured = _make_mock_anthropic_client(
                _base_tool_input(adapt),
            )
            monkeypatch.setattr(
                qgen_module, "get_anthropic_client", lambda: client,
            )
            gen = ComprehensionQuestionGeneration()
            await gen.generate(
                character_name="Walter",
                personality_traits=[],
                scene_context="s",
                rubric="r",
                adapt_level=adapt,
                memory_context="<memory/>",
                prior_question="Prior Q",
            )
            user_msg = captured["messages"][0]["content"]
            assert needle in user_msg, (
                f"{adapt.value} prompt missing marker: {needle}"
            )

    @pytest.mark.asyncio
    async def test_q5_returns_follow_up_with_matching_adapt_level(
        self, monkeypatch,
    ) -> None:
        # Model echoes INITIAL but we force HARDER (requested level wins)
        client, _captured = _make_mock_anthropic_client(
            _base_tool_input(AdaptLevel.INITIAL),
        )
        monkeypatch.setattr(
            qgen_module, "get_anthropic_client", lambda: client,
        )
        gen = ComprehensionQuestionGeneration()
        result = await gen.generate(
            character_name="W",
            personality_traits=[],
            scene_context="s",
            rubric="r",
            adapt_level=AdaptLevel.HARDER,
            memory_context="<m/>",
        )
        assert result.adapt_level == AdaptLevel.HARDER
