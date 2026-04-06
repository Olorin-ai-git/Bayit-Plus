"""PilotMetricsService - stateless aggregator for Phase 4 pilot data (D-05).

Reads ComprehensionSession docs filtered by partner_id (cohort scoping per
D-15) and computes trigger rate, override rate, and recalibration warning
(D-08 threshold > 0.20). On-demand, no background worker, no cached snapshot.

DEV/PILOT ONLY. Used by scripts/pilot_metrics_export.py (CLI) and
app/api/routes/training/pilot_metrics.py (training-portal surface).
"""
from dataclasses import dataclass, field
from typing import List

from app.core.logging_config import get_logger
from app.models.comprehension_session import (
    ComprehensionSession,
    current_authoritative_score,
)
from app.services.olorin.comprehension.eval_harness import _score_to_band

logger = get_logger(__name__)

RECALIBRATION_THRESHOLD = 0.20


@dataclass
class PilotSessionSummary:
    """Per-session aggregate row (D-07 sheet 1)."""

    session_id: str
    user_id: str
    trigger_rate_per_minute: float
    total_turns: int
    overrides_count: int
    override_rate: float
    duration_seconds: float


@dataclass
class PilotTurnDetail:
    """Per-turn detail row (D-07 sheet 2)."""

    session_id: str
    turn_idx: int
    adapt_level: str
    score_band: str
    override_applied: bool
    playback_time_at_trigger: float


@dataclass
class PilotAggregate:
    """Cross-session aggregate (D-08 recalibration check)."""

    total_sessions: int
    total_turns: int
    total_overrides: int
    aggregate_override_rate: float
    recalibration_warning: bool


@dataclass
class PilotMetricsResult:
    """Complete pilot metrics output."""

    sessions: List[PilotSessionSummary] = field(default_factory=list)
    turns: List[PilotTurnDetail] = field(default_factory=list)
    aggregate: PilotAggregate = field(
        default_factory=lambda: PilotAggregate(
            total_sessions=0,
            total_turns=0,
            total_overrides=0,
            aggregate_override_rate=0.0,
            recalibration_warning=False,
        ),
    )


async def compute_pilot_metrics(cohort_id: str) -> PilotMetricsResult:
    """Compute pilot metrics for a cohort filtered by partner_id.

    Args:
        cohort_id: partner_id value used to scope pilot sessions.

    Returns:
        PilotMetricsResult with session summaries, turn details, and aggregate.
    """
    sessions = await ComprehensionSession.find(
        {"partner_id": cohort_id, "status": "completed"},
    ).to_list()

    if not sessions:
        logger.info(
            "No completed sessions for cohort",
            extra={"cohort_id": cohort_id},
        )
        return PilotMetricsResult()

    all_summaries: List[PilotSessionSummary] = []
    all_turns: List[PilotTurnDetail] = []
    agg_turns = 0
    agg_overrides = 0

    for session in sessions:
        duration = (session.updated_at - session.created_at).total_seconds()
        total_turns = len(session.exchanges)
        overrides_count = sum(
            len(e.overrides) for e in session.exchanges
        )
        minutes = duration / 60.0
        trigger_rate = (total_turns / minutes) if minutes > 0 else 0.0
        override_rate = (
            overrides_count / total_turns if total_turns > 0 else 0.0
        )

        all_summaries.append(
            PilotSessionSummary(
                session_id=str(session.id),
                user_id=session.user_id,
                trigger_rate_per_minute=trigger_rate,
                total_turns=total_turns,
                overrides_count=overrides_count,
                override_rate=override_rate,
                duration_seconds=duration,
            ),
        )

        for idx, exch in enumerate(session.exchanges):
            score_val = current_authoritative_score(exch)
            all_turns.append(
                PilotTurnDetail(
                    session_id=str(session.id),
                    turn_idx=idx,
                    adapt_level=exch.adapt_level.value,
                    score_band=_score_to_band(score_val),
                    override_applied=len(exch.overrides) > 0,
                    playback_time_at_trigger=exch.moment_timestamp,
                ),
            )

        agg_turns += total_turns
        agg_overrides += overrides_count

    agg_override_rate = (
        agg_overrides / agg_turns if agg_turns > 0 else 0.0
    )

    return PilotMetricsResult(
        sessions=all_summaries,
        turns=all_turns,
        aggregate=PilotAggregate(
            total_sessions=len(sessions),
            total_turns=agg_turns,
            total_overrides=agg_overrides,
            aggregate_override_rate=agg_override_rate,
            recalibration_warning=agg_override_rate > RECALIBRATION_THRESHOLD,
        ),
    )
