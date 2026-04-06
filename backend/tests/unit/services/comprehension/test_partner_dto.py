"""Task 2: sanitised partner DTO tests (D-19).

Invariant: serialised JSON carries no forbidden tokens —
numeric_score / rubric / grader / score:N / prompt text.
"""
import json
import re
from datetime import datetime
from unittest.mock import MagicMock, patch

from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import (
    OverrideAuditEntry,
    ScoredExchange,
)
from app.schemas.comprehension import AdaptLevel, RubricScore
from app.services.olorin.comprehension.partner_dto import (
    RATIONALE_SUMMARY_MAX,
    to_partner_report_dto,
    to_partner_turn_dto,
)


def _exch(n: int, rationale: str = "r") -> ScoredExchange:
    return ScoredExchange(
        question_text="Q",
        student_answer="A",
        score=RubricScore(score=n, rationale=rationale),
        adapt_level=AdaptLevel.HARDER,
        moment_timestamp=12.5,
    )


def test_band_mapping_for_each_numeric_score() -> None:
    for n, expected in ((0, "low"), (1, "low"), (2, "med"), (3, "high")):
        dto = to_partner_turn_dto(_exch(n), turn_index=0)
        assert dto.band == expected, f"score {n} should map to {expected}"


def test_rationale_summary_truncation() -> None:
    # RubricScore.rationale itself is capped at 240, but a teacher override
    # has no explicit cap — exercise the defensive truncation via overrides.
    exch = _exch(1, rationale="orig")
    long_text = "x" * (RATIONALE_SUMMARY_MAX + 50)
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="t", score_before=1, score_after=2,
            rationale_before="orig", rationale_after=long_text,
        ),
    )
    dto = to_partner_turn_dto(exch, turn_index=0)
    assert len(dto.rationale_summary) == RATIONALE_SUMMARY_MAX


def test_override_applied_flag_reflects_overrides_presence() -> None:
    exch = _exch(1)
    dto = to_partner_turn_dto(exch, turn_index=0)
    assert dto.override_applied is False
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="t", score_before=1, score_after=3,
            rationale_before="a", rationale_after="b",
        ),
    )
    dto = to_partner_turn_dto(exch, turn_index=0)
    assert dto.override_applied is True
    # Authoritative band reflects post-override score.
    assert dto.band == "high"


def test_partner_turn_dto_json_has_no_forbidden_tokens() -> None:
    dto = to_partner_turn_dto(_exch(3, rationale="sharp"), turn_index=0)
    blob = json.dumps(dto.model_dump())
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader_prompt", blob, re.IGNORECASE)
    # Raw "score":N without _ prefix (e.g., "score": 3) is also forbidden.
    assert not re.search(r'"score"\s*:\s*\d', blob)


def test_partner_report_dto_is_sanitised() -> None:
    turn = ReportTurn(
        turn_index=0,
        question_text="Q",
        student_answer="A",
        numeric_score=3,
        rationale="insightful",
        adapt_level="initial",
        moment_timestamp=1.0,
        override_applied=True,
        original_numeric_score=1,
        original_rationale="orig",
    )
    with patch.object(
        ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = ComprehensionReport(
            comprehension_session_id="s1",
            partner_id="org-a",
            user_id="u", profile_id="p", content_id="c", character_name="H",
            turn_count=1, avg_score=3.0,
            high_count=0, med_count=0, low_count=1,
            turns=[turn],
        )
    dto = to_partner_report_dto(report)
    blob = json.dumps(dto.model_dump(mode="json"))
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader", blob, re.IGNORECASE)
    assert not re.search(r'"score"\s*:\s*\d', blob)
    assert dto.override_applied_any is True
    assert dto.turns[0].band == "high"
    # Histogram counts flow through unchanged.
    assert dto.low_count == 1
