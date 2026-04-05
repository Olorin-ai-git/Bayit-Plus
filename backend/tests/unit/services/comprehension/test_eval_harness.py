"""Unit tests for the golden-set eval harness (FND-03 Task 2).

Covers the 7 harness behaviors (H1-H7) described in Plan 01-03. Uses
AsyncMock scorers and fabricated tuples — no fixture load, no real scorer.
"""
from unittest.mock import AsyncMock, call

import pytest

from app.schemas.comprehension import RubricScore
from app.services.olorin.comprehension.eval_harness import (
    GoldenSetResult,
    TupleMismatch,
    run_golden_set_eval,
)


def _tuple(tuple_id: str, score: int, band: str, scene: str = "s-1") -> dict:
    return {
        "tuple_id": tuple_id,
        "scene_id": scene,
        "scene_context": f"context for {tuple_id}",
        "question": f"question for {tuple_id}",
        "student_answer": f"answer for {tuple_id}",
        "expected_score": score,
        "expected_band": band,
        "expected_rationale_contains": [],
        "band_category": "wrong",
        "notes": "",
    }


def _score(score: int, rationale: str = "ok") -> RubricScore:
    return RubricScore(score=score, rationale=rationale)


@pytest.mark.asyncio
async def test_h1_returns_goldensetresult_dataclass():
    """H1: returns GoldenSetResult with totals, agreement pct, mismatches list."""
    tuples = [_tuple("t-1", 2, "med")]
    scorer = AsyncMock(return_value=_score(2))
    result = await run_golden_set_eval(tuples, "rubric", scorer)
    assert isinstance(result, GoldenSetResult)
    assert result.total == 1
    assert result.exact_score_matches == 1
    assert result.band_matches == 1
    assert result.score_agreement_pct == 100.0
    assert result.band_agreement_pct == 100.0
    assert result.mismatches == []


@pytest.mark.asyncio
async def test_h2_perfect_agreement_zero_mismatches():
    """H2: mock scorer echoes expected score -> 100% agreement, empty mismatches."""
    tuples = [
        _tuple("t-1", 0, "low"),
        _tuple("t-2", 1, "low"),
        _tuple("t-3", 2, "med"),
        _tuple("t-4", 3, "high"),
    ]
    idx = {"i": 0}

    async def echo(rubric, scene_context, question, student_answer):
        t = tuples[idx["i"]]
        idx["i"] += 1
        return _score(t["expected_score"])

    result = await run_golden_set_eval(tuples, "rubric", echo)
    assert result.score_agreement_pct == 100.0
    assert result.band_agreement_pct == 100.0
    assert result.mismatches == []


@pytest.mark.asyncio
async def test_h3_off_by_one_produces_90pct_agreement():
    """H3: 1 off-by-1 in 10 tuples -> 90% agreement, 1 mismatch entry."""
    tuples = [_tuple(f"t-{i}", 2, "med") for i in range(10)]
    off_at = 3

    async def mostly_correct(rubric, scene_context, question, student_answer):
        # Identify by student_answer suffix
        suffix = student_answer.rsplit("-", 1)[-1]
        if suffix == str(off_at):
            return _score(1)
        return _score(2)

    result = await run_golden_set_eval(tuples, "rubric", mostly_correct)
    assert result.total == 10
    assert result.exact_score_matches == 9
    assert result.score_agreement_pct == 90.0
    assert len(result.mismatches) == 1
    m = result.mismatches[0]
    assert m.expected_score == 2
    assert m.actual_score == 1


@pytest.mark.asyncio
async def test_h4_band_agreement_independent_of_exact_score():
    """H4: expected=0 (low), actual=1 (low) -> exact mismatch but band match."""
    tuples = [_tuple("t-1", 0, "low")]
    scorer = AsyncMock(return_value=_score(1))
    result = await run_golden_set_eval(tuples, "rubric", scorer)
    assert result.exact_score_matches == 0
    assert result.band_matches == 1
    assert result.score_agreement_pct == 0.0
    assert result.band_agreement_pct == 100.0


@pytest.mark.asyncio
async def test_h5_scorer_called_with_passthrough_args():
    """H5: scorer called exactly len(tuples) times with rubric+scene+question+answer."""
    tuples = [_tuple("t-1", 2, "med"), _tuple("t-2", 3, "high")]
    scorer = AsyncMock(side_effect=[_score(2), _score(3)])
    await run_golden_set_eval(tuples, "the-rubric", scorer)
    assert scorer.call_count == 2
    assert scorer.call_args_list[0] == call(
        rubric="the-rubric",
        scene_context="context for t-1",
        question="question for t-1",
        student_answer="answer for t-1",
    )
    assert scorer.call_args_list[1] == call(
        rubric="the-rubric",
        scene_context="context for t-2",
        question="question for t-2",
        student_answer="answer for t-2",
    )


@pytest.mark.asyncio
async def test_h6_tuple_mismatch_record_shape():
    """H6: TupleMismatch records include all debugging fields."""
    tuples = [_tuple("t-9", 3, "high", scene="climax")]
    scorer = AsyncMock(return_value=_score(0, rationale="wrong answer totally"))
    result = await run_golden_set_eval(tuples, "rubric", scorer)
    assert len(result.mismatches) == 1
    m = result.mismatches[0]
    assert isinstance(m, TupleMismatch)
    assert m.tuple_id == "t-9"
    assert m.scene_id == "climax"
    assert m.expected_score == 3
    assert m.actual_score == 0
    assert m.expected_band == "high"
    assert m.actual_band == "low"
    assert m.actual_rationale == "wrong answer totally"


@pytest.mark.asyncio
async def test_h7_summary_report_contains_key_fields_and_caps_mismatches():
    """H7: summary_report() contains totals, agreement pct, caps mismatch list at 20."""
    tuples = [_tuple(f"t-{i}", 2, "med") for i in range(25)]
    scorer = AsyncMock(return_value=_score(0))  # all wrong
    result = await run_golden_set_eval(tuples, "rubric", scorer)
    report = result.summary_report()
    assert "25" in report
    assert "0.0%" in report
    assert "Phase 4 pilot gate" in report
    # Should list at most 20 mismatches in the report
    listed = report.count("expected score=")
    assert listed == 20
