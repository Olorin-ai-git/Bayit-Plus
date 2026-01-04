#!/usr/bin/env python3
"""
Regenerate Daily Incremental Report for a Specific Date.

Uses the incremental report generator to regenerate daily reports
with blindspot analysis and investigated entities toggle.

Usage:
    poetry run python scripts/regenerate_daily_report.py --date 2024-12-15
    poetry run python scripts/regenerate_daily_report.py --year 2024 --month 12
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.investigation.incremental_report import (
    _fetch_completed_auto_comp_investigations,
    _extract_window_date_from_investigations,
    regenerate_report_for_date,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_dates_with_data(year: int, month: int) -> List[datetime]:
    """Find all dates in a month that have investigation data."""
    investigations = _fetch_completed_auto_comp_investigations()

    dates_with_data = set()
    for inv in investigations:
        inv_date = _extract_window_date_from_investigations([inv])
        if inv_date and inv_date.year == year and inv_date.month == month:
            dates_with_data.add(inv_date.date())

    return sorted([datetime.combine(d, datetime.min.time()) for d in dates_with_data])


def regenerate_single_date(target_date: str) -> bool:
    """Regenerate report for a single date."""
    try:
        dt = datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError:
        logger.error(f"Invalid date format: {target_date} (expected YYYY-MM-DD)")
        return False

    result = regenerate_report_for_date(dt)
    return result is not None


def regenerate_month(year: int, month: int) -> int:
    """Regenerate all daily reports for a month. Returns count of successful reports."""
    dates = get_dates_with_data(year, month)

    if not dates:
        logger.error(f"No data found for {year}-{month:02d}")
        return 0

    logger.info(f"Found {len(dates)} days with data in {year}-{month:02d}")

    success_count = 0
    for i, dt in enumerate(dates, 1):
        logger.info(f"\n[{i}/{len(dates)}] Regenerating {dt.date()}...")
        result = regenerate_report_for_date(dt)
        if result:
            success_count += 1
            print(f"  ✅ {result.name}")
        else:
            print(f"  ❌ Failed")

    return success_count


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Regenerate daily reports")
    parser.add_argument("--date", type=str, help="Single date in YYYY-MM-DD format")
    parser.add_argument("--year", type=int, help="Year for batch regeneration")
    parser.add_argument("--month", type=int, help="Month for batch regeneration")
    args = parser.parse_args()

    if args.date:
        # Single date mode
        success = regenerate_single_date(args.date)
        sys.exit(0 if success else 1)
    elif args.year and args.month:
        # Batch mode for entire month
        count = regenerate_month(args.year, args.month)
        print(f"\nDone! Regenerated {count} reports.")
        sys.exit(0 if count > 0 else 1)
    else:
        parser.error("Either --date or both --year and --month are required")
