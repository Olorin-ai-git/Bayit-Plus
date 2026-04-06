"""Unit tests for retry_memory_append ARQ task (D-18)."""
from typing import List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.comprehension_session import ComprehensionSession, ScoredExchange
from app.models.film_memory import VODFilmMemory
from app.schemas.comprehension import (
    AdaptLevel,
    ExchangeType,
    RubricScore,
)
from app.services.olorin.comprehension import memory_retry_worker as worker_mod
from app.services.olorin.comprehension.memory_retry_worker import (
    retry_memory_append,
)


def _exchange(pending: bool = True) -> ScoredExchange:
    return ScoredExchange(
        question_text="Q?",
        student_answer="A.",
        score=RubricScore(score=2, rationale="ok"),
        adapt_level=AdaptLevel.INITIAL,
        parent_exchange_index=None,
        moment_timestamp=50.0,
        answer_modality="text",
        memory_retry_pending=pending,
    )


def _session(
    exchanges: List[ScoredExchange],
) -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        sess = ComprehensionSession(
            user_id="u1",
            profile_id="p1",
            content_id="hgf",
            character_name="Walter",
            exchanges=exchanges,
        )
    object.__setattr__(sess, "id", "sess-1")
    object.__setattr__(sess, "save", AsyncMock(return_value=None))
    return sess


def _memory() -> VODFilmMemory:
    with patch.object(
        VODFilmMemory, "get_pymongo_collection", return_value=MagicMock(),
    ):
        return VODFilmMemory(
            user_id="u1", profile_id="p1", content_id="hgf",
        )


class TestRetryMemoryAppend:
    @pytest.mark.asyncio
    async def test_w1_success_clears_pending_flag(self, monkeypatch) -> None:
        sess = _session([_exchange(pending=True)])
        mem = _memory()

        get_mock = AsyncMock(return_value=sess)
        monkeypatch.setattr(ComprehensionSession, "get", get_mock)

        ingest_mock = AsyncMock(return_value=mem)
        get_or_create_mock = AsyncMock(return_value=mem)
        fms_mock = MagicMock(
            get_or_create=get_or_create_mock,
            ingest_exchanges=ingest_mock,
        )
        monkeypatch.setattr(worker_mod, "film_memory_service", fms_mock)

        await retry_memory_append({}, "sess-1", 0)

        assert sess.exchanges[0].memory_retry_pending is False
        ingest_mock.assert_awaited_once()
        # Verify the grader tag flows through reconstruction
        args, _ = ingest_mock.call_args
        _mem_arg, new_exchanges = args
        assert new_exchanges[0].exchange_type == ExchangeType.COMPREHENSION_GRADER
        sess.save.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_w2_failure_keeps_pending_flag(self, monkeypatch) -> None:
        sess = _session([_exchange(pending=True)])
        mem = _memory()

        get_mock = AsyncMock(return_value=sess)
        monkeypatch.setattr(ComprehensionSession, "get", get_mock)

        ingest_mock = AsyncMock(side_effect=RuntimeError("mongo down"))
        get_or_create_mock = AsyncMock(return_value=mem)
        fms_mock = MagicMock(
            get_or_create=get_or_create_mock,
            ingest_exchanges=ingest_mock,
        )
        monkeypatch.setattr(worker_mod, "film_memory_service", fms_mock)

        with pytest.raises(RuntimeError):
            await retry_memory_append({}, "sess-1", 0)

        assert sess.exchanges[0].memory_retry_pending is True

    @pytest.mark.asyncio
    async def test_w3_missing_session_noop(self, monkeypatch) -> None:
        get_mock = AsyncMock(return_value=None)
        monkeypatch.setattr(ComprehensionSession, "get", get_mock)
        fms_mock = MagicMock(
            get_or_create=AsyncMock(),
            ingest_exchanges=AsyncMock(),
        )
        monkeypatch.setattr(worker_mod, "film_memory_service", fms_mock)
        await retry_memory_append({}, "missing", 0)
        fms_mock.ingest_exchanges.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_w4_already_cleared_pending_noop(self, monkeypatch) -> None:
        sess = _session([_exchange(pending=False)])
        get_mock = AsyncMock(return_value=sess)
        monkeypatch.setattr(ComprehensionSession, "get", get_mock)
        fms_mock = MagicMock(
            get_or_create=AsyncMock(),
            ingest_exchanges=AsyncMock(),
        )
        monkeypatch.setattr(worker_mod, "film_memory_service", fms_mock)
        await retry_memory_append({}, "sess-1", 0)
        fms_mock.ingest_exchanges.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_w5_index_out_of_range_noop(self, monkeypatch) -> None:
        sess = _session([_exchange(pending=True)])
        get_mock = AsyncMock(return_value=sess)
        monkeypatch.setattr(ComprehensionSession, "get", get_mock)
        fms_mock = MagicMock(
            get_or_create=AsyncMock(),
            ingest_exchanges=AsyncMock(),
        )
        monkeypatch.setattr(worker_mod, "film_memory_service", fms_mock)
        await retry_memory_append({}, "sess-1", 5)
        fms_mock.ingest_exchanges.assert_not_awaited()
