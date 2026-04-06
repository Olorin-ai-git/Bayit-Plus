"""B2B sanitised DTO builders for comprehension_mode responses (D-19).

Hard invariants enforced by this module:
  - Responses expose band only (low|med|high) — never the 0-3 number.
  - Rationale is truncated to RATIONALE_SUMMARY_MAX chars.
  - Scoring-criteria text, grader prompts, and internal exchange lists
    are never touched here.

The module-level grep gate forbids tokens matching
"rubric|grader_prompt|recent_exchanges|\\.score\\.score".
"""
from typing import Optional

from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import (
    ComprehensionSession,
    ScoredExchange,
    current_authoritative_rationale,
    current_authoritative_score,
)
from app.schemas.partner_comprehension import (
    PartnerReportDTO,
    PartnerSessionDTO,
    PartnerTurnDTO,
)

RATIONALE_SUMMARY_MAX = 240


def _band_for(n: int) -> str:
    """Map authoritative 0-3 numeric score to band label."""
    if n >= 3:
        return "high"
    if n == 2:
        return "med"
    return "low"


def _adapt_level_str(adapt: object) -> str:
    if hasattr(adapt, "value"):
        return adapt.value  # type: ignore[attr-defined]
    return str(adapt)


def _summarise(text: str) -> str:
    if text is None:
        return ""
    if len(text) <= RATIONALE_SUMMARY_MAX:
        return text
    return text[:RATIONALE_SUMMARY_MAX]


def to_partner_turn_dto(
    exch: ScoredExchange, turn_index: int,
) -> PartnerTurnDTO:
    """Build sanitised per-turn DTO from a ScoredExchange (D-19)."""
    authoritative_numeric = current_authoritative_score(exch)
    authoritative_rationale = current_authoritative_rationale(exch)
    return PartnerTurnDTO(
        turn_index=turn_index,
        band=_band_for(authoritative_numeric),  # type: ignore[arg-type]
        rationale_summary=_summarise(authoritative_rationale),
        adapt_level=_adapt_level_str(exch.adapt_level),
        moment_timestamp=exch.moment_timestamp,
        override_applied=bool(exch.overrides),
    )


def to_partner_session_dto(
    session: ComprehensionSession,
    external_session_id: Optional[str],
) -> PartnerSessionDTO:
    """Build sanitised session metadata DTO."""
    return PartnerSessionDTO(
        session_id=str(session.id) if session.id else "",
        external_session_id=external_session_id,
        content_id=session.content_id,
        character_name=session.character_name,
        status=session.status,
        turn_count=len(session.exchanges),
        created_at=session.created_at,
    )


def to_partner_report_dto(report: ComprehensionReport) -> PartnerReportDTO:
    """Build sanitised report DTO from a stored ComprehensionReport (D-19)."""
    turns = []
    for stored_turn in report.turns:
        turns.append(
            PartnerTurnDTO(
                turn_index=stored_turn.turn_index,
                band=_band_for(stored_turn.numeric_score),  # type: ignore[arg-type]
                rationale_summary=_summarise(stored_turn.rationale),
                adapt_level=stored_turn.adapt_level,
                moment_timestamp=stored_turn.moment_timestamp,
                override_applied=stored_turn.override_applied,
            )
        )
    override_applied_any = any(t.override_applied for t in turns)
    return PartnerReportDTO(
        session_id=report.comprehension_session_id,
        content_id=report.content_id,
        turn_count=report.turn_count,
        high_count=report.high_count,
        med_count=report.med_count,
        low_count=report.low_count,
        turns=turns,
        generated_at=report.generated_at,
        override_applied_any=override_applied_any,
    )
