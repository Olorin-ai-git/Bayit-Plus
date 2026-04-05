"""Unit tests for Comprehension Mode schemas (Phase 2 Plan 01-01 Task 1).

Covers decisions D-03 (numeric 0-3 + derived band), D-04 (rationale <=240 chars),
D-11 (Pydantic-enforced structured output shape), D-02 (ExchangeType tag),
D-12/D-13 (AdaptLevel state machine).
"""
import pytest
from pydantic import ValidationError

from app.schemas.comprehension import (
    AdaptLevel,
    ExchangeType,
    FollowUpQuestion,
    RubricScore,
    ScoreBand,
    TriggerDecision,
)


def test_rubric_score_band_low_when_wrong():
    """D-03: score 0 (wrong) maps to LOW band."""
    assert RubricScore(score=0, rationale="wrong").band == ScoreBand.LOW


def test_rubric_score_band_low_when_partial():
    """D-03: score 1 (partial) also maps to LOW band."""
    assert RubricScore(score=1, rationale="partial").band == ScoreBand.LOW


def test_rubric_score_band_med_when_right():
    """D-03: score 2 (right) maps to MED band."""
    assert RubricScore(score=2, rationale="right").band == ScoreBand.MED


def test_rubric_score_band_high_when_insightful():
    """D-03: score 3 (insightful) maps to HIGH band."""
    assert RubricScore(score=3, rationale="insightful").band == ScoreBand.HIGH


def test_rubric_score_rejects_score_above_three():
    """D-03: score bounded 0-3 inclusive."""
    with pytest.raises(ValidationError):
        RubricScore(score=4, rationale="x")


def test_rubric_score_rejects_rationale_over_240_chars():
    """D-04: rationale capped at 240 chars (one sentence ceiling)."""
    with pytest.raises(ValidationError):
        RubricScore(score=1, rationale="x" * 241)


def test_exchange_type_enum_values():
    """D-02: exchange_type tag values are stable strings."""
    assert ExchangeType.CHARACTER_CHAT.value == "character_chat"
    assert ExchangeType.COMPREHENSION_GRADER.value == "comprehension_grader"


def test_adapt_level_members_and_values():
    """D-12, D-13: 4-member state machine with lowercase string values."""
    assert AdaptLevel.INITIAL.value == "initial"
    assert AdaptLevel.HARDER.value == "harder"
    assert AdaptLevel.SIMPLER_RETRY.value == "simpler_retry"
    assert AdaptLevel.ANSWER_REVEAL.value == "answer_reveal"


def test_trigger_decision_accepts_both_booleans():
    """D-06, D-07: classifier emits both trigger and skip decisions."""
    trig = TriggerDecision(should_trigger=True, reason="scene transition")
    skip = TriggerDecision(should_trigger=False, reason="recent exchange covered this")
    assert trig.should_trigger is True
    assert skip.should_trigger is False


def test_follow_up_question_validates():
    """D-08, D-09, D-12: adaptive follow-up question shape."""
    q = FollowUpQuestion(
        question_text="Why did Walter print the story?",
        adapt_level=AdaptLevel.HARDER,
        in_character_phrasing="Think you're ready for a tougher one?",
    )
    assert q.adapt_level == AdaptLevel.HARDER
    assert q.question_text.startswith("Why")
