"""Task 2: assembly-only report generator tests (D-05, REPT-03, PITFALLS #4).

Hard invariants:
  - NO LLM imports in the module (no anthropic, openai, AsyncAnthropic, etc.)
  - Authoritative numeric score respects overrides
  - Histogram uses ORIGINAL rubric bands (pre-override)
  - Empty session yields turn_count=0, avg_score=0.0 without ZeroDivisionError
"""
from unittest.mock import MagicMock, patch

from app.models.comprehension_session import (
    ComprehensionSession,
    OverrideAuditEntry,
    ScoredExchange,
)
from app.schemas.comprehension import AdaptLevel, RubricScore
from app.services.olorin.comprehension import report_generator as rg
from app.services.olorin.comprehension import report_worker


def _score(n: int) -> RubricScore:
    return RubricScore(score=n, rationale=f"score={n}")


def _exch(score_n: int, q: str = "Q", a: str = "A", ts: float = 0.0) -> ScoredExchange:
    return ScoredExchange(
        question_text=q,
        student_answer=a,
        score=_score(score_n),
        adapt_level=AdaptLevel.INITIAL,
        moment_timestamp=ts,
    )


def _session(exchanges, session_id: str = "sess-a") -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        s = ComprehensionSession(
            user_id="u1",
            profile_id="p1",
            content_id="his-girl-friday",
            character_name="Hildy",
            exchanges=exchanges,
        )
    s.id = session_id  # type: ignore[assignment]
    return s


def test_report_generator_has_no_llm_client_symbols() -> None:
    forbidden = (
        "AsyncAnthropic",
        "AsyncOpenAI",
        "Anthropic",
        "OpenAI",
        "anthropic",
        "openai",
        "Haiku",
    )
    for sym in forbidden:
        assert not hasattr(rg, sym), f"forbidden LLM symbol in report_generator: {sym}"


def test_build_report_happy_path_three_turns() -> None:
    session = _session([_exch(0), _exch(2, ts=1.0), _exch(3, ts=2.0)])
    with patch.object(
        rg.ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = rg.build_report_from_session(session, partner_id="org-a")
    assert report.turn_count == 3
    # avg of authoritative (no overrides) = (0+2+3)/3 = 1.67
    assert report.avg_score == 1.67
    # histogram bands: 0->low, 2->med, 3->high
    assert report.high_count == 1
    assert report.med_count == 1
    assert report.low_count == 1
    assert report.turns[2].numeric_score == 3
    assert report.turns[2].override_applied is False
    assert report.turns[2].original_numeric_score == 3


def test_build_report_applies_overrides() -> None:
    exch = _exch(1)
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="t1", score_before=1, score_after=2,
            rationale_before="x", rationale_after="y",
        ),
    )
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="t1", score_before=2, score_after=3,
            rationale_before="y", rationale_after="z",
        ),
    )
    session = _session([exch])
    with patch.object(
        rg.ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = rg.build_report_from_session(session, partner_id="org-a")
    assert report.turns[0].numeric_score == 3  # last override
    assert report.turns[0].override_applied is True
    assert report.turns[0].original_numeric_score == 1
    assert report.turns[0].original_rationale == "score=1"
    # histogram uses ORIGINAL band (1 -> low), not the override
    assert report.low_count == 1
    assert report.high_count == 0


def test_build_report_empty_session() -> None:
    session = _session([])
    with patch.object(
        rg.ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = rg.build_report_from_session(session, partner_id="org-a")
    assert report.turn_count == 0
    assert report.avg_score == 0.0
    assert report.high_count == report.med_count == report.low_count == 0


def test_worker_retry_backoff_and_max_tries_constants() -> None:
    assert report_worker.RETRY_BACKOFF_SECONDS == (3, 9, 27)
    assert report_worker.WORKER_MAX_TRIES == 3
    assert report_worker.REPORT_WORKER_QUEUE_NAME == "comprehension_report_generation"
