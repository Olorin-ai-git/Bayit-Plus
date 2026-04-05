"""Task 2: teacher override service audit-trail tests (D-11, D-12)."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.comprehension_session import ComprehensionSession, ScoredExchange
from app.schemas.comprehension import AdaptLevel, RubricScore
from app.services.olorin.comprehension.override_service import append_override


def _patch_save(session):
    """Return a context manager that mocks session.save() to a no-op."""
    async def _noop():
        return None
    return patch.object(type(session), "save", new=AsyncMock(side_effect=_noop))


def _exch(n: int = 1) -> ScoredExchange:
    return ScoredExchange(
        question_text="Q",
        student_answer="A",
        score=RubricScore(score=n, rationale=f"orig-{n}"),
        adapt_level=AdaptLevel.INITIAL,
        moment_timestamp=0.0,
    )


def _session(exchanges) -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        s = ComprehensionSession(
            user_id="u1",
            profile_id="p1",
            content_id="c1",
            character_name="Hildy",
            exchanges=exchanges,
        )
    return s


@pytest.mark.asyncio
async def test_append_override_rejects_out_of_range_score() -> None:
    session = _session([_exch(1)])
    with _patch_save(session):
        with pytest.raises(ValueError):
            await append_override(
                session, turn_index=0, teacher_id="t1",
                score_after=7, rationale_after="x",
            )


@pytest.mark.asyncio
async def test_append_override_rejects_out_of_range_turn_index() -> None:
    session = _session([_exch(1)])
    with _patch_save(session):
        with pytest.raises(IndexError):
            await append_override(
                session, turn_index=3, teacher_id="t1",
                score_after=2, rationale_after="x",
            )


@pytest.mark.asyncio
async def test_append_override_first_entry_uses_original_as_before() -> None:
    session = _session([_exch(1)])
    with _patch_save(session):
        entry = await append_override(
            session, turn_index=0, teacher_id="teacher-42",
            score_after=3, rationale_after="teacher revise",
        )
    assert entry.score_before == 1
    assert entry.score_after == 3
    assert entry.rationale_before == "orig-1"
    assert entry.rationale_after == "teacher revise"
    assert entry.teacher_id == "teacher-42"
    assert len(session.exchanges[0].overrides) == 1


@pytest.mark.asyncio
async def test_append_override_chain_uses_prior_as_before() -> None:
    session = _session([_exch(0)])
    with _patch_save(session):
        first = await append_override(
            session, turn_index=0, teacher_id="t1",
            score_after=2, rationale_after="first",
        )
        second = await append_override(
            session, turn_index=0, teacher_id="t2",
            score_after=3, rationale_after="second",
        )
    assert first.score_before == 0
    assert second.score_before == first.score_after == 2
    assert second.rationale_before == "first"
    assert len(session.exchanges[0].overrides) == 2


@pytest.mark.asyncio
async def test_append_override_records_teacher_id() -> None:
    session = _session([_exch(2)])
    with _patch_save(session):
        entry = await append_override(
            session, turn_index=0, teacher_id="auditor-99",
            score_after=3, rationale_after="r", note="n",
        )
    assert entry.teacher_id == "auditor-99"
    assert entry.note == "n"
