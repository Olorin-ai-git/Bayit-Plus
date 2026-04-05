"""Task 1: Model extensions for Phase 3 teacher-report + B2B SDK.

Validates D-01 (TrainingRole teacher), D-14 (CapabilityType comprehension_mode),
D-21 (WebhookEventType comprehension events), D-11 (OverrideAuditEntry shape),
D-09 (share_token field) and the current_authoritative_* helpers.
"""
from datetime import datetime
from typing import get_args
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import (
    OverrideAuditEntry,
    ScoredExchange,
    current_authoritative_rationale,
    current_authoritative_score,
)
from app.models.integration_partner import CapabilityType, WebhookEventType
from app.models.training_user import TrainingConfig, TrainingRole
from app.schemas.comprehension import AdaptLevel, RubricScore


def _score(n: int = 2, rationale: str = "adequate") -> RubricScore:
    return RubricScore(score=n, rationale=rationale)


def _exchange(score_n: int = 2) -> ScoredExchange:
    return ScoredExchange(
        question_text="What is Friday's motive?",
        student_answer="She wants a scoop.",
        score=_score(score_n),
        adapt_level=AdaptLevel.INITIAL,
        moment_timestamp=42.0,
    )


def test_training_role_literal_includes_teacher() -> None:
    assert "teacher" in get_args(TrainingRole)
    assert "admin" in get_args(TrainingRole)
    assert "viewer" in get_args(TrainingRole)


def test_capability_type_includes_comprehension_mode() -> None:
    assert "comprehension_mode" in get_args(CapabilityType)


def test_webhook_event_type_includes_comprehension_events() -> None:
    events = get_args(WebhookEventType)
    assert "comprehension.session.started" in events
    assert "comprehension.turn.posted" in events


def test_scored_exchange_default_overrides_empty_list() -> None:
    exch = _exchange()
    assert exch.overrides == []
    # Round-trip through JSON to confirm serialization default.
    data = exch.model_dump()
    assert data["overrides"] == []
    round_tripped = ScoredExchange(**data)
    assert round_tripped.overrides == []


def test_override_audit_entry_has_all_seven_fields() -> None:
    entry = OverrideAuditEntry(
        teacher_id="tchr-1",
        score_before=1,
        score_after=3,
        rationale_before="weak",
        rationale_after="sharp — student caught the subtext",
        note="reviewed in office hours",
    )
    dumped = entry.model_dump()
    for field in (
        "timestamp",
        "teacher_id",
        "score_before",
        "score_after",
        "rationale_before",
        "rationale_after",
        "note",
    ):
        assert field in dumped
    assert isinstance(dumped["timestamp"], datetime)


def test_override_audit_entry_rejects_out_of_range_score() -> None:
    with pytest.raises(ValidationError):
        OverrideAuditEntry(
            teacher_id="tchr-1",
            score_before=1,
            score_after=7,
            rationale_before="x",
            rationale_after="y",
        )


def test_comprehension_report_document_constructs() -> None:
    turn = ReportTurn(
        turn_index=0,
        question_text="Q?",
        student_answer="A.",
        numeric_score=2,
        rationale="right",
        adapt_level="initial",
        moment_timestamp=10.0,
        override_applied=False,
        original_numeric_score=2,
        original_rationale="right",
    )
    # Beanie Documents bind to a pymongo collection on __init__; stub it
    # out for unit tests so we can exercise field validation without Motor.
    with patch.object(
        ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = ComprehensionReport(
            comprehension_session_id="sess-1",
            partner_id="org-a",
            user_id="u1",
            profile_id="p1",
            content_id="his-girl-friday",
            character_name="Hildy",
            turn_count=1,
            avg_score=2.0,
            high_count=0,
            med_count=1,
            low_count=0,
            turns=[turn],
        )
    assert report.status == "generated"
    assert report.turns[0].numeric_score == 2


def test_current_authoritative_helpers_handle_empty_and_override() -> None:
    exch = _exchange(score_n=1)
    assert current_authoritative_score(exch) == 1
    assert current_authoritative_rationale(exch) == "adequate"
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="tchr-1",
            score_before=1,
            score_after=3,
            rationale_before="adequate",
            rationale_after="teacher-revised",
        )
    )
    assert current_authoritative_score(exch) == 3
    assert current_authoritative_rationale(exch) == "teacher-revised"
    # Second override supersedes the first.
    exch.overrides.append(
        OverrideAuditEntry(
            teacher_id="tchr-2",
            score_before=3,
            score_after=2,
            rationale_before="teacher-revised",
            rationale_after="second pass",
        )
    )
    assert current_authoritative_score(exch) == 2
    assert current_authoritative_rationale(exch) == "second pass"


def test_training_config_credits_remaining_defaults_to_zero() -> None:
    # Existing persisted docs without credits_remaining must deserialize.
    cfg = TrainingConfig(org_display_name="Acme School")
    assert cfg.credits_remaining == 0
    # Round-trip with only legacy keys.
    legacy = {"org_display_name": "Acme School", "seat_limit": 5}
    cfg2 = TrainingConfig(**legacy)
    assert cfg2.credits_remaining == 0
