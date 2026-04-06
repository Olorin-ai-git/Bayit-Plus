"""Unit tests for ComprehensionTriggerPolicy (D-06, D-07)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.schemas.comprehension import TriggerDecision
from app.services.olorin.comprehension import trigger as trigger_module
from app.services.olorin.comprehension.trigger import (
    ComprehensionTriggerPolicy,
)


def _make_mock_openai_client(parsed_decision: TriggerDecision | None) -> tuple[AsyncMock, dict]:
    """Build a mock AsyncOpenAI client whose beta.chat.completions.parse is AsyncMock."""
    call_capture: dict = {}

    parsed_msg = SimpleNamespace(parsed=parsed_decision)
    choice = SimpleNamespace(message=parsed_msg)
    completion = SimpleNamespace(choices=[choice])

    async def _parse(**kwargs):
        call_capture.update(kwargs)
        return completion

    parse_mock = AsyncMock(side_effect=_parse)
    client = SimpleNamespace(
        beta=SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(parse=parse_mock)),
        ),
    )
    return client, call_capture, parse_mock


class TestTriggerPolicy:
    @pytest.mark.asyncio
    async def test_t1_rate_limit_below_90s_skips_llm(self, monkeypatch) -> None:
        """D-07: elapsed < 90s returns skip WITHOUT calling LLM."""
        client, _captured, parse_mock = _make_mock_openai_client(None)
        monkeypatch.setattr(
            trigger_module, "get_openai_client", lambda: client,
        )
        policy = ComprehensionTriggerPolicy()
        decision = await policy.should_trigger(
            playback_seconds=30.0,
            last_trigger_at=0.0,
            scene_context="s",
            recent_exchanges_context="r",
        )
        assert decision.should_trigger is False
        assert "rate_limit_90s" in decision.reason
        parse_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_t2_above_90s_calls_llm(self, monkeypatch) -> None:
        mock_decision = TriggerDecision(
            should_trigger=True, reason="scene break",
        )
        client, _captured, parse_mock = _make_mock_openai_client(mock_decision)
        monkeypatch.setattr(
            trigger_module, "get_openai_client", lambda: client,
        )
        policy = ComprehensionTriggerPolicy()
        decision = await policy.should_trigger(
            playback_seconds=95.0,
            last_trigger_at=0.0,
            scene_context="scene_X",
            recent_exchanges_context="exch_Y",
        )
        assert decision.should_trigger is True
        parse_mock.assert_called_once()

    @pytest.mark.asyncio
    async def test_t3_llm_decision_returned_unchanged(self, monkeypatch) -> None:
        mock_decision = TriggerDecision(
            should_trigger=True, reason="scene break",
        )
        client, _captured, _parse_mock = _make_mock_openai_client(mock_decision)
        monkeypatch.setattr(
            trigger_module, "get_openai_client", lambda: client,
        )
        policy = ComprehensionTriggerPolicy()
        decision = await policy.should_trigger(
            playback_seconds=200.0,
            last_trigger_at=100.0,
            scene_context="s",
            recent_exchanges_context="r",
        )
        assert decision == mock_decision

    @pytest.mark.asyncio
    async def test_t4_prompt_contains_required_context(self, monkeypatch) -> None:
        mock_decision = TriggerDecision(should_trigger=False, reason="not yet")
        client, captured, _parse_mock = _make_mock_openai_client(mock_decision)
        monkeypatch.setattr(
            trigger_module, "get_openai_client", lambda: client,
        )
        policy = ComprehensionTriggerPolicy()
        await policy.should_trigger(
            playback_seconds=200.0,
            last_trigger_at=50.0,
            scene_context="SCENE_MARKER_ABC",
            recent_exchanges_context="EXCH_MARKER_DEF",
        )
        user_msg = captured["messages"][1]["content"]
        assert "SCENE_MARKER_ABC" in user_msg
        assert "EXCH_MARKER_DEF" in user_msg
        # elapsed was 150.0
        assert "150.0" in user_msg

    @pytest.mark.asyncio
    async def test_t5_prompt_contains_skip_bias(self, monkeypatch) -> None:
        """Pitfall 4: skip bias must be in the prompt."""
        mock_decision = TriggerDecision(should_trigger=False, reason="skip")
        client, captured, _parse_mock = _make_mock_openai_client(mock_decision)
        monkeypatch.setattr(
            trigger_module, "get_openai_client", lambda: client,
        )
        policy = ComprehensionTriggerPolicy()
        await policy.should_trigger(
            playback_seconds=200.0,
            last_trigger_at=50.0,
            scene_context="s",
            recent_exchanges_context="r",
        )
        sys_msg = captured["messages"][0]["content"]
        assert "skip" in sys_msg.lower()
