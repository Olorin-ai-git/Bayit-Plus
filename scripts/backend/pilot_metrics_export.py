"""Export pilot metrics to CSV and JSON for Phase 4 evidence (D-06, D-07).

Calls compute_pilot_metrics and writes three files to .planning/phases/04-pilot-hardening/:
  - pilot-metrics-summary-{date}.csv (per-session, D-07 sheet 1)
  - pilot-metrics-detail-{date}.csv  (per-turn, D-07 sheet 2)
  - pilot-metrics-{date}.json        (full PilotMetricsResult)

PILOT-03 Gate Workflow (D-01, D-02):
  1. Run: poetry run pytest tests/eval/test_grader_golden_set.py::test_grader_agreement_live -m live -s
  2. Capture the GoldenSetResult.summary_report() output
  3. Create PILOT-03-GATE.md with:
     - JSON: {score_agreement_pct, band_agreement_pct, mismatches_count, timestamp}
     - Markdown: dev sign-off, pass/fail (>=85% = pass, 80-84% = proceed with
       calibration badge per D-03, <80% = block)
  4. Commit to .planning/phases/04-pilot-hardening/PILOT-03-GATE.md

Usage:
    cd olorin-media/bayit-plus/backend
    poetry run python -m scripts.pilot_metrics_export
"""
import asyncio
import csv
import dataclasses
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.services.olorin.comprehension.pilot_metrics import (
    compute_pilot_metrics,
)

logger = logging.getLogger(__name__)

COHORT_ID = "pilot_org"
OUTPUT_DIR = Path(__file__).resolve().parents[3] / ".planning" / "phases" / "04-pilot-hardening"

SUMMARY_HEADERS = [
    "session_id", "user_id", "trigger_rate_per_minute",
    "total_turns", "overrides_count", "override_rate", "duration_seconds",
]
DETAIL_HEADERS = [
    "session_id", "turn_idx", "adapt_level",
    "score_band", "override_applied", "playback_time_at_trigger",
]


def _write_summary_csv(path: Path, result) -> None:
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(SUMMARY_HEADERS)
        for s in result.sessions:
            w.writerow([
                s.session_id, s.user_id, f"{s.trigger_rate_per_minute:.4f}",
                s.total_turns, s.overrides_count, f"{s.override_rate:.4f}",
                f"{s.duration_seconds:.1f}",
            ])
        agg = result.aggregate
        w.writerow([
            "AGGREGATE", "", "",
            agg.total_turns, agg.total_overrides,
            f"{agg.aggregate_override_rate:.4f}", "",
        ])


def _write_detail_csv(path: Path, result) -> None:
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(DETAIL_HEADERS)
        for t in result.turns:
            w.writerow([
                t.session_id, t.turn_idx, t.adapt_level,
                t.score_band, t.override_applied, f"{t.playback_time_at_trigger:.1f}",
            ])


def _write_json(path: Path, result) -> None:
    data = dataclasses.asdict(result)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


async def main() -> None:
    """Connect to MongoDB, compute pilot metrics, write export files."""
    from app.core.database import connect_to_mongo_subset
    from app.models.comprehension_session import ComprehensionSession

    await connect_to_mongo_subset([ComprehensionSession])

    result = await compute_pilot_metrics(cohort_id=COHORT_ID)
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = OUTPUT_DIR / f"pilot-metrics-summary-{date_str}.csv"
    detail_path = OUTPUT_DIR / f"pilot-metrics-detail-{date_str}.csv"
    json_path = OUTPUT_DIR / f"pilot-metrics-{date_str}.json"

    _write_summary_csv(summary_path, result)
    _write_detail_csv(detail_path, result)
    _write_json(json_path, result)

    agg = result.aggregate
    lines = [
        f"Pilot metrics exported for cohort: {COHORT_ID}",
        f"  Sessions: {agg.total_sessions}",
        f"  Turns:    {agg.total_turns}",
        f"  Override rate: {agg.aggregate_override_rate:.2%}",
        f"  Files:",
        f"    {summary_path}",
        f"    {detail_path}",
        f"    {json_path}",
    ]
    if agg.recalibration_warning:
        lines.append(
            "WARNING: Aggregate override rate exceeds 20%. "
            "Grader may need recalibration (per D-08).",
        )
    sys.stdout.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
