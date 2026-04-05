"""Unit tests for ComprehensionSessionOrchestrator (D-02, D-12, D-13, D-17, D-18)."""
from typing import List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.comprehension_session import ComprehensionSession, ScoredExchange
from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.schemas.comprehension import (
    AdaptLevel,
    ExchangeType,
    FollowUpQuestion,
    RubricScore,
)
from app.services.olorin.comprehension import orchestrator as orch_module
from app.services.olorin.comprehension.orchestrator import (
    ComprehensionSessionOrchestrator,
)


def _make_session(
    exchanges: List[ScoredExchange] | None = None,
    adapt: AdaptLevel = AdaptLevel.INITIAL,
) -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        session = ComprehensionSession(
            user_id="u1",
            profile_id="p1",
            content_id="his-girl-friday",
            character_name="Walter Burns",
            scene_context="newsroom",
            exchanges=exchanges or [],
            current_adapt_level=adapt,
        )
    object.__setattr__(session, "id", "sess-abc")
    object.__setattr__(session, "save", AsyncMock(return_value=None))
    return session


def _make_memory(
    recent: List[FilmMemoryExchange] | None = None, summary: str = "",
) -> VODFilmMemory:
    with patch.object(
        VODFilmMemory, "get_pymongo_collection", return_value=MagicMock(),
    ):
        return VODFilmMemory(
            user_id="u1",
            profile_id="p1",
            content_id="his-girl-friday",
            summary=summary,
            recent_exchanges=recent or [],
        )


def _chat_exchange(
    user_msg: str = "hey", char_resp: str = "sure",
) -> FilmMemoryExchange:
    return FilmMemoryExchange(
        moment_timestamp=10.0,
        character_name="Walter",
        user_message=user_msg,
        character_response=char_resp,
        exchange_type=ExchangeType.CHARACTER_CHAT,
    )


def _grader_exchange() -> FilmMemoryExchange:
    return FilmMemoryExchange(
        moment_timestamp=20.0,
        character_name="Walter",
        user_message="answer",
        character_response="q",
        exchange_type=ExchangeType.COMPREHENSION_GRADER,
    )


def _patch_collaborators(
    monkeypatch,
    *,
    score: RubricScore,
    follow_up: FollowUpQuestion,
    memory: VODFilmMemory,
    ingest_side_effect=None,
) -> dict:
    captured: dict = {}

    score_mock = AsyncMock(return_value=score)
    monkeypatch.setattr(
        orch_module, "rubric_scoring_service",
        MagicMock(score=score_mock),
    )

    qgen_mock = AsyncMock(return_value=follow_up)

    async def _gen(**kwargs):
        captured["qgen_kwargs"] = kwargs
        return follow_up

    qgen_mock.side_effect = _gen
    monkeypatch.setattr(
        orch_module, "comprehension_question_generator",
        MagicMock(generate=qgen_mock),
    )

    get_or_create_mock = AsyncMock(return_value=memory)

    async def _ingest(mem, new_exchanges):
        if ingest_side_effect is not None:
            raise ingest_side_effect
        captured["ingested_exchanges"] = new_exchanges
        mem.recent_exchanges.extend(new_exchanges)
        return mem

    ingest_mock = AsyncMock(side_effect=_ingest)
    film_service_mock = MagicMock(
        get_or_create=get_or_create_mock,
        ingest_exchanges=ingest_mock,
        build_memory_context=MagicMock(
            side_effect=lambda m: (
                "<memory>" + "|".join(
                    e.user_message for e in m.recent_exchanges
                ) + "</memory>"
            ),
        ),
    )
    monkeypatch.setattr(orch_module, "film_memory_service", film_service_mock)

    enqueue_mock = AsyncMock(return_value=None)

    async def _import_enqueue(**kwargs):
        captured["enqueue_called"] = True
        captured["enqueue_kwargs"] = kwargs
        await enqueue_mock(**kwargs)

    # Patch the lazy-imported enqueue helper.
    from app.services.olorin.comprehension import memory_retry_worker
    monkeypatch.setattr(
        memory_retry_worker, "enqueue_memory_retry", _import_enqueue,
    )

    captured["score_mock"] = score_mock
    captured["qgen_mock"] = qgen_mock
    captured["ingest_mock"] = ingest_mock
    captured["get_or_create_mock"] = get_or_create_mock
    return captured


def _score(value: int) -> RubricScore:
    return RubricScore(score=value, rationale="ok")


def _follow_up(level: AdaptLevel = AdaptLevel.HARDER) -> FollowUpQuestion:
    return FollowUpQuestion(
        question_text="Next?",
        adapt_level=level,
        in_character_phrasing="Say, pal...",
    )


class TestOrchestrator:
    @pytest.mark.asyncio
    async def test_o1_scorer_called_with_exact_args(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        captured = _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="SCENE",
            playback_seconds=120.0,
            question_text="Q1?",
            student_answer="A1.",
            answer_modality="text",
            rubric="RUBRIC",
            character_name="Walter Burns",
            personality_traits=["sharp"],
            moment_timestamp=100.0,
        )
        captured["score_mock"].assert_awaited_once_with(
            rubric="RUBRIC",
            scene_context="SCENE",
            question="Q1?",
            student_answer="A1.",
        )

    @pytest.mark.asyncio
    async def test_o2_scored_exchange_appended(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(3),
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        assert len(session.exchanges) == 1
        exch = session.exchanges[0]
        assert exch.score.score == 3
        assert exch.answer_modality == "text"
        assert exch.adapt_level == AdaptLevel.INITIAL  # level at time of scoring

    @pytest.mark.asyncio
    async def test_o3_dual_write_grader_tag(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        captured = _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        ingested = captured["ingested_exchanges"]
        assert len(ingested) == 1
        assert ingested[0].exchange_type == ExchangeType.COMPREHENSION_GRADER

    @pytest.mark.asyncio
    async def test_o4_adapt_level_advanced(self, monkeypatch) -> None:
        session = _make_session(adapt=AdaptLevel.INITIAL)
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(3),  # correct -> HARDER
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        result = await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        assert session.current_adapt_level == AdaptLevel.HARDER
        assert result["adapt_level"] == AdaptLevel.HARDER

    @pytest.mark.asyncio
    async def test_o5_qgen_receives_character_only_memory(
        self, monkeypatch,
    ) -> None:
        # Memory has 1 chat + 1 grader entry; after ingest it becomes 2 chat + 1 grader.
        # Actually, after dual-write: memory has 1 chat + 1 NEW grader.
        # Projection must keep only the CHARACTER_CHAT entries.
        chat = _chat_exchange(user_msg="chat_only_marker")
        grader = _grader_exchange()
        memory = _make_memory(recent=[chat, grader])
        session = _make_session()
        captured = _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        memory_ctx = captured["qgen_kwargs"]["memory_context"]
        assert "chat_only_marker" in memory_ctx
        # The grader-tagged exchange user_message is "answer" — check absence.
        # Both chat and grader appear with their respective user_messages;
        # after dual-write a SECOND grader appears but must be filtered out too.
        # The projected context should only contain chat user_messages.
        # Count of '|' separators in our mock is len(chat_only)-1
        # With 1 chat only: "<memory>chat_only_marker</memory>"
        assert memory_ctx == "<memory>chat_only_marker</memory>"

    @pytest.mark.asyncio
    async def test_o6_return_dict_shape(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        result = await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        assert "score" in result and isinstance(result["score"], RubricScore)
        assert "follow_up" in result
        assert isinstance(result["follow_up"], FollowUpQuestion)
        assert "adapt_level" in result
        assert "memory_retry_pending" in result
        assert result["memory_retry_pending"] is False

    @pytest.mark.asyncio
    async def test_o7_memory_failure_non_blocking_enqueues_retry(
        self, monkeypatch,
    ) -> None:
        session = _make_session()
        memory = _make_memory()
        captured = _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(AdaptLevel.HARDER),
            memory=memory,
            ingest_side_effect=RuntimeError("mongo down"),
        )
        orch = ComprehensionSessionOrchestrator()
        result = await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        assert result["memory_retry_pending"] is True
        assert session.exchanges[0].memory_retry_pending is True
        assert captured.get("enqueue_called") is True
        assert captured["enqueue_kwargs"]["session_id"] == "sess-abc"
        assert captured["enqueue_kwargs"]["scored_exchange_index"] == 0

    @pytest.mark.asyncio
    async def test_o8_score_returned_but_separable(self, monkeypatch) -> None:
        """D-14: score IS in the dict, but the route layer is responsible
        for stripping it before surfacing to students."""
        session = _make_session()
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(1),
            follow_up=_follow_up(AdaptLevel.SIMPLER_RETRY),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        result = await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        # Score is present, but keyed under "score" — route layer strips it
        # for student response. Verify the dict shape.
        assert set(result.keys()) == {
            "score", "follow_up", "adapt_level", "memory_retry_pending",
        }

    @pytest.mark.asyncio
    async def test_o9_session_save_invoked(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        session.save.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_o10_voice_modality_persisted(self, monkeypatch) -> None:
        session = _make_session()
        memory = _make_memory()
        _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="voice",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        assert session.exchanges[0].answer_modality == "voice"

    @pytest.mark.asyncio
    async def test_o11_character_chat_filter_projection(
        self, monkeypatch,
    ) -> None:
        # Build memory with chat + grader mix; verify filter discards grader.
        memory = _make_memory(
            recent=[
                _chat_exchange(user_msg="c1"),
                _grader_exchange(),  # should be filtered out
                _chat_exchange(user_msg="c2"),
                _chat_exchange(user_msg="c3"),
                _chat_exchange(user_msg="c4"),
            ],
            summary="older",
        )
        session = _make_session()
        captured = _patch_collaborators(
            monkeypatch,
            score=_score(2),
            follow_up=_follow_up(),
            memory=memory,
        )
        orch = ComprehensionSessionOrchestrator()
        await orch.run_turn(
            session=session,
            scene_context="s",
            playback_seconds=120.0,
            question_text="Q?",
            student_answer="A.",
            answer_modality="text",
            rubric="r",
            character_name="Walter",
            personality_traits=[],
            moment_timestamp=100.0,
        )
        memory_ctx = captured["qgen_kwargs"]["memory_context"]
        # D-08: only the last 3 CHARACTER_CHAT exchanges
        # chat list: [c1, c2, c3, c4] -> last 3 = [c2, c3, c4]
        assert "c2" in memory_ctx
        assert "c3" in memory_ctx
        assert "c4" in memory_ctx
        assert "c1" not in memory_ctx
        # grader user_message "answer" must NOT be in projection
        assert "answer" not in memory_ctx
