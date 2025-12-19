"""
Monthly Analysis Orchestrator

Orchestrates sequential 24h analysis windows across a full month.
Supports checkpointing for resumability after interruptions.

Feature: monthly-sequential-analysis
"""

import calendar
import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config.monthly_analysis_config import get_monthly_analysis_config
from app.schemas.monthly_analysis import (
    DailyAnalysisResult,
    MonthlyAnalysisResult,
    MonthlyAnalysisState,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("artifacts")
MONTHLY_DIR = ARTIFACTS_DIR / "monthly_analysis"


class MonthlyAnalysisOrchestrator:
    """Orchestrates monthly sequential analysis."""

    def __init__(self):
        self.config = get_monthly_analysis_config()

    async def run_monthly_analysis(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None,
        resume_from_day: Optional[int] = None,
    ) -> MonthlyAnalysisResult:
        """
        Run sequential 24h analysis windows for an entire month.

        Args:
            year: Target year (defaults to config)
            month: Target month 1-12 (defaults to config)
            resume_from_day: Day to resume from (defaults to config or checkpoint)

        Returns:
            MonthlyAnalysisResult with aggregated metrics
        """
        year = year or self.config.year
        month = month or self.config.month
        _, days_in_month = calendar.monthrange(year, month)
        month_name = calendar.month_name[month]

        logger.info(
            f"📅 Starting Monthly Analysis: {month_name} {year} ({days_in_month} days)"
        )

        # Try to load existing checkpoint
        state = self._load_checkpoint(year, month)
        if state and not resume_from_day:
            resume_from_day = state.last_completed_day + 1
            logger.info(
                f"📥 Resuming from checkpoint: day {resume_from_day} "
                f"({state.last_completed_day} days already completed)"
            )
        else:
            resume_from_day = resume_from_day or self.config.resume_from_day
            state = MonthlyAnalysisState(
                year=year,
                month=month,
                started_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

        # Initialize result
        result = MonthlyAnalysisResult(
            year=year,
            month=month,
            month_name=month_name,
            total_days=days_in_month,
            started_at=state.started_at,
            daily_results=list(state.daily_results),
        )

        # Process each day
        for day in range(resume_from_day, days_in_month + 1):
            try:
                daily_result = await self._process_single_day(year, month, day)
                result.daily_results.append(daily_result)

                # Update and save checkpoint
                state.last_completed_day = day
                state.daily_results = result.daily_results
                state.updated_at = datetime.utcnow()
                self._save_checkpoint(state)

                # Update aggregated metrics and generate report
                result.aggregate_from_daily()
                await self._generate_monthly_report(result)

                logger.info(
                    f"✅ Day {day}/{days_in_month} complete: "
                    f"TP={daily_result.tp}, FP={daily_result.fp}, "
                    f"Net=${daily_result.net_value:,.2f}"
                )

            except Exception as e:
                logger.error(f"❌ Error processing day {day}: {e}")
                state.error_message = str(e)
                self._save_checkpoint(state)
                raise

        # Mark as complete
        result.is_complete = True
        result.completed_at = datetime.utcnow()
        state.is_complete = True
        self._save_checkpoint(state)

        # Generate final report
        await self._generate_monthly_report(result)

        logger.info(
            f"🎉 Monthly Analysis Complete: {month_name} {year}\n"
            f"   Total TP: {result.total_tp}, Total FP: {result.total_fp}\n"
            f"   Saved GMV: ${result.total_saved_fraud_gmv:,.2f}\n"
            f"   Lost Revenues: ${result.total_lost_revenues:,.2f}\n"
            f"   Net Value: ${result.total_net_value:,.2f}"
        )

        return result

    async def _process_single_day(
        self, year: int, month: int, day: int
    ) -> DailyAnalysisResult:
        """Process a single day's 24h analysis window."""
        # Calculate the reference date (end of day)
        reference_date = datetime(year, month, day, 23, 59, 59)
        start_time = datetime.utcnow()

        logger.info(f"📆 Processing day {day}: {reference_date.strftime('%Y-%m-%d')}")

        # Set environment variable for risk analyzer
        os.environ["ANALYZER_REFERENCE_DATE"] = reference_date.strftime(
            "%Y-%m-%dT%H:%M:%S"
        )

        try:
            # Run auto comparisons for this day
            from app.service.investigation.auto_comparison import (
                run_auto_comparisons_for_top_entities,
            )

            results = await run_auto_comparisons_for_top_entities(
                time_window_hours=24,
                reference_date=reference_date,
            )

            # Aggregate results for this day
            daily = DailyAnalysisResult(
                date=reference_date,
                day_of_month=day,
                entities_discovered=len(results),
                started_at=start_time,
                completed_at=datetime.utcnow(),
            )

            for r in results:
                cm = r.get("confusion_matrix", {})
                rev = r.get("revenue_data", {})

                daily.tp += self._safe_int(cm.get("TP", 0))
                daily.fp += self._safe_int(cm.get("FP", 0))
                daily.tn += self._safe_int(cm.get("TN", 0))
                daily.fn += self._safe_int(cm.get("FN", 0))

                daily.saved_fraud_gmv += Decimal(
                    str(self._safe_float(rev.get("saved_fraud_gmv", 0)))
                )
                daily.lost_revenues += Decimal(
                    str(self._safe_float(rev.get("lost_revenues", 0)))
                )

                daily.investigation_ids.append(r.get("investigation_id", ""))

            daily.net_value = daily.saved_fraud_gmv - daily.lost_revenues
            daily.duration_seconds = (
                daily.completed_at - daily.started_at
            ).total_seconds()

            return daily

        finally:
            # Clear env var after processing
            if "ANALYZER_REFERENCE_DATE" in os.environ:
                del os.environ["ANALYZER_REFERENCE_DATE"]

    def _get_checkpoint_path(self, year: int, month: int) -> Path:
        """Get path to checkpoint file for given year/month."""
        month_dir = MONTHLY_DIR / f"{year}_{month:02d}"
        month_dir.mkdir(parents=True, exist_ok=True)
        return month_dir / "checkpoint.json"

    def _save_checkpoint(self, state: MonthlyAnalysisState) -> None:
        """Save checkpoint to disk."""
        checkpoint_path = self._get_checkpoint_path(state.year, state.month)
        checkpoint_path.write_text(state.json(indent=2))
        logger.debug(f"💾 Checkpoint saved: day {state.last_completed_day}")

    def _load_checkpoint(
        self, year: int, month: int
    ) -> Optional[MonthlyAnalysisState]:
        """Load checkpoint from disk if exists."""
        checkpoint_path = self._get_checkpoint_path(year, month)
        if checkpoint_path.exists():
            try:
                data = json.loads(checkpoint_path.read_text())
                return MonthlyAnalysisState(**data)
            except Exception as e:
                logger.warning(f"⚠️ Could not load checkpoint: {e}")
        return None

    async def _generate_monthly_report(self, result: MonthlyAnalysisResult) -> Path:
        """Generate the monthly HTML report."""
        from app.service.reporting.monthly_report_generator import (
            generate_monthly_report,
        )

        return await generate_monthly_report(result)

    @staticmethod
    def _safe_float(val: Any) -> float:
        """Safely convert to float."""
        try:
            return float(val) if val else 0.0
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def _safe_int(val: Any) -> int:
        """Safely convert to int."""
        try:
            return int(val) if val else 0
        except (ValueError, TypeError):
            return 0
