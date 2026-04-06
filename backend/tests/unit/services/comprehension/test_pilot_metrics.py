"""Unit tests for PilotMetricsService (04-01, Task 1).

Tests compute_pilot_metrics aggregation logic with mocked Beanie queries.
Covers: empty sessions, trigger rate, override rate, recalibration warning,
turn detail extraction, and multi-session aggregation.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.comprehension import AdaptLevel, RubricScore


def _make_override(score_before: int = 2, score_after: int = 3) -> MagicMock:
    entry = MagicMock()
    entry.score_before = score_before
    entry.score_after = score_after
    entry.rationale_before = "original"
    entry.rationale_after = "override reason"
    entry.timestamp = datetime.now(timezone.utc)
    entry.teacher_id = "teacher-1"
    entry.note = None
    return entry


def _make_exchange(
    score_val: int = 2,
    adapt: str = "initial",
    timestamp: float = 30.0,
    overrides: list | None = None,
) -> MagicMock:
    exch = MagicMock()
    exch.score = RubricScore(score=score_val, rationale="test rationale")
    exch.adapt_level = AdaptLevel(adapt)
    exch.moment_timestamp = timestamp
    exch.overrides = overrides or []
    return exch


def _make_session(
    session_id: str = "sess-1",
    user_id: str = "user-1",
    exchanges: list | None = None,
    duration_seconds: float = 300.0,
) -> MagicMock:
    session = MagicMock()
    session.id = session_id
    session.user_id = user_id
    session.exchanges = exchanges or []
    now = datetime.now(timezone.utc)
    session.created_at = now - timedelta(seconds=duration_seconds)
    session.updated_at = now
    session.status = "completed"
    session.partner_id = "pilot_org"
    return session


@pytest.mark.asyncio
async def test_empty_sessions_returns_zeroed_aggregate():
    """0 sessions returns empty lists and zeroed aggregate."""
    from app.services.olorin.comprehension.pilot_metrics import (
        PilotMetricsResult,
        compute_pilot_metrics,
    )

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    assert isinstance(result, PilotMetricsResult)
    assert result.sessions == []
    assert result.turns == []
    assert result.aggregate.total_sessions == 0
    assert result.aggregate.total_turns == 0
    assert result.aggregate.total_overrides == 0
    assert result.aggregate.aggregate_override_rate == 0.0
    assert result.aggregate.recalibration_warning is False


@pytest.mark.asyncio
async def test_two_sessions_correct_trigger_rate():
    """2 sessions with 3 exchanges each returns correct trigger_rate."""
    from app.services.olorin.comprehension.pilot_metrics import (
        compute_pilot_metrics,
    )

    exchanges = [
        _make_exchange(score_val=2, timestamp=30.0),
        _make_exchange(score_val=1, timestamp=120.0),
        _make_exchange(score_val=3, timestamp=210.0),
    ]
    s1 = _make_session("sess-1", "user-1", exchanges, duration_seconds=300.0)
    s2 = _make_session("sess-2", "user-2", exchanges, duration_seconds=600.0)

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[s1, s2])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    assert len(result.sessions) == 2
    # s1: 3 turns / (300/60) = 3/5 = 0.6 per minute
    assert abs(result.sessions[0].trigger_rate_per_minute - 0.6) < 0.01
    # s2: 3 turns / (600/60) = 3/10 = 0.3 per minute
    assert abs(result.sessions[1].trigger_rate_per_minute - 0.3) < 0.01


@pytest.mark.asyncio
async def test_override_rate_across_sessions():
    """override_rate = sum(overrides) / total_exchanges across sessions."""
    from app.services.olorin.comprehension.pilot_metrics import (
        compute_pilot_metrics,
    )

    overridden_exch = _make_exchange(
        score_val=1, overrides=[_make_override()],
    )
    normal_exch = _make_exchange(score_val=2)
    # Session 1: 1 overridden + 1 normal = 1/2 = 0.5
    s1 = _make_session("s1", "u1", [overridden_exch, normal_exch], 300.0)
    # Session 2: 2 normal = 0/2 = 0.0
    s2 = _make_session("s2", "u2", [normal_exch, normal_exch], 300.0)

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[s1, s2])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    # Aggregate: 1 override / 4 total = 0.25
    assert abs(result.aggregate.aggregate_override_rate - 0.25) < 0.01
    assert result.aggregate.total_overrides == 1


@pytest.mark.asyncio
async def test_recalibration_warning_when_override_above_20():
    """recalibration_warning = True when aggregate override_rate > 0.20."""
    from app.services.olorin.comprehension.pilot_metrics import (
        compute_pilot_metrics,
    )

    overridden = _make_exchange(score_val=1, overrides=[_make_override()])
    normal = _make_exchange(score_val=2)
    # 3 overridden + 1 normal = 3/4 = 0.75
    s1 = _make_session(
        "s1", "u1",
        [overridden, overridden, overridden, normal],
        300.0,
    )

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[s1])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    assert result.aggregate.recalibration_warning is True


@pytest.mark.asyncio
async def test_no_recalibration_warning_at_20():
    """recalibration_warning = False when exactly at 0.20 threshold."""
    from app.services.olorin.comprehension.pilot_metrics import (
        compute_pilot_metrics,
    )

    overridden = _make_exchange(score_val=1, overrides=[_make_override()])
    normal = _make_exchange(score_val=2)
    # 1 overridden + 4 normal = 1/5 = 0.20 (boundary - not above)
    s1 = _make_session(
        "s1", "u1",
        [overridden, normal, normal, normal, normal],
        300.0,
    )

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[s1])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    assert result.aggregate.recalibration_warning is False


@pytest.mark.asyncio
async def test_turns_detail_extraction():
    """turns list has correct adapt_level and score_band from ScoredExchange."""
    from app.services.olorin.comprehension.pilot_metrics import (
        compute_pilot_metrics,
    )

    exchanges = [
        _make_exchange(score_val=3, adapt="initial", timestamp=10.0),
        _make_exchange(
            score_val=1, adapt="simpler_retry", timestamp=100.0,
            overrides=[_make_override(1, 2)],
        ),
    ]
    s1 = _make_session("s1", "u1", exchanges, 300.0)

    mock_find = MagicMock()
    mock_find.to_list = AsyncMock(return_value=[s1])

    with patch(
        "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"
    ) as mock_cs:
        mock_cs.find = MagicMock(return_value=mock_find)
        result = await compute_pilot_metrics(cohort_id="pilot_org")

    assert len(result.turns) == 2
    t0 = result.turns[0]
    assert t0.session_id == "s1"
    assert t0.turn_idx == 0
    assert t0.adapt_level == "initial"
    assert t0.score_band == "high"
    assert t0.override_applied is False
    assert t0.playback_time_at_trigger == 10.0

    t1 = result.turns[1]
    assert t1.turn_idx == 1
    assert t1.adapt_level == "simpler_retry"
    assert t1.score_band == "low"
    assert t1.override_applied is True
    assert t1.playback_time_at_trigger == 100.0
