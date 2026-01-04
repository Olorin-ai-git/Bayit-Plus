"""
Incremental Report Generation

Generates and updates a SINGLE incremental HTML file after each investigation completes.
Fetches data directly from the database to ensure all confusion matrices are included.
Also updates monthly totals as daily reports are generated.
"""

import asyncio
import calendar
import json
import logging
import os
import re
import threading
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _run_blindspot_analysis(
    start_date: datetime = None, end_date: datetime = None
) -> Optional[Dict[str, Any]]:
    """
    Run blindspot analysis for the heatmap section.

    Args:
        start_date: Optional start date for analysis (e.g., month start)
        end_date: Optional end date for analysis (e.g., month end)

    Returns the blindspot analysis data or None if analysis fails.
    """
    try:
        from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer

        analyzer = ModelBlindspotAnalyzer()
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                analyzer.analyze_blindspots(
                    export_csv=False,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if result.get("status") == "success":
                period = result.get("analysis_period", {})
                logger.info(
                    f"✅ Blindspot analysis ({period.get('start_date')} to {period.get('end_date')}): "
                    f"{len(result.get('matrix', {}).get('cells', []))} cells, "
                    f"{len(result.get('blindspots', []))} blindspots identified"
                )
                return result
            logger.warning(f"Blindspot analysis returned non-success status: {result.get('error')}")
            return None
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"Could not run blindspot analysis: {e}")
        return None


def _run_investigated_entities_analysis(
    entity_ids: List[str],
    start_date: datetime = None,
    end_date: datetime = None,
) -> Optional[Dict[str, Any]]:
    """
    Run blindspot analysis filtered to specific investigated entity IDs.

    Args:
        entity_ids: List of entity IDs (emails) to filter by
        start_date: Optional start date for analysis
        end_date: Optional end date for analysis

    Returns the analysis data for investigated entities or None if fails.
    """
    if not entity_ids:
        return None

    try:
        from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer

        analyzer = ModelBlindspotAnalyzer()
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                analyzer.analyze_investigated_entities(
                    entity_ids=entity_ids,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if result.get("status") == "success":
                logger.info(
                    f"✅ Investigated entities analysis: {len(entity_ids)} entities, "
                    f"{result.get('summary', {}).get('total_transactions', 0)} transactions"
                )
                return result
            logger.warning(f"Investigated entities analysis failed: {result.get('error')}")
            return None
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"Could not run investigated entities analysis: {e}")
        return None

# Global lock to prevent concurrent report generation
_report_generation_lock = threading.Lock()

ARTIFACTS_DIR = Path("artifacts")


def _get_incremental_file_path(window_date: Optional[datetime] = None) -> Path:
    """
    Get the incremental report file path with the 24h window date in the filename.

    Format: startup_analysis_DAILY_YYYY-MM-DD.html

    Args:
        window_date: The 24h window date being analyzed. If provided, uses this date.
                     Otherwise falls back to SELECTOR_REFERENCE_DATE env var, then current date.
    """
    if window_date:
        date_suffix = window_date.strftime("%Y-%m-%d")
    else:
        ref_date_str = os.getenv("SELECTOR_REFERENCE_DATE")
        if ref_date_str:
            try:
                # Parse the reference date (format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD)
                if "T" in ref_date_str:
                    ref_date = datetime.fromisoformat(ref_date_str)
                else:
                    ref_date = datetime.strptime(ref_date_str, "%Y-%m-%d")
                date_suffix = ref_date.strftime("%Y-%m-%d")
            except ValueError:
                date_suffix = datetime.now().strftime("%Y-%m-%d")
        else:
            # Default: use current date
            date_suffix = datetime.now().strftime("%Y-%m-%d")

    return ARTIFACTS_DIR / f"startup_analysis_DAILY_{date_suffix}.html"


# Legacy constant for backward compatibility
INCREMENTAL_FILE = _get_incremental_file_path()


def _extract_window_date_from_investigations(
    investigations: List[Dict[str, Any]]
) -> Optional[datetime]:
    """
    Extract the 24h window date from selector_metadata in investigations.

    The selector_metadata contains start_time and end_time of the 24h window.
    We use the end_time (or start_time) to determine the date for the filename.
    """
    if not investigations:
        return None

    # Get selector_metadata from first investigation (all share same window)
    selector_metadata = investigations[0].get("selector_metadata")
    if not selector_metadata:
        return None

    # Try to get end_time first, then start_time
    time_str = selector_metadata.get("end_time") or selector_metadata.get("start_time")
    if not time_str:
        return None

    # Parse the time string (can be datetime object or ISO string)
    if isinstance(time_str, datetime):
        return time_str

    try:
        # Handle ISO format with or without Z suffix
        if isinstance(time_str, str):
            time_str = time_str.replace("Z", "+00:00")
            return datetime.fromisoformat(time_str)
    except (ValueError, TypeError):
        logger.debug(f"Could not parse window date from: {time_str}")

    return None


def _filter_investigations_by_date(
    investigations: List[Dict[str, Any]], target_date: datetime
) -> List[Dict[str, Any]]:
    """
    Filter investigations to only include those matching the target date.

    Compares the investigation's selector_metadata window date with target_date.
    """
    filtered = []
    target_day = target_date.date()

    for inv in investigations:
        inv_date = _extract_window_date_from_investigations([inv])
        if inv_date and inv_date.date() == target_day:
            filtered.append(inv)

    return filtered


def generate_incremental_report(triggering_investigation_id: str) -> Optional[Path]:
    """
    Generate/update the INCREMENTAL HTML report.

    Fetches ALL completed auto-comp investigations from DB and generates report.
    This creates a SINGLE HTML file that gets overwritten each time.
    The filename includes the 24h window date being investigated.
    """
    acquired = _report_generation_lock.acquire(blocking=False)
    if not acquired:
        logger.info(f"⏭️ Report generation in progress, skipping {triggering_investigation_id}")
        return None

    try:
        logger.info(f"🔄 Generating incremental report (triggered by {triggering_investigation_id})")

        # Fetch completed investigations from database
        investigations = _fetch_completed_auto_comp_investigations()

        logger.info(f"   Found {len(investigations)} completed auto-comp investigations")

        if not investigations:
            logger.info("   No completed investigations to report")
            return None

        # Extract 24h window date from selector_metadata for filename
        window_date = _extract_window_date_from_investigations(investigations)

        # Filter investigations to only include those for the specific window_date
        if window_date:
            daily_investigations = _filter_investigations_by_date(investigations, window_date)
            logger.info(f"   Filtered to {len(daily_investigations)} investigations for {window_date.date()}")
        else:
            daily_investigations = investigations

        # Get the output file path with the 24h window date
        output_file = _get_incremental_file_path(window_date)

        # Ensure directory exists
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Run blindspot analysis - scoped to the specific day (24h window)
        blindspot_start = None
        blindspot_end = None
        if window_date:
            blindspot_start = datetime(window_date.year, window_date.month, window_date.day, 0, 0, 0)
            blindspot_end = datetime(window_date.year, window_date.month, window_date.day, 23, 59, 59)

        blindspot_data = _run_blindspot_analysis(blindspot_start, blindspot_end)

        # Extract entity IDs and run investigated entities analysis
        entity_ids = [
            inv.get("entity_value") or inv.get("email")
            for inv in daily_investigations
            if inv.get("entity_value") or inv.get("email")
        ]
        investigated_blindspot_data = None
        if entity_ids:
            investigated_blindspot_data = _run_investigated_entities_analysis(
                entity_ids, blindspot_start, blindspot_end
            )

        # Generate HTML with daily investigations only
        html = _generate_incremental_html(
            daily_investigations, blindspot_data, investigated_blindspot_data
        )
        output_file.write_text(html)

        logger.info(f"✅ Incremental report updated: {output_file}")

        # Update the monthly report with this day's data
        if window_date:
            _update_monthly_report_from_daily(window_date, investigations, blindspot_data)

        return output_file

    except Exception as e:
        logger.error(f"❌ Failed to generate incremental report: {e}", exc_info=True)
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
        Path to the generated HTML report, or None if failed
    """
    try:
        logger.info(f"🔄 Regenerating report for {target_date.date()}")

        # Fetch all completed investigations
        investigations = _fetch_completed_auto_comp_investigations()
        logger.info(f"   Found {len(investigations)} total completed investigations")

        # Filter to only investigations for the target date
        daily_investigations = _filter_investigations_by_date(investigations, target_date)
        logger.info(f"   Filtered to {len(daily_investigations)} for {target_date.date()}")

        if not daily_investigations:
            logger.warning(f"   No investigations found for {target_date.date()}")
            return None

        # Get output file path
        output_file = _get_incremental_file_path(target_date)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Run blindspot analysis scoped to the specific day
        blindspot_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        blindspot_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59)
        blindspot_data = _run_blindspot_analysis(blindspot_start, blindspot_end)

        # Extract entity IDs and run investigated entities analysis
        entity_ids = [
            inv.get("entity_value") or inv.get("email")
            for inv in daily_investigations
            if inv.get("entity_value") or inv.get("email")
        ]
        investigated_blindspot_data = None
        if entity_ids:
            investigated_blindspot_data = _run_investigated_entities_analysis(
                entity_ids, blindspot_start, blindspot_end
            )

        # Generate HTML
        html = _generate_incremental_html(
            daily_investigations, blindspot_data, investigated_blindspot_data
        )
        output_file.write_text(html)

        logger.info(f"✅ Report regenerated: {output_file}")
        return output_file

    except Exception as e:
        logger.error(f"❌ Failed to regenerate report for {target_date.date()}: {e}", exc_info=True)
        return None


def _update_monthly_report_from_daily(
    window_date: datetime,
    investigations: List[Dict[str, Any]],
    blindspot_data: Optional[Dict[str, Any]] = None,
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
        from collections import defaultdict

        year = window_date.year
        month = window_date.month

        # Fetch ALL completed investigations to build the full monthly picture
        all_investigations = _fetch_completed_auto_comp_investigations()

        # Group investigations by their window date (day of month)
        by_day: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
        for inv in all_investigations:
            inv_date = _extract_window_date_from_investigations([inv])
            if inv_date and inv_date.year == year and inv_date.month == month:
                by_day[inv_date.day].append(inv)

        if not by_day:
            logger.info(f"No investigations found for {year}-{month:02d}")
            return

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
            day_overall_tp = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_TP", 0)) for inv in day_invs)
            day_overall_fp = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_FP", 0)) for inv in day_invs)
            day_overall_tn = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_TN", 0)) for inv in day_invs)
            day_overall_fn = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_FN", 0)) for inv in day_invs)

            day_saved = Decimal(str(sum(
                _safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0))
                for inv in day_invs
            )))
            day_lost = Decimal(str(sum(
                _safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0))
                for inv in day_invs
            )))
            day_net = day_saved - day_lost

            # Entities discovered = number of completed investigations that day
            entities_discovered = len(day_invs)
            # Entities expected = same as discovered (total_entities_expected in metadata
            # refers to each batch's count, not cumulative across multiple runs)
            entities_expected = entities_discovered

            # Collect entity values for investigated entities analysis
            day_entity_values = [
                inv.get("entity_value") or inv.get("email")
                for inv in day_invs
                if inv.get("entity_value") or inv.get("email")
            ]

            day_date = datetime(year, month, day_num)
            daily_results.append(DailyAnalysisResult(
                date=day_date,
                day_of_month=day_num,
                entities_expected=entities_expected,
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
                net_value=day_net,
                investigation_ids=[inv.get("investigation_id", "") for inv in day_invs],
                entity_values=day_entity_values,
                started_at=datetime.now(),
                completed_at=datetime.now(),
                duration_seconds=0.0,
            ))

        # Build monthly result with ALL days
        days_in_month = calendar.monthrange(year, month)[1]
        month_name = calendar.month_name[month]

        monthly_result = MonthlyAnalysisResult(
            year=year,
            month=month,
            month_name=month_name,
            total_days=days_in_month,
            daily_results=daily_results,
            started_at=datetime.now(),
            completed_at=None,
        )
        monthly_result.aggregate_from_daily()

        # Collect all entity values for investigated entities analysis
        all_entity_values = []
        for day_result in daily_results:
            all_entity_values.extend(day_result.entity_values)

        # Run investigated entities analysis for monthly report toggle
        month_start = datetime(year, month, 1, 0, 0, 0)
        month_end = datetime(year, month, days_in_month, 23, 59, 59)
        investigated_blindspot_data = None
        if all_entity_values:
            investigated_blindspot_data = _run_investigated_entities_analysis(
                all_entity_values, month_start, month_end
            )

        # Generate the monthly report (async call in sync context)
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(generate_monthly_report(
                monthly_result, blindspot_data, investigated_blindspot_data
            ))
            days_with_data = len(daily_results)
            total_invs = sum(len(by_day[d]) for d in by_day)
            logger.info(
                f"📊 Monthly report updated for {month_name} {year} "
                f"({days_with_data} days, {total_invs} investigations)"
            )
        finally:
            loop.close()

    except Exception as e:
        logger.warning(f"⚠️ Could not update monthly report: {e}")


def _fetch_completed_auto_comp_investigations() -> List[Dict[str, Any]]:
    """Fetch all completed auto-comp investigations from database with their confusion matrices."""
    from app.models.investigation_state import InvestigationState
    from app.persistence.database import get_db
    
    investigations = []
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        completed_invs = db.query(InvestigationState).filter(
            InvestigationState.investigation_id.like("auto-comp-%"),
            InvestigationState.status == "COMPLETED"
        ).order_by(InvestigationState.updated_at.desc()).all()
        
        for inv in completed_invs:
            result = {
                "investigation_id": inv.investigation_id,
                "entity_type": "email",
                "status": inv.status,
            }
            
            # Parse settings for entity and merchant
            if inv.settings_json:
                try:
                    settings = json.loads(inv.settings_json)
                    entities = settings.get("entities", [])
                    if entities:
                        result["entity_value"] = entities[0].get("entity_value")
                        result["email"] = entities[0].get("entity_value")
                    
                    # Extract merchant from name
                    # Support multiple formats:
                    # - "Compound investigation (3 entities) - Merchant: ZeusX"
                    # - "Investigation (Merchant: ZeusX)"
                    name = settings.get("name", "")
                    match = re.search(r"(?:- Merchant: |\(Merchant: )([^)]+)", name)
                    result["merchant_name"] = match.group(1).strip() if match else "Unknown"
                    
                    # Extract selector_metadata from settings.metadata
                    # Support both new (selector_metadata) and old (analyzer_metadata) keys
                    metadata = settings.get("metadata", {})
                    selector_data = metadata.get("selector_metadata") or metadata.get(
                        "analyzer_metadata"
                    )
                    if selector_data:
                        result["selector_metadata"] = selector_data
                except json.JSONDecodeError:
                    pass
            
            # Parse progress for confusion matrix and revenue data
            if inv.progress_json:
                try:
                    progress = json.loads(inv.progress_json)
                    
                    # Get confusion matrix
                    cm = progress.get("confusion_matrix", {})
                    if cm:
                        result["confusion_matrix"] = cm
                    
                    # Get revenue implications (including breakdowns with sample transactions)
                    revenue = progress.get("revenue_implications", {})
                    if revenue:
                        result["revenue_data"] = revenue
                except json.JSONDecodeError:
                    pass
            
            # Also check settings_json for revenue_data (stored by auto_comparison)
            if inv.settings_json and "revenue_data" not in result:
                try:
                    settings = json.loads(inv.settings_json)
                    revenue = settings.get("revenue_data", {})
                    if revenue:
                        result["revenue_data"] = revenue
                except json.JSONDecodeError:
                    pass
            
            # Try to load confusion matrix from file if not in progress_json
            if "confusion_matrix" not in result:
                cm_data = _load_confusion_matrix_from_file(inv.investigation_id)
                if cm_data:
                    result["confusion_matrix"] = cm_data.get("confusion_matrix", {})
                    if not result.get("revenue_data"):
                        result["revenue_data"] = cm_data.get("revenue_implications", {})
            
            # Calculate total_transactions from confusion matrix
            if "confusion_matrix" in result:
                cm = result["confusion_matrix"]
                result["total_transactions"] = (
                    cm.get("TP", 0) + cm.get("FP", 0) + 
                    cm.get("TN", 0) + cm.get("FN", 0)
                )
            else:
                result["total_transactions"] = 0
            
            investigations.append(result)
    
    finally:
        db.close()
    
    return investigations


def _load_confusion_matrix_from_file(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Try to load confusion matrix data from the generated HTML file."""
    # Check auto_startup folder
    cm_path = Path(f"artifacts/comparisons/auto_startup/confusion_matrix_{investigation_id}.html")
    if cm_path.exists():
        try:
            html_content = cm_path.read_text()
            result = {"confusion_matrix": {}, "revenue_implications": {}}

            # Find the Overall Classification section and extract metrics from it
            # This section contains ALL transactions including entities below threshold
            overall_section = re.search(
                r'Overall Classification \(All Transactions\)</h3>.*?</table>',
                html_content, re.DOTALL
            )
            if overall_section:
                section = overall_section.group(0)
                # Extract metrics from the Overall Classification table
                overall_tp = re.search(r'True Positives \(TP\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                overall_fp = re.search(r'False Positives \(FP\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                overall_tn = re.search(r'True Negatives \(TN\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                overall_fn = re.search(r'False Negatives \(FN\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)

                if overall_tp:
                    result["confusion_matrix"]["overall_TP"] = int(overall_tp.group(1))
                if overall_fp:
                    result["confusion_matrix"]["overall_FP"] = int(overall_fp.group(1))
                if overall_tn:
                    result["confusion_matrix"]["overall_TN"] = int(overall_tn.group(1))
                if overall_fn:
                    result["confusion_matrix"]["overall_FN"] = int(overall_fn.group(1))

            # Find Review Precision section - the first table with TP/FP/TN/FN
            # Match from start to first Overall Classification section
            review_section = re.search(
                r'Review Precision.*?</table>',
                html_content, re.DOTALL
            )
            if review_section:
                section = review_section.group(0)
                tp_match = re.search(r'True Positives \(TP\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                fp_match = re.search(r'False Positives \(FP\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                tn_match = re.search(r'True Negatives \(TN\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
                fn_match = re.search(r'False Negatives \(FN\).*?<td[^>]*>(\d+)</td>', section, re.DOTALL)
            else:
                # Fallback: match first occurrence (Review Precision, before Overall Classification)
                tp_match = re.search(r'True Positives \(TP\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
                fp_match = re.search(r'False Positives \(FP\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
                tn_match = re.search(r'True Negatives \(TN\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)
                fn_match = re.search(r'False Negatives \(FN\)</strong>.*?<td[^>]*>(\d+)</td>', html_content, re.DOTALL)

            if tp_match:
                result["confusion_matrix"]["TP"] = int(tp_match.group(1))
            if fp_match:
                result["confusion_matrix"]["FP"] = int(fp_match.group(1))
            if tn_match:
                result["confusion_matrix"]["TN"] = int(tn_match.group(1))
            if fn_match:
                result["confusion_matrix"]["FN"] = int(fn_match.group(1))
            
            # Extract revenue metrics - look for h4 label followed by div with value
            # Pattern: <h4...>Saved Fraud GMV</h4>\s*<div...>$VALUE</div>
            saved_match = re.search(
                r'<h4[^>]*>Saved Fraud GMV</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            lost_match = re.search(
                r'<h4[^>]*>Lost Revenues</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            net_match = re.search(
                r'<h4[^>]*>[^<]*Net Value</h4>\s*<div[^>]*>\$([0-9,]+\.?\d*)',
                html_content
            )
            
            if saved_match:
                result["revenue_implications"]["saved_fraud_gmv"] = float(saved_match.group(1).replace(',', ''))
            if lost_match:
                result["revenue_implications"]["lost_revenues"] = float(lost_match.group(1).replace(',', ''))
            if net_match:
                result["revenue_implications"]["net_value"] = float(net_match.group(1).replace(',', ''))
            
            if result["confusion_matrix"]:
                return result
        except Exception as e:
            logger.debug(f"Could not parse confusion matrix from {cm_path}: {e}")
    
    return None


def _generate_selector_section_html(
    selector_metadata: Optional[Dict[str, Any]],
    total_investigations: int = 0,
    all_investigations: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Generate the selector section HTML for incremental report."""
    if not selector_metadata:
        return ""

    start_time = selector_metadata.get("start_time")
    end_time = selector_metadata.get("end_time")
    # Build entities list from all investigations if provided
    if all_investigations:
        entities = []
        for inv in all_investigations:
            entities.append({
                "email": inv.get("entity_value", inv.get("email", "Unknown")),
                "merchant": inv.get("merchant_name", "Unknown"),
                "fraud_count": inv.get("confusion_matrix", {}).get("overall_FN", 0),
                "total_count": inv.get("confusion_matrix", {}).get("overall_TP", 0) +
                               inv.get("confusion_matrix", {}).get("overall_FP", 0) +
                               inv.get("confusion_matrix", {}).get("overall_TN", 0) +
                               inv.get("confusion_matrix", {}).get("overall_FN", 0),
            })
    else:
        entities = selector_metadata.get("entities", [])
    # Use total_investigations if provided, otherwise fallback to entities count
    entity_count = total_investigations if total_investigations > 0 else len(entities)
    
    # Format datetimes - handle both datetime objects and ISO strings
    if isinstance(start_time, datetime):
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S UTC")
    elif isinstance(start_time, str):
        try:
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            start_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
        except:
            start_str = str(start_time)
    else:
        start_str = "Unknown"
    
    if isinstance(end_time, datetime):
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S UTC")
    elif isinstance(end_time, str):
        try:
            dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            end_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
        except:
            end_str = str(end_time)
    else:
        end_str = "Unknown"
    
    # Generate entity rows (show top 20)
    entity_rows = ""
    for entity in entities[:20]:
        email = entity.get("email", "Unknown")
        merchant = entity.get("merchant", "Unknown")
        fraud_count = entity.get("fraud_count", 0)
        total_count = entity.get("total_count", 0)
        
        entity_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid var(--border);">{email}</td>
            <td style="padding: 8px; border-bottom: 1px solid var(--border);">{merchant}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid var(--border);"><strong style="color: var(--danger);">{fraud_count}</strong></td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid var(--border);">{total_count}</td>
        </tr>
        """
    
    if entity_count > 20:
        entity_rows += f"""
        <tr>
            <td colspan="4" style="padding: 12px; text-align: center; color: var(--muted); font-style: italic; border-bottom: 1px solid var(--border);">
                ... and {entity_count - 20} more entities
            </td>
        </tr>
        """
    
    total_fraud_tx = sum(e.get("fraud_count", 0) for e in entities)
    
    return f"""
    <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div onclick="toggleSelector()" style="cursor: pointer; padding: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); border-radius: 8px; margin-bottom: 20px; transition: all 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: var(--accent); margin: 0; font-size: 1.5em;">🔍 Selector Discovery Window</h2>
                <span id="selector-toggle" style="font-size: 1.5em; color: var(--accent);">▼</span>
            </div>
            <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">📅 Time Window</div>
                    <div style="font-size: 0.9em; font-weight: 600; color: var(--text); margin-top: 4px;">
                        {start_str.split(' ')[0]} → {end_str.split(' ')[0]}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">🎯 Entities Analyzed</div>
                    <div style="font-size: 1.2em; font-weight: bold; color: var(--accent); margin-top: 4px;">
                        {entity_count}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">📊 Fraud Transactions</div>
                    <div style="font-size: 1.2em; font-weight: bold; color: var(--danger); margin-top: 4px;">
                        {total_fraud_tx}
                    </div>
                </div>
            </div>
        </div>
        
        <div id="selector-content" style="display: block;">
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--accent); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px 20px; align-items: center;">
                    <div style="color: var(--muted); font-weight: 600;">📅 Time Window:</div>
                    <div style="font-family: 'Monaco', 'Courier New', monospace; color: var(--text);">
                        <strong>{start_str}</strong> → <strong>{end_str}</strong>
                        <span style="color: var(--muted); margin-left: 12px;">(24-hour window)</span>
                    </div>
                    
                    <div style="color: var(--muted); font-weight: 600;">🎯 Entities Analyzed:</div>
                    <div style="font-size: 1.2em; color: var(--accent); font-weight: bold;">{entity_count} high-risk entities analyzed</div>
                    
                    <div style="color: var(--muted); font-weight: 600;">📊 Total Fraud Transactions:</div>
                    <div style="font-size: 1.2em; color: var(--danger); font-weight: bold;">{total_fraud_tx} confirmed fraud transactions</div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;">
                <div onclick="toggleEntitiesList()"
                     style="padding: 12px 16px; cursor: pointer; display: flex;
                            justify-content: space-between; align-items: center;
                            background: rgba(59, 130, 246, 0.1);">
                    <h3 style="color: var(--accent); margin: 0; font-size: 1.1em;">
                        🚨 Entities Flagged for Investigation ({entity_count})
                    </h3>
                    <span id="entities-toggle-icon" style="color: var(--accent);">▶</span>
                </div>
                <div id="entities-list-content" style="display: none; padding: 16px;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                            <thead>
                                <tr style="background: rgba(59, 130, 246, 0.2);">
                                    <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid var(--border); font-weight: 600;">Email</th>
                                    <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid var(--border); font-weight: 600;">Merchant</th>
                                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid var(--border); font-weight: 600;">Fraud TX</th>
                                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid var(--border); font-weight: 600;">Total TX</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entity_rows}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 16px; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                        <div style="color: var(--muted); font-size: 0.9em;">
                            <strong>ℹ️ Note:</strong> This selector window identifies the top 30% riskiest entities based on risk-weighted transaction volume (Risk Score × Amount × Velocity).
                            Each entity is then investigated using a broader time window (6-12 months historical data) to build comprehensive risk profiles and confusion matrices.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        function toggleEntitiesList() {{
            const content = document.getElementById('entities-list-content');
            const icon = document.getElementById('entities-toggle-icon');
            if (content.style.display === 'none') {{
                content.style.display = 'block';
                icon.textContent = '▼';
            }} else {{
                content.style.display = 'none';
                icon.textContent = '▶';
            }}
        }}
    </script>
    """


def _generate_incremental_html(
    investigations: List[Dict[str, Any]],
    blindspot_data: Optional[Dict[str, Any]] = None,
    investigated_blindspot_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate the incremental HTML report with full financial analysis."""
    from app.service.reporting.components.blindspot_heatmap import generate_blindspot_section

    # Extract selector metadata from first investigation (all share the same metadata)
    selector_metadata = None
    if investigations and len(investigations) > 0:
        selector_metadata = investigations[0].get("selector_metadata")
    
    # Group by merchant
    by_merchant: Dict[str, List[Dict[str, Any]]] = {}
    for inv in investigations:
        merchant = inv.get("merchant_name", "Unknown Merchant")
        if merchant not in by_merchant:
            by_merchant[merchant] = []
        by_merchant[merchant].append(inv)
    
    # Calculate global totals
    total_saved = sum(_safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in investigations)
    total_lost = sum(_safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in investigations)
    total_net = total_saved - total_lost
    # Review Precision (flagged only)
    total_tp = sum(_safe_int(inv.get("confusion_matrix", {}).get("TP", 0)) for inv in investigations)
    total_fp = sum(_safe_int(inv.get("confusion_matrix", {}).get("FP", 0)) for inv in investigations)
    total_tn = sum(_safe_int(inv.get("confusion_matrix", {}).get("TN", 0)) for inv in investigations)
    total_fn = sum(_safe_int(inv.get("confusion_matrix", {}).get("FN", 0)) for inv in investigations)
    # Overall Classification (all transactions)
    overall_tp = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_TP", 0)) for inv in investigations)
    overall_fp = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_FP", 0)) for inv in investigations)
    overall_tn = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_TN", 0)) for inv in investigations)
    overall_fn = sum(_safe_int(inv.get("confusion_matrix", {}).get("overall_FN", 0)) for inv in investigations)

    # Build investigation summary for blindspot section toggle
    inv_total_tx = overall_tp + overall_fp + overall_tn + overall_fn
    inv_precision = overall_tp / (overall_tp + overall_fp) if (overall_tp + overall_fp) > 0 else 0
    inv_recall = overall_tp / (overall_tp + overall_fn) if (overall_tp + overall_fn) > 0 else 0
    inv_fraud_gmv = sum(_safe_float(inv.get("revenue_data", {}).get("fraud_gmv", 0)) for inv in investigations)
    inv_fp_gmv = sum(_safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in investigations)

    investigation_summary = {
        "total_transactions": inv_total_tx,
        "overall_precision": inv_precision,
        "overall_recall": inv_recall,
        "total_fraud_gmv": inv_fraud_gmv,
        "total_fp_gmv": inv_fp_gmv,
        "entity_count": len(investigations),
    }

    # Generate selector section HTML with total investigation count and all investigations
    selector_section_html = _generate_selector_section_html(
        selector_metadata,
        total_investigations=len(investigations),
        all_investigations=investigations
    )

    # Determine status - for daily reports (filtered by date), always mark as complete
    # since we're showing a historical snapshot of that day's investigations
    # For real-time reports, check against expected count from metadata
    is_daily_report = selector_metadata and selector_metadata.get("start_time")

    if is_daily_report:
        # Daily reports are historical snapshots - always complete
        is_complete = len(investigations) > 0
    else:
        # Real-time report - check expected count
        expected_count = 0
        if selector_metadata:
            expected_count = selector_metadata.get("total_entities_expected", 0)
        is_complete = len(investigations) > 0 and (
            expected_count == 0 or len(investigations) >= expected_count
        )
    status_class = "complete" if is_complete else "in-progress"
    status_icon = "✅" if is_complete else "⏳"
    status_text = "COMPLETED" if is_complete else "IN PROGRESS"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fraud Detection - Incremental Report</title>
    <style>
        :root {{
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --ok: #22c55e;
            --warn: #f59e0b;
            --danger: #ef4444;
            --accent: #3b82f6;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }}
        h1 {{ color: var(--accent); font-size: 2rem; }}
        .subtitle {{ color: var(--muted); margin-top: 10px; }}
        .status-badge {{
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }}
        .status-badge.in-progress {{
            background: var(--warn);
            color: #000;
        }}
        .status-badge.complete {{
            background: var(--ok);
            color: #000;
        }}
        .global-metrics {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .metric-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }}
        .metric-value {{
            font-size: 2rem;
            font-weight: bold;
        }}
        .metric-value.positive {{ color: var(--ok); }}
        .metric-value.negative {{ color: var(--danger); }}
        .metric-label {{ color: var(--muted); margin-top: 5px; }}
        .confusion-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }}
        .cm-cell {{
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }}
        .cm-tp {{ background: rgba(34, 197, 94, 0.2); color: var(--ok); }}
        .cm-fp {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        .cm-tn {{ background: rgba(59, 130, 246, 0.2); color: var(--accent); }}
        .cm-fn {{ background: rgba(245, 158, 11, 0.2); color: var(--warn); }}
        .merchant-section {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }}
        .merchant-header {{
            background: linear-gradient(135deg, var(--accent), #6366f1);
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .merchant-header h3 {{ color: white; }}
        .merchant-content {{ padding: 20px; display: none; }}
        .merchant-content.open {{ display: block; }}
        .entity-card {{
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }}
        .entity-header {{
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(59, 130, 246, 0.1);
        }}
        .entity-details {{ padding: 15px; display: none; }}
        .entity-details.open {{ display: block; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }}
        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        th {{ color: var(--muted); font-weight: normal; }}
        .toggle {{ font-size: 1.2rem; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Fraud Detection - Daily Report</h1>
        <p class="subtitle">Investigation results summary</p>
        <div class="status-badge {status_class}">{status_icon} {status_text} - {len(investigations)} investigations</div>
        <p class="subtitle" style="margin-top: 10px;">Last updated: {timestamp}</p>
    </div>

    {selector_section_html}

    <h2 style="margin-bottom: 10px;">💰 Financial Impact Summary</h2>
    <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 15px;">
        Based on <strong>{len(investigations)} investigated entities</strong> selected by Olorin's risk selector.
    </p>
    <div class="global-metrics">
        <div class="metric-card">
            <div class="metric-value positive">${total_saved:,.2f}</div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${total_lost:,.2f}</div>
            <div class="metric-label">Lost Revenues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {'positive' if total_net >= 0 else 'negative'}">${total_net:,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{len(investigations)}</div>
            <div class="metric-label">Investigations</div>
        </div>
    </div>

    <h2 style="margin-bottom: 20px;">📊 Overall Classification (All Transactions)</h2>
    <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
        Classification across ALL transactions, including entities below threshold.
    </p>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {overall_tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {overall_fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {overall_fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {overall_tn}<br><small>Legit Confirmed</small></div>
    </div>

    <h2 style="margin: 20px 0;">📊 Review Precision (Flagged Entities Only)</h2>
    <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
        Classification for entities flagged as potentially fraudulent (above threshold).
    </p>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {total_tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {total_fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {total_fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {total_tn}<br><small>Legit Confirmed</small></div>
    </div>

    <h2 style="margin: 30px 0 20px;">🏢 Results by Merchant</h2>
"""
    
    # Add merchant sections
    for merchant, entities in by_merchant.items():
        merchant_saved = sum(_safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in entities)
        merchant_net = merchant_saved - sum(_safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in entities)
        safe_merchant_id = merchant.replace(" ", "_").replace("@", "_").replace(".", "_")
        
        html += f"""
    <div class="merchant-section">
        <div class="merchant-header" onclick="toggleMerchant('{safe_merchant_id}')">
            <h3>{merchant} ({len(entities)} entities)</h3>
            <span>Net: ${merchant_net:,.2f} <span class="toggle">▼</span></span>
        </div>
        <div class="merchant-content" id="merchant-{safe_merchant_id}">
"""
        
        for inv in entities:
            entity_id = inv.get("email") or inv.get("entity_value") or "Unknown"
            inv_id = inv.get("investigation_id", "unknown")
            safe_entity_id = f"{safe_merchant_id}_{entity_id.replace('@', '_').replace('.', '_')}"
            
            cm = inv.get("confusion_matrix", {})
            rev = inv.get("revenue_data", {})
            tp = _safe_int(cm.get("TP", 0))
            fp = _safe_int(cm.get("FP", 0))
            tn = _safe_int(cm.get("TN", 0))
            fn = _safe_int(cm.get("FN", 0))
            saved = _safe_float(rev.get("saved_fraud_gmv", 0))
            lost = _safe_float(rev.get("lost_revenues", 0))
            net = saved - lost
            
            # Get transaction details
            tx_link = _get_transaction_details_link(inv_id)
            tx_section = _generate_transaction_section(inv, tx_link, tp + fp + tn + fn)
            
            html += f"""
            <div class="entity-card">
                <div class="entity-header" onclick="toggleEntity('{safe_entity_id}')">
                    <span><strong>{entity_id}</strong></span>
                    <span>Net: ${net:,.2f} <span class="toggle">▶</span></span>
                </div>
                <div class="entity-details" id="entity-{safe_entity_id}">
                    <p style="color: var(--muted); margin-bottom: 10px;">Investigation: {inv_id}</p>
                    
                    <h4 style="margin: 15px 0 10px;">Confusion Matrix</h4>
                    <div class="confusion-grid" style="max-width: 300px;">
                        <div class="cm-cell cm-tp">TP: {tp}</div>
                        <div class="cm-cell cm-fp">FP: {fp}</div>
                        <div class="cm-cell cm-fn">FN: {fn}</div>
                        <div class="cm-cell cm-tn">TN: {tn}</div>
                    </div>
                    
                    <h4 style="margin: 15px 0 10px;">Financial Impact</h4>
                    <table>
                        <tr><th>Saved Fraud GMV</th><td style="color: var(--ok);">${saved:,.2f}</td></tr>
                        <tr><th>Lost Revenues</th><td style="color: var(--danger);">${lost:,.2f}</td></tr>
                        <tr><th>Net Value</th><td style="color: {'var(--ok)' if net >= 0 else 'var(--danger)'}; font-weight: bold;">${net:,.2f}</td></tr>
                    </table>
                    
                    <h4 style="margin: 15px 0 10px;">Financial Reasoning</h4>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; font-size: 0.9rem;">
                        <p><strong>Saved Fraud GMV:</strong> Sum of transaction amounts for True Positives (TP={tp})</p>
                        <p><strong>Lost Revenues:</strong> Sum of transaction amounts for False Positives (FP={fp}) × merchant commission rate</p>
                        <p><strong>Net Value:</strong> Saved Fraud GMV - Lost Revenues = ${net:,.2f}</p>
                    </div>
                    {tx_section}
                </div>
            </div>
"""
        
        html += """
        </div>
    </div>
"""

    # Add blindspot heatmap section
    blindspot_html = generate_blindspot_section(
        blindspot_data,
        include_placeholder=True,
        investigation_summary=investigation_summary,
        investigated_blindspot_data=investigated_blindspot_data,
    )
    if blindspot_html:
        html += f"""
    <section id="blindspot-analysis" style="margin-top: 40px;">
        {blindspot_html}
    </section>
"""

    html += """
    <script>
        function toggleSelector() {
            const content = document.getElementById('selector-content');
            const icon = document.getElementById('selector-toggle');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        }
        
        function toggleMerchant(id) {
            const content = document.getElementById('merchant-' + id);
            content.classList.toggle('open');
        }
        
        function toggleEntity(id) {
            const content = document.getElementById('entity-' + id);
            content.classList.toggle('open');
        }
        
        // Auto-expand first merchant
        document.querySelector('.merchant-content')?.classList.add('open');
    </script>
</body>
</html>
"""
    return html


def _generate_transaction_section(inv: Dict[str, Any], tx_link: Optional[str], total_tx: int) -> str:
    """Generate the transaction-level drill-down section."""
    cm = inv.get("confusion_matrix", {})
    rev = inv.get("revenue_data", {})
    
    tp = _safe_int(cm.get("TP", 0))
    fp = _safe_int(cm.get("FP", 0))
    tn = _safe_int(cm.get("TN", 0))
    fn = _safe_int(cm.get("FN", 0))
    
    html = """
                    <h4 style="margin: 15px 0 10px;">📋 Transaction Breakdown</h4>
"""
    
    # Show transaction classification summary
    html += f"""
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                        <div style="background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--ok);">{tp}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Fraud Caught (TP)</div>
                            <div style="font-size: 0.75rem; color: var(--ok);">IS_FRAUD=1 & Predicted=Fraud</div>
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger);">{fp}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">False Alarms (FP)</div>
                            <div style="font-size: 0.75rem; color: var(--danger);">IS_FRAUD=0 & Predicted=Fraud</div>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--warn);">{fn}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Fraud Missed (FN)</div>
                            <div style="font-size: 0.75rem; color: var(--warn);">IS_FRAUD=1 & Predicted=Legit</div>
                        </div>
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">{tn}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Legit Confirmed (TN)</div>
                            <div style="font-size: 0.75rem; color: var(--accent);">IS_FRAUD=0 & Predicted=Legit</div>
                        </div>
                    </div>
"""
    
    # Add link to full confusion matrix with transaction details
    if tx_link:
        html += f"""
                    <a href="{tx_link}" target="_blank" style="display: inline-block; background: var(--accent); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                        📊 View Full Transaction Analysis →
                    </a>
                    <p style="color: var(--muted); font-size: 0.8rem; margin-top: 8px;">
                        Opens detailed report with {total_tx} individual transactions, risk scores, and financial calculations
                    </p>
"""
    
    return html


def _get_transaction_details_link(investigation_id: str) -> Optional[str]:
    """Get link to the transaction-level confusion matrix HTML file."""
    auto_startup_dir = Path("artifacts/comparisons/auto_startup")

    # Check for confusion_table files (new naming pattern with timestamp)
    # These may be in the root auto_startup folder or in merchant subdirectories
    if auto_startup_dir.exists():
        # First check direct files in auto_startup folder
        for pattern in [
            f"confusion_table_{investigation_id}_*.html",
            f"confusion_matrix_{investigation_id}.html",
        ]:
            matches = list(auto_startup_dir.glob(pattern))
            if matches:
                # Return the most recent file if multiple matches
                return str(sorted(matches, key=lambda p: p.stat().st_mtime, reverse=True)[0].absolute())

        # Check in merchant subdirectories
        for merchant_dir in auto_startup_dir.iterdir():
            if merchant_dir.is_dir():
                for pattern in [
                    f"confusion_table_{investigation_id}_*.html",
                    f"confusion_matrix_{investigation_id}.html",
                ]:
                    matches = list(merchant_dir.glob(pattern))
                    if matches:
                        return str(sorted(matches, key=lambda p: p.stat().st_mtime, reverse=True)[0].absolute())

    # Check in investigation folder as fallback
    from app.service.logging.investigation_folder_manager import get_folder_manager
    try:
        folder_manager = get_folder_manager()
        inv_folder = folder_manager.get_investigation_folder(investigation_id)
        if inv_folder:
            cm_in_folder = inv_folder / "confusion_matrix.html"
            if cm_in_folder.exists():
                return str(cm_in_folder.absolute())
    except Exception:
        pass

    return None


def _safe_float(val: Any) -> float:
    """Safely convert to float."""
    try:
        return float(val) if val else 0.0
    except (ValueError, TypeError):
        return 0.0


def _safe_int(val: Any) -> int:
    """Safely convert to int."""
    try:
        return int(val) if val else 0
    except (ValueError, TypeError):
        return 0
