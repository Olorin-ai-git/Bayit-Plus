"""
Monthly Analysis Orchestrator

Orchestrates running auto-comparison analysis for each day of a specified month.
Generates incremental HTML reports for each day and an updated monthly summary.

Feature: monthly-sequential-analysis
"""

import calendar
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Dict, List

from app.schemas.monthly_analysis import (
    DailyAnalysisResult,
    MonthlyAnalysisResult,
)
from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer
from app.service.investigation.auto_comparison import (
    run_auto_comparisons_for_top_entities,
)
from app.service.logging import get_bridge_logger
from app.service.reporting.monthly_report_generator import generate_monthly_report

logger = get_bridge_logger(__name__)


def _generate_daily_html_report(
    day_result: DailyAnalysisResult, output_dir: Path
) -> Path:
    """Generate HTML report for a single day's results."""
    date_str = day_result.date.strftime("%Y-%m-%d")
    day_num = day_result.day_of_month
    net_class = "positive" if day_result.net_value >= 0 else "negative"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Analysis - {date_str}</title>
    <style>
        :root {{
            --bg: #0f172a; --card: #1e293b; --border: #334155;
            --text: #e2e8f0; --muted: #94a3b8;
            --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --accent: #3b82f6;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg); color: var(--text);
            line-height: 1.6; padding: 20px;
        }}
        .header {{
            text-align: center; padding: 30px;
            border-bottom: 2px solid var(--accent); margin-bottom: 30px;
        }}
        h1 {{ color: var(--accent); font-size: 2rem; }}
        .subtitle {{ color: var(--muted); margin-top: 10px; }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px; margin: 30px 0;
        }}
        .metric-card {{
            background: var(--card); border: 1px solid var(--border);
            border-radius: 12px; padding: 20px; text-align: center;
        }}
        .metric-value {{ font-size: 1.8rem; font-weight: bold; }}
        .metric-value.positive {{ color: var(--ok); }}
        .metric-value.negative {{ color: var(--danger); }}
        .metric-label {{ color: var(--muted); margin-top: 5px; font-size: 0.9rem; }}
        .confusion-grid {{
            display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 10px; max-width: 400px; margin: 20px auto;
        }}
        .cm-cell {{
            padding: 15px; text-align: center;
            border-radius: 8px; font-weight: bold;
        }}
        .cm-tp {{ background: rgba(34, 197, 94, 0.2); color: var(--ok); }}
        .cm-fp {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        .cm-tn {{ background: rgba(59, 130, 246, 0.2); color: var(--accent); }}
        .cm-fn {{ background: rgba(245, 158, 11, 0.2); color: var(--warn); }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Fraud Analysis Report</h1>
        <p class="subtitle">{date_str} (Day {day_num})</p>
        <p class="subtitle">Generated: {timestamp}</p>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">{day_result.entities_discovered}/{day_result.entities_expected}</div>
            <div class="metric-label">Entities Analyzed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{len(day_result.investigation_ids)}</div>
            <div class="metric-label">Investigations</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {net_class}">${float(day_result.net_value):,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
    </div>

    <h2 style="text-align: center; color: var(--accent); margin: 20px 0;">Transaction Analysis</h2>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {day_result.tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {day_result.fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {day_result.fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {day_result.tn}<br><small>Legit Confirmed</small></div>
    </div>

    <div class="metrics-grid" style="margin-top: 30px;">
        <div class="metric-card">
            <div class="metric-value positive">${float(day_result.saved_fraud_gmv):,.2f}</div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${float(day_result.lost_revenues):,.2f}</div>
            <div class="metric-label">Lost Revenues</div>
        </div>
    </div>
</body>
</html>"""

    output_path = output_dir / f"day_{day_num:02d}_report.html"
    output_path.write_text(html)
    return output_path


class MonthlyAnalysisOrchestrator:
    """Orchestrates monthly sequential analysis across all days of a month."""

    def __init__(self) -> None:
        """Initialize orchestrator with configuration from environment."""
        self.top_percentage = float(
            os.getenv("MONTHLY_ANALYSIS_TOP_PERCENTAGE", "0.1")
        )
        self.time_window_hours = int(
            os.getenv("MONTHLY_ANALYSIS_TIME_WINDOW_HOURS", "24")
        )
        self.max_days = int(
            os.getenv("MONTHLY_ANALYSIS_MAX_DAYS", "31")
        )
        self.output_base_dir = Path(
            os.getenv("MONTHLY_ANALYSIS_OUTPUT_DIR", "artifacts/monthly_analysis")
        )

    async def run_monthly_analysis(
        self,
        year: int,
        month: int,
        resume_from_day: int = 1,
    ) -> MonthlyAnalysisResult:
        """
        Run analysis for each day in the specified month.

        Args:
            year: Target year (e.g., 2024)
            month: Target month (1-12)
            resume_from_day: Day to start/resume from (1-31)

        Returns:
            MonthlyAnalysisResult with aggregated metrics and daily summaries.
        """
        days_in_month = calendar.monthrange(year, month)[1]
        month_name = calendar.month_name[month]

        # Calculate end day based on max_days setting
        end_day = min(resume_from_day + self.max_days - 1, days_in_month)

        logger.info(f"{'='*60}")
        logger.info(f"MONTHLY ANALYSIS: {month_name} {year}")
        logger.info(f"Days in month: {days_in_month}")
        logger.info(f"Starting from day: {resume_from_day}")
        logger.info(f"Ending at day: {end_day} (max_days={self.max_days})")
        logger.info(f"Top percentage: {self.top_percentage}")
        logger.info(f"Time window: {self.time_window_hours}h")
        logger.info(f"{'='*60}")

        output_dir = self.output_base_dir / f"{year}_{month:02d}"
        output_dir.mkdir(parents=True, exist_ok=True)

        daily_results: List[DailyAnalysisResult] = []
        started_at = datetime.now()

        for day in range(resume_from_day, end_day + 1):
            reference_date = datetime(year, month, day, 23, 59, 59)
            day_started = datetime.now()

            logger.info(f"\n{'='*40}")
            logger.info(f"Processing: {reference_date.date()}")
            logger.info(f"{'='*40}")

            try:
                results = await run_auto_comparisons_for_top_entities(
                    top_percentage=self.top_percentage,
                    time_window_hours=self.time_window_hours,
                    reference_date=reference_date,
                )

                day_completed = datetime.now()
                # Review Precision metrics (flagged only)
                tp = fp = tn = fn = 0
                # Overall Classification metrics (all transactions)
                overall_tp = overall_fp = overall_tn = overall_fn = 0
                investigation_ids: List[str] = []
                entity_values: List[str] = []  # For investigated entities analysis
                entities_expected = 0

                vendor_gmv: Dict[str, float] = {}
                day_saved = Decimal("0")
                day_lost = Decimal("0")
                for result in results:
                    cm = result.get("confusion_matrix", {})
                    # Review Precision (flagged only)
                    tp += cm.get("TP", 0)
                    fp += cm.get("FP", 0)
                    tn += cm.get("TN", 0)
                    fn += cm.get("FN", 0)
                    # Overall Classification (all transactions)
                    overall_tp += cm.get("overall_TP", 0)
                    overall_fp += cm.get("overall_FP", 0)
                    overall_tn += cm.get("overall_TN", 0)
                    overall_fn += cm.get("overall_FN", 0)
                    if result.get("investigation_id"):
                        investigation_ids.append(result["investigation_id"])
                    # Collect entity values for investigated entities analysis
                    entity_val = result.get("entity_value") or result.get("email")
                    if entity_val:
                        entity_values.append(entity_val)
                    # Extract total expected from selector_metadata (set once)
                    if entities_expected == 0:
                        metadata = result.get("selector_metadata", {})
                        entities_expected = metadata.get("total_entities_expected", 0)
                    # Aggregate vendor GMV and revenue data
                    merchant = result.get("merchant_name", "Unknown")
                    rev_data = result.get("revenue_data", {})
                    if rev_data:
                        saved = float(rev_data.get("saved_fraud_gmv", 0) or 0)
                        lost = float(rev_data.get("lost_revenues", 0) or 0)
                        day_saved += Decimal(str(saved))
                        day_lost += Decimal(str(lost))
                        net_val = saved - lost
                    else:
                        net_val = 0
                    vendor_gmv[merchant] = vendor_gmv.get(merchant, 0) + float(net_val)

                day_result = DailyAnalysisResult(
                    date=reference_date,
                    day_of_month=day,
                    entities_expected=entities_expected,
                    entities_discovered=len(results),
                    tp=tp,
                    fp=fp,
                    tn=tn,
                    fn=fn,
                    overall_tp=overall_tp,
                    overall_fp=overall_fp,
                    overall_tn=overall_tn,
                    overall_fn=overall_fn,
                    saved_fraud_gmv=day_saved,
                    lost_revenues=day_lost,
                    net_value=day_saved - day_lost,
                    vendor_gmv_breakdown=vendor_gmv,
                    investigation_ids=investigation_ids,
                    entity_values=entity_values,  # For investigated entities analysis
                    started_at=day_started,
                    completed_at=day_completed,
                    duration_seconds=(day_completed - day_started).total_seconds(),
                )

                daily_results.append(day_result)

                daily_html = _generate_daily_html_report(day_result, output_dir)
                logger.info(f"Daily HTML report: {daily_html}")

                monthly_result = self._build_monthly_result(
                    year, month, month_name, days_in_month,
                    daily_results, started_at
                )
                await generate_monthly_report(monthly_result)

                logger.info(f"Day {day} complete: {len(results)} investigations")
                logger.info(f"Confusion: TP={tp}, FP={fp}, TN={tn}, FN={fn}")

            except Exception as e:
                logger.error(f"Error processing day {day}: {e}")
                day_result = DailyAnalysisResult(
                    date=reference_date,
                    day_of_month=day,
                    entities_discovered=0,
                    tp=0, fp=0, tn=0, fn=0,
                    started_at=day_started,
                    completed_at=datetime.now(),
                )
                daily_results.append(day_result)

        final_result = self._build_monthly_result(
            year, month, month_name, days_in_month,
            daily_results, started_at, is_final=True
        )

        # Run blindspot analysis for final report heatmap
        # Scope to the specific month being analyzed
        month_start = datetime(year, month, 1)
        month_end = datetime(year, month, days_in_month, 23, 59, 59)

        blindspot_data = None
        try:
            logger.info("Running blindspot analysis for final report...")
            analyzer = ModelBlindspotAnalyzer()
            blindspot_data = await analyzer.analyze_blindspots(
                export_csv=True, start_date=month_start, end_date=month_end
            )
            if blindspot_data.get("status") == "success":
                logger.info(
                    f"Blindspot analysis: {len(blindspot_data.get('blindspots', []))} "
                    f"blindspots identified"
                )
            else:
                blindspot_data = None
        except Exception as e:
            logger.warning(f"Could not run blindspot analysis: {e}")

        # Run investigated entities analysis for the toggle
        investigated_blindspot_data = None
        try:
            # Collect entity IDs from all daily results
            entity_ids = []
            for day_result in daily_results:
                for inv_id in day_result.investigation_ids:
                    # Extract entity from investigation (stored during processing)
                    entity_ids.append(inv_id)  # Will be resolved by analyzer

            if entity_ids:
                logger.info(f"Running investigated entities analysis for {len(entity_ids)} entities...")
                inv_analyzer = ModelBlindspotAnalyzer()
                investigated_blindspot_data = await inv_analyzer.analyze_investigated_entities(
                    entity_ids, month_start, month_end
                )
                if investigated_blindspot_data and investigated_blindspot_data.get("gmv_by_score"):
                    logger.info(
                        f"Investigated entities analysis: "
                        f"{len(investigated_blindspot_data.get('gmv_by_score', []))} score bins"
                    )
                else:
                    investigated_blindspot_data = None
        except Exception as e:
            logger.warning(f"Could not run investigated entities analysis: {e}")

        final_html_path = await generate_monthly_report(
            final_result, blindspot_data, investigated_blindspot_data
        )
        logger.info(f"\n{'='*60}")
        logger.info(f"MONTHLY ANALYSIS COMPLETE: {month_name} {year}")
        logger.info(f"Days processed: {len(daily_results)}")
        logger.info(f"Total investigations: {final_result.total_entities}")
        logger.info(
            f"Aggregated: TP={final_result.total_tp}, FP={final_result.total_fp}, "
            f"TN={final_result.total_tn}, FN={final_result.total_fn}"
        )
        logger.info(f"Final HTML report: {final_html_path}")
        logger.info(f"{'='*60}")

        return final_result

    def _build_monthly_result(
        self,
        year: int,
        month: int,
        month_name: str,
        total_days: int,
        daily_results: List[DailyAnalysisResult],
        started_at: datetime,
        is_final: bool = False,
    ) -> MonthlyAnalysisResult:
        """Build MonthlyAnalysisResult from daily results."""
        result = MonthlyAnalysisResult(
            year=year,
            month=month,
            month_name=month_name,
            total_days=total_days,
            daily_results=daily_results,
            started_at=started_at,
            completed_at=datetime.now() if is_final else None,
        )
        result.aggregate_from_daily()
        return result
