"""Assembly-only comprehension report builder (D-05, REPT-03, PITFALLS #4).

Zero LLM calls. This module is grep-gated: downstream tests assert that no
LLM client symbols appear in module globals.

Aggregates ScoredExchange rows from a completed ComprehensionSession into
a ComprehensionReport Document. The authoritative per-turn score reflects
any teacher overrides appended to ScoredExchange.overrides[]; the histogram
(high/med/low counts) however is derived from the ORIGINAL rubric bands so
the pre/post delta is preserved for the teacher surface.
"""
from typing import List

from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import (
    ComprehensionSession,
    ScoredExchange,
    current_authoritative_rationale,
    current_authoritative_score,
)
from app.schemas.comprehension import ScoreBand


def _build_report_turn(exch: ScoredExchange, turn_index: int) -> ReportTurn:
    """Assemble a single ReportTurn from a ScoredExchange (no LLM)."""
    override_applied = bool(exch.overrides)
    return ReportTurn(
        turn_index=turn_index,
        question_text=exch.question_text,
        student_answer=exch.student_answer,
        numeric_score=current_authoritative_score(exch),
        rationale=current_authoritative_rationale(exch),
        adapt_level=exch.adapt_level.value if hasattr(exch.adapt_level, "value")
        else str(exch.adapt_level),
        moment_timestamp=exch.moment_timestamp,
        override_applied=override_applied,
        original_numeric_score=exch.score.score,
        original_rationale=exch.score.rationale,
    )


def _histogram_from_original_bands(
    exchanges: List[ScoredExchange],
) -> tuple[int, int, int]:
    """Return (high_count, med_count, low_count) from pre-override bands."""
    high = med = low = 0
    for exch in exchanges:
        band = exch.score.band
        if band == ScoreBand.HIGH:
            high += 1
        elif band == ScoreBand.MED:
            med += 1
        else:
            low += 1
    return high, med, low


def build_report_from_session(
    session: ComprehensionSession,
    partner_id: str,
) -> ComprehensionReport:
    """Assemble a ComprehensionReport from a completed session (D-05).

    Returns an unsaved ComprehensionReport instance — caller is responsible
    for upsert. avg_score is computed over authoritative (post-override)
    numeric scores; histogram counts use original rubric bands.
    """
    turns = [
        _build_report_turn(exch, idx)
        for idx, exch in enumerate(session.exchanges)
    ]
    turn_count = len(turns)
    if turn_count > 0:
        total = sum(t.numeric_score for t in turns)
        avg_score = round(total / turn_count, 2)
    else:
        avg_score = 0.0
    high_count, med_count, low_count = _histogram_from_original_bands(
        session.exchanges,
    )
    return ComprehensionReport(
        comprehension_session_id=str(session.id) if session.id else "",
        partner_id=partner_id,
        user_id=session.user_id,
        profile_id=session.profile_id,
        content_id=session.content_id,
        character_name=session.character_name,
        turn_count=turn_count,
        avg_score=avg_score,
        high_count=high_count,
        med_count=med_count,
        low_count=low_count,
        turns=turns,
        status="generated",
    )
