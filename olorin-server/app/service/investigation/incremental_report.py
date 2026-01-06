"""
Incremental Report Generation

Generates and updates a SINGLE incremental HTML file after each investigation completes.
Fetches data directly from the database to ensure all confusion matrices are included.
Also updates monthly totals as daily reports are generated.
"""

import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .incremental_sections import (
    ARTIFACTS_DIR,
    extract_window_date_from_investigations,
    fetch_completed_auto_comp_investigations,
    filter_investigations_by_date,
    generate_incremental_html,
    get_incremental_file_path,
    run_blindspot_analysis,
    run_investigated_entities_analysis,
    update_monthly_report_from_daily,
)

logger = logging.getLogger(__name__)

# Global lock to prevent concurrent report generation
_report_generation_lock = threading.Lock()

# Legacy constant for backward compatibility
INCREMENTAL_FILE = get_incremental_file_path()


def generate_incremental_report(triggering_investigation_id: str) -> Optional[Path]:
    """
    Generate/update the INCREMENTAL HTML report.

    Fetches ALL completed auto-comp investigations from DB and generates report.
    This creates a SINGLE HTML file that gets overwritten each time.
    The filename includes the 24h window date being investigated.
    """
    acquired = _report_generation_lock.acquire(blocking=False)
    if not acquired:
        logger.info(f"Report generation in progress, skipping {triggering_investigation_id}")
        return None

    try:
        logger.info(f"Generating incremental report (triggered by {triggering_investigation_id})")

        investigations = fetch_completed_auto_comp_investigations()
        logger.info(f"Found {len(investigations)} completed auto-comp investigations")

        if not investigations:
            logger.info("No completed investigations to report")
            return None

        window_date = extract_window_date_from_investigations(investigations)

        if window_date:
            daily_investigations = filter_investigations_by_date(investigations, window_date)
            logger.info(f"Filtered to {len(daily_investigations)} investigations for {window_date.date()}")
        else:
            daily_investigations = investigations

        output_file = get_incremental_file_path(window_date)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        blindspot_start, blindspot_end = _get_blindspot_window(window_date)
        blindspot_data = run_blindspot_analysis(blindspot_start, blindspot_end)

        entity_ids = [
            inv.get("entity_value") or inv.get("email")
            for inv in daily_investigations
            if inv.get("entity_value") or inv.get("email")
        ]
        investigated_blindspot_data = (
            run_investigated_entities_analysis(entity_ids, blindspot_start, blindspot_end)
            if entity_ids
            else None
        )

        html = generate_incremental_html(daily_investigations, blindspot_data, investigated_blindspot_data)
        output_file.write_text(html)

        logger.info(f"Incremental report updated: {output_file}")

        if window_date:
            update_monthly_report_from_daily(window_date, investigations, blindspot_data)

        return output_file

    except Exception as e:
        logger.error(f"Failed to generate incremental report: {e}", exc_info=True)
        return None
    finally:
        _report_generation_lock.release()


def regenerate_report_for_date(target_date: datetime) -> Optional[Path]:
    """
    Regenerate the daily incremental report for a specific date.

    This fetches investigations from the database for the given date
    and regenerates the HTML report with blindspot analysis.

    Args:
        target_date: The date to regenerate the report for

    Returns:
        Path to the generated report file, or None if no investigations found
    """
    acquired = _report_generation_lock.acquire(blocking=False)
    if not acquired:
        logger.info(f"Report generation in progress, skipping regeneration for {target_date.date()}")
        return None

    try:
        logger.info(f"Regenerating report for {target_date.date()}")

        all_investigations = fetch_completed_auto_comp_investigations()
        daily_investigations = filter_investigations_by_date(all_investigations, target_date)

        logger.info(f"Found {len(daily_investigations)} investigations for {target_date.date()}")

        if not daily_investigations:
            logger.info(f"No investigations found for {target_date.date()}")
            return None

        output_file = get_incremental_file_path(target_date)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        blindspot_start, blindspot_end = _get_blindspot_window(target_date)
        blindspot_data = run_blindspot_analysis(blindspot_start, blindspot_end)

        entity_ids = [
            inv.get("entity_value") or inv.get("email")
            for inv in daily_investigations
            if inv.get("entity_value") or inv.get("email")
        ]
        investigated_blindspot_data = (
            run_investigated_entities_analysis(entity_ids, blindspot_start, blindspot_end)
            if entity_ids
            else None
        )

        html = generate_incremental_html(daily_investigations, blindspot_data, investigated_blindspot_data)
        output_file.write_text(html)

        logger.info(f"Report regenerated: {output_file}")

        update_monthly_report_from_daily(target_date, all_investigations, blindspot_data)

        return output_file

    except Exception as e:
        logger.error(f"Failed to regenerate report for {target_date.date()}: {e}", exc_info=True)
        return None
    finally:
        _report_generation_lock.release()


def _get_blindspot_window(window_date: Optional[datetime]) -> tuple:
    """Get blindspot analysis window dates."""
    if not window_date:
        return None, None
    return (
        datetime(window_date.year, window_date.month, window_date.day, 0, 0, 0),
        datetime(window_date.year, window_date.month, window_date.day, 23, 59, 59),
    )
