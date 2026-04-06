"""Unit tests for PilotMetricsService (04-01, Task 1).

Tests compute_pilot_metrics aggregation: empty, trigger rate, override rate,
recalibration warning, turn detail extraction.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.comprehension import AdaptLevel, RubricScore

PATCH_CS = "app.services.olorin.comprehension.pilot_metrics.ComprehensionSession"


def _override(score_before: int = 2, score_after: int = 3) -> MagicMock:
    return MagicMock(
        score_before=score_before, score_after=score_after,
        rationale_before="orig", rationale_after="override",
        timestamp=datetime.now(timezone.utc), teacher_id="t-1", note=None,
    )


def _exch(score_val=2, adapt="initial", ts=30.0, overrides=None):
    return MagicMock(
        score=RubricScore(score=score_val, rationale="r"),
        adapt_level=AdaptLevel(adapt), moment_timestamp=ts,
        overrides=overrides or [],
    )


def _session(sid="s-1", uid="u-1", exchanges=None, dur=300.0):
    now = datetime.now(timezone.utc)
    return MagicMock(
        id=sid, user_id=uid, exchanges=exchanges or [],
        created_at=now - timedelta(seconds=dur), updated_at=now,
        status="completed", partner_id="pilot_org",
    )


def _mock_find(sessions):
    mf = MagicMock()
    mf.to_list = AsyncMock(return_value=sessions)
    return mf


@pytest.mark.asyncio
async def test_empty_sessions_returns_zeroed_aggregate():
    """0 sessions -> empty lists, zeroed aggregate, no warning."""
    from app.services.olorin.comprehension.pilot_metrics import (
        PilotMetricsResult, compute_pilot_metrics,
    )
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert isinstance(r, PilotMetricsResult)
    assert r.sessions == [] and r.turns == []
    agg = r.aggregate
    assert agg.total_sessions == 0 and agg.total_turns == 0
    assert agg.aggregate_override_rate == 0.0
    assert agg.recalibration_warning is False


@pytest.mark.asyncio
async def test_two_sessions_correct_trigger_rate():
    """2 sessions with 3 exchanges each -> correct trigger_rate_per_minute."""
    from app.services.olorin.comprehension.pilot_metrics import compute_pilot_metrics
    ex = [_exch(2, ts=30.0), _exch(1, ts=120.0), _exch(3, ts=210.0)]
    s1 = _session("s1", "u1", ex, dur=300.0)
    s2 = _session("s2", "u2", ex, dur=600.0)
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([s1, s2]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert len(r.sessions) == 2
    assert abs(r.sessions[0].trigger_rate_per_minute - 0.6) < 0.01  # 3/(300/60)
    assert abs(r.sessions[1].trigger_rate_per_minute - 0.3) < 0.01  # 3/(600/60)


@pytest.mark.asyncio
async def test_override_rate_across_sessions():
    """override_rate = sum(overrides) / total_exchanges across sessions."""
    from app.services.olorin.comprehension.pilot_metrics import compute_pilot_metrics
    ov = _exch(score_val=1, overrides=[_override()])
    nm = _exch(score_val=2)
    s1 = _session("s1", "u1", [ov, nm], 300.0)
    s2 = _session("s2", "u2", [nm, nm], 300.0)
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([s1, s2]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert abs(r.aggregate.aggregate_override_rate - 0.25) < 0.01  # 1/4
    assert r.aggregate.total_overrides == 1


@pytest.mark.asyncio
async def test_recalibration_warning_when_override_above_20():
    """recalibration_warning = True when aggregate override_rate > 0.20."""
    from app.services.olorin.comprehension.pilot_metrics import compute_pilot_metrics
    ov = _exch(score_val=1, overrides=[_override()])
    nm = _exch(score_val=2)
    s1 = _session("s1", "u1", [ov, ov, ov, nm], 300.0)  # 3/4 = 0.75
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([s1]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert r.aggregate.recalibration_warning is True


@pytest.mark.asyncio
async def test_no_recalibration_warning_at_20():
    """recalibration_warning = False when exactly at 0.20 boundary."""
    from app.services.olorin.comprehension.pilot_metrics import compute_pilot_metrics
    ov = _exch(score_val=1, overrides=[_override()])
    nm = _exch(score_val=2)
    s1 = _session("s1", "u1", [ov, nm, nm, nm, nm], 300.0)  # 1/5 = 0.20
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([s1]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert r.aggregate.recalibration_warning is False


@pytest.mark.asyncio
async def test_turns_detail_extraction():
    """turns list has correct adapt_level, score_band, override_applied."""
    from app.services.olorin.comprehension.pilot_metrics import compute_pilot_metrics
    exchanges = [
        _exch(score_val=3, adapt="initial", ts=10.0),
        _exch(score_val=1, adapt="simpler_retry", ts=100.0,
              overrides=[_override(1, 2)]),
    ]
    s1 = _session("s1", "u1", exchanges, 300.0)
    with patch(PATCH_CS) as mc:
        mc.find = MagicMock(return_value=_mock_find([s1]))
        r = await compute_pilot_metrics(cohort_id="pilot_org")
    assert len(r.turns) == 2
    t0 = r.turns[0]
    assert (t0.session_id, t0.turn_idx) == ("s1", 0)
    assert t0.adapt_level == "initial" and t0.score_band == "high"
    assert t0.override_applied is False and t0.playback_time_at_trigger == 10.0
    t1 = r.turns[1]
    assert (t1.turn_idx, t1.adapt_level) == (1, "simpler_retry")
    assert t1.score_band == "med"  # override raised score 1->2
    assert t1.override_applied is True and t1.playback_time_at_trigger == 100.0
