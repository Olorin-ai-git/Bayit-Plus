"""Monthly report updater for incremental reports."""

import asyncio
import calendar
import logging
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .blindspot_analysis import run_investigated_entities_analysis
from .file_utils import extract_window_date_from_investigations
from .utils import safe_float, safe_int

logger = logging.getLogger(__name__)


def update_monthly_report_from_daily(
    window_date: datetime,
    investigations: List[Dict[str, Any]],
    blindspot_data: Optional[Dict[str, Any]] = None,
    fetch_investigations_fn=None,
) -> None:
    """
    Update the monthly report with aggregated data from ALL daily reports.

    This is called after each daily report is generated. It queries all completed
    investigations for the month, groups them by window date, and regenerates
    the monthly totals from scratch - ensuring accuracy.
    """
    try:
        from app.schemas.monthly_analysis import DailyAnalysisResult, MonthlyAnalysisResult
        from app.service.reporting.monthly_report_generator import generate_monthly_report

        if fetch_investigations_fn is None:
            from .data_fetchers import fetch_completed_auto_comp_investigations

            fetch_investigations_fn = fetch_completed_auto_comp_investigations

        year = window_date.year
        month = window_date.month

        all_investigations = fetch_investigations_fn()
        by_day = _group_investigations_by_day(all_investigations, year, month)

        if not by_day:
            logger.info(f"No investigations found for {year}-{month:02d}")
            return

        daily_results = _build_daily_results(by_day, year, month)

        monthly_result = _build_monthly_result(daily_results, year, month)
        monthly_result.aggregate_from_daily()

        investigated_blindspot_data = _run_monthly_blindspot_analysis(daily_results, year, month)

        _generate_and_save_monthly_report(
            monthly_result, blindspot_data, investigated_blindspot_data, year, month, by_day
        )

    except Exception as e:
        logger.warning(f"Could not update monthly report: {e}")


def _group_investigations_by_day(
    all_investigations: List[Dict], year: int, month: int
) -> Dict[int, List[Dict]]:
    """Group investigations by their window date (day of month)."""
    by_day: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for inv in all_investigations:
        inv_date = extract_window_date_from_investigations([inv])
        if inv_date and inv_date.year == year and inv_date.month == month:
            by_day[inv_date.day].append(inv)
    return by_day


def _build_daily_results(by_day: Dict[int, List[Dict]], year: int, month: int) -> List:
    """Build daily results for each day that has data."""
    from app.schemas.monthly_analysis import DailyAnalysisResult

    daily_results = []
    for day_num in sorted(by_day.keys()):
        day_invs = by_day[day_num]
        day_result = _build_single_day_result(day_invs, year, month, day_num)
        daily_results.append(day_result)
    return daily_results


def _build_single_day_result(day_invs: List[Dict], year: int, month: int, day_num: int):
    """Build a DailyAnalysisResult for a single day."""
    from app.schemas.monthly_analysis import DailyAnalysisResult

    day_tp = sum(safe_int(inv.get("confusion_matrix", {}).get("TP", 0)) for inv in day_invs)
    day_fp = sum(safe_int(inv.get("confusion_matrix", {}).get("FP", 0)) for inv in day_invs)
    day_tn = sum(safe_int(inv.get("confusion_matrix", {}).get("TN", 0)) for inv in day_invs)
    day_fn = sum(safe_int(inv.get("confusion_matrix", {}).get("FN", 0)) for inv in day_invs)

    day_overall_tp = sum(safe_int(inv.get("confusion_matrix", {}).get("overall_TP", 0)) for inv in day_invs)
    day_overall_fp = sum(safe_int(inv.get("confusion_matrix", {}).get("overall_FP", 0)) for inv in day_invs)
    day_overall_tn = sum(safe_int(inv.get("confusion_matrix", {}).get("overall_TN", 0)) for inv in day_invs)
    day_overall_fn = sum(safe_int(inv.get("confusion_matrix", {}).get("overall_FN", 0)) for inv in day_invs)

    day_saved = Decimal(
        str(sum(safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in day_invs))
    )
    day_lost = Decimal(
        str(sum(safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in day_invs))
    )

    vendor_gmv = _build_vendor_gmv_breakdown(day_invs)
    day_entity_values = [
        inv.get("entity_value") or inv.get("email")
        for inv in day_invs
        if inv.get("entity_value") or inv.get("email")
    ]

    return DailyAnalysisResult(
        date=datetime(year, month, day_num),
        day_of_month=day_num,
        entities_expected=len(day_invs),
        entities_discovered=len(day_invs),
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
        net_value=day_saved - day_lost,
        vendor_gmv_breakdown=vendor_gmv,
        investigation_ids=[inv.get("investigation_id", "") for inv in day_invs],
        entity_values=day_entity_values,
        started_at=datetime.now(),
        completed_at=datetime.now(),
        duration_seconds=0.0,
    )


def _build_vendor_gmv_breakdown(day_invs: List[Dict]) -> Dict[str, float]:
    """Build vendor GMV breakdown for day headers."""
    vendor_gmv: Dict[str, float] = {}
    for inv in day_invs:
        merchant = inv.get("merchant_name", "Unknown")
        rev_data = inv.get("revenue_data", {})
        if rev_data:
            saved = safe_float(rev_data.get("saved_fraud_gmv", 0))
            lost = safe_float(rev_data.get("lost_revenues", 0))
            net_val = saved - lost
        else:
            net_val = 0
        vendor_gmv[merchant] = vendor_gmv.get(merchant, 0) + net_val
    return vendor_gmv


def _build_monthly_result(daily_results: List, year: int, month: int):
    """Build MonthlyAnalysisResult from daily results."""
    from app.schemas.monthly_analysis import MonthlyAnalysisResult

    days_in_month = calendar.monthrange(year, month)[1]
    month_name = calendar.month_name[month]

    return MonthlyAnalysisResult(
        year=year,
        month=month,
        month_name=month_name,
        total_days=days_in_month,
        daily_results=daily_results,
        started_at=datetime.now(),
        completed_at=None,
    )


def _run_monthly_blindspot_analysis(daily_results: List, year: int, month: int) -> Optional[Dict]:
    """Run investigated entities analysis for monthly report toggle."""
    all_entity_values = []
    for day_result in daily_results:
        all_entity_values.extend(day_result.entity_values)

    if not all_entity_values:
        return None

    days_in_month = calendar.monthrange(year, month)[1]
    month_start = datetime(year, month, 1, 0, 0, 0)
    month_end = datetime(year, month, days_in_month, 23, 59, 59)

    return run_investigated_entities_analysis(all_entity_values, month_start, month_end)


def _generate_and_save_monthly_report(
    monthly_result,
    blindspot_data: Optional[Dict],
    investigated_blindspot_data: Optional[Dict],
    year: int,
    month: int,
    by_day: Dict,
) -> None:
    """Generate and save the monthly report."""
    from app.service.reporting.monthly_report_generator import generate_monthly_report

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(
            generate_monthly_report(monthly_result, blindspot_data, investigated_blindspot_data)
        )
        days_with_data = len(by_day)
        total_invs = sum(len(by_day[d]) for d in by_day)
        month_name = calendar.month_name[month]
        logger.info(
            f"Monthly report updated for {month_name} {year} "
            f"({days_with_data} days, {total_invs} investigations)"
        )
    finally:
        loop.close()
