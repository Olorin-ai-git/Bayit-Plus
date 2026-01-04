"""
Regenerate Monthly Report from Database

Fetches investigation data from the database (same source as startup flow)
and regenerates the monthly aggregate report.

Usage:
    poetry run python scripts/regenerate_monthly_report.py --year 2024 --month 12
"""

import asyncio
import calendar
import sys
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.monthly_analysis import DailyAnalysisResult, MonthlyAnalysisResult
from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer
from app.service.investigation.incremental_report import (
    _extract_window_date_from_investigations,
    _fetch_completed_auto_comp_investigations,
)
from app.service.logging import get_bridge_logger
from app.service.reporting.monthly_report_generator import generate_monthly_report

logger = get_bridge_logger(__name__)


def _safe_int(val: Any) -> int:
    """Safely convert to int."""
    try:
        return int(val) if val else 0
    except (ValueError, TypeError):
        return 0


def _safe_float(val: Any) -> float:
    """Safely convert to float."""
    try:
        return float(val) if val else 0.0
    except (ValueError, TypeError):
        return 0.0


async def regenerate_monthly(year: int, month: int) -> Path:
    """Regenerate monthly report from database data."""
    month_name = calendar.month_name[month]
    days_in_month = calendar.monthrange(year, month)[1]

    logger.info(f"Fetching investigations for {month_name} {year}...")

    # Fetch ALL completed investigations from database (same as startup flow)
    all_investigations = _fetch_completed_auto_comp_investigations()
    logger.info(f"Found {len(all_investigations)} total completed investigations")

    # Group investigations by their window date (day of month)
    by_day: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for inv in all_investigations:
        inv_date = _extract_window_date_from_investigations([inv])
        if inv_date and inv_date.year == year and inv_date.month == month:
            by_day[inv_date.day].append(inv)

    if not by_day:
        logger.error(f"No investigations found for {month_name} {year}")
        return None

    logger.info(f"Found {len(by_day)} days with investigations")

    # Build daily results for each day that has data
    daily_results: List[DailyAnalysisResult] = []
    for day_num in sorted(by_day.keys()):
        day_invs = by_day[day_num]

        # Review Precision Metrics (flagged-only)
        day_tp = sum(_safe_int(inv.get("confusion_matrix", {}).get("TP", 0)) for inv in day_invs)
        day_fp = sum(_safe_int(inv.get("confusion_matrix", {}).get("FP", 0)) for inv in day_invs)
        day_tn = sum(_safe_int(inv.get("confusion_matrix", {}).get("TN", 0)) for inv in day_invs)
        day_fn = sum(_safe_int(inv.get("confusion_matrix", {}).get("FN", 0)) for inv in day_invs)

        # Overall Classification Metrics (all transactions)
        day_overall_tp = sum(
            _safe_int(inv.get("confusion_matrix", {}).get("overall_TP", 0)) for inv in day_invs
        )
        day_overall_fp = sum(
            _safe_int(inv.get("confusion_matrix", {}).get("overall_FP", 0)) for inv in day_invs
        )
        day_overall_tn = sum(
            _safe_int(inv.get("confusion_matrix", {}).get("overall_TN", 0)) for inv in day_invs
        )
        day_overall_fn = sum(
            _safe_int(inv.get("confusion_matrix", {}).get("overall_FN", 0)) for inv in day_invs
        )

        day_saved = Decimal(
            str(
                sum(
                    _safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0))
                    for inv in day_invs
                )
            )
        )
        day_lost = Decimal(
            str(
                sum(
                    _safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0))
                    for inv in day_invs
                )
            )
        )
        day_net = day_saved - day_lost

        entities_discovered = len(day_invs)

        day_date = datetime(year, month, day_num)
        daily_results.append(
            DailyAnalysisResult(
                date=day_date,
                day_of_month=day_num,
                entities_expected=entities_discovered,
                entities_discovered=entities_discovered,
                tp=day_tp,
                fp=day_fp,
                tn=day_tn,
                fn=day_fn,
                overall_tp=day_overall_tp,
                overall_fp=day_overall_fp,
                overall_tn=day_overall_tn,
                overall_fn=day_overall_fn,
                saved_fraud_gmv=day_saved,
                lost_revenues=day_lost,
                net_value=day_net,
                investigation_ids=[inv.get("investigation_id", "") for inv in day_invs],
                started_at=datetime.now(),
                completed_at=datetime.now(),
                duration_seconds=0.0,
            )
        )

        logger.info(
            f"  Day {day_num}: {entities_discovered} entities, "
            f"TP={day_tp}, FP={day_fp}, TN={day_tn}, FN={day_fn}, "
            f"GMV=${day_saved:.2f}"
        )

    # Build monthly result with ALL days
    monthly_result = MonthlyAnalysisResult(
        year=year,
        month=month,
        month_name=month_name,
        total_days=days_in_month,
        daily_results=daily_results,
        started_at=datetime.now(),
        completed_at=datetime.now(),
    )
    monthly_result.aggregate_from_daily()

    logger.info(f"\n{'='*60}")
    logger.info(f"MONTHLY AGGREGATION: {month_name} {year}")
    logger.info(f"Days with data: {len(daily_results)}")
    logger.info(f"Total entities: {monthly_result.total_entities}")
    logger.info(
        f"Confusion: TP={monthly_result.total_tp}, FP={monthly_result.total_fp}, "
        f"TN={monthly_result.total_tn}, FN={monthly_result.total_fn}"
    )
    logger.info(f"Saved Fraud GMV: ${monthly_result.total_saved_fraud_gmv:.2f}")
    logger.info(f"Lost Revenues: ${monthly_result.total_lost_revenues:.2f}")
    logger.info(f"Net Value: ${monthly_result.total_net_value:.2f}")
    logger.info(f"{'='*60}")

    # Calculate the month's date range for consistent analysis
    month_start = datetime(year, month, 1)
    month_end = datetime(year, month, days_in_month, 23, 59, 59)

    # Run blindspot analysis for the heatmap - scoped to the specific month
    print("\nRunning blindspot analysis for heatmap...")
    blindspot_data = None
    try:
        analyzer = ModelBlindspotAnalyzer()
        blindspot_data = await analyzer.analyze_blindspots(
            export_csv=False,
            start_date=month_start,
            end_date=month_end,
        )
        if blindspot_data.get("status") == "success":
            print(
                f"✅ Blindspot analysis complete: "
                f"{len(blindspot_data.get('matrix', {}).get('cells', []))} cells, "
                f"{len(blindspot_data.get('blindspots', []))} blindspots identified"
            )
        else:
            print(f"⚠️ Blindspot analysis failed: {blindspot_data.get('error')}")
            blindspot_data = None
    except Exception as e:
        print(f"❌ Could not run blindspot analysis: {e}")
        import traceback
        traceback.print_exc()
        blindspot_data = None

    # Extract entity IDs from all investigations in the month
    all_month_invs = [inv for day_invs in by_day.values() for inv in day_invs]
    entity_ids = [
        inv.get("entity_value") or inv.get("email")
        for inv in all_month_invs
        if inv.get("entity_value") or inv.get("email")
    ]

    # Run investigated entities analysis
    investigated_blindspot_data = None
    if entity_ids:
        print(f"\nRunning investigated entities analysis for {len(entity_ids)} entities...")
        try:
            inv_analyzer = ModelBlindspotAnalyzer()
            investigated_blindspot_data = await inv_analyzer.analyze_investigated_entities(
                entity_ids, month_start, month_end
            )
            if investigated_blindspot_data and investigated_blindspot_data.get("gmv_by_score"):
                print(
                    f"✅ Investigated entities analysis complete: "
                    f"{len(investigated_blindspot_data.get('gmv_by_score', []))} score bins"
                )
            else:
                print("⚠️ Investigated entities analysis returned no data")
                investigated_blindspot_data = None
        except Exception as e:
            print(f"❌ Could not run investigated entities analysis: {e}")
            investigated_blindspot_data = None

    output_path = await generate_monthly_report(
        monthly_result, blindspot_data, investigated_blindspot_data
    )
    logger.info(f"\nMonthly report regenerated: {output_path}")

    return output_path


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Regenerate monthly report from database")
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--month", type=int, default=12)
    args = parser.parse_args()

    result = asyncio.run(regenerate_monthly(args.year, args.month))
    if result:
        print(f"\nSuccess: {result}")
    else:
        print("\nFailed to regenerate report")
        sys.exit(1)
