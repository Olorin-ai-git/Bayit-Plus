"""
Monthly Analysis API Service

Service layer for handling monthly analysis API requests.
Coordinates between the router, state manager, and orchestrator.

Feature: monthly-frontend-trigger
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.schemas.monthly_analysis import DailyAnalysisResult
from app.schemas.monthly_analysis_api import (
    BlindspotAnalysisResponse,
    BlindspotAnalysisTriggerRequest,
    CancelRunResponse,
    DailyResultSummary,
    MonthlyAnalysisHistoryResponse,
    MonthlyAnalysisMetrics,
    MonthlyAnalysisReportsResponse,
    MonthlyAnalysisResultsResponse,
    MonthlyAnalysisRunStatus,
    MonthlyAnalysisStatusResponse,
    MonthlyAnalysisTriggerRequest,
    ReportLink,
)
from app.service.investigation.monthly_analysis_orchestrator import (
    MonthlyAnalysisOrchestrator,
)
from app.service.investigation.monthly_analysis_state_manager import (
    MonthlyAnalysisRunState,
    get_state_manager,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MonthlyAnalysisApiService:
    """Service for handling monthly analysis API operations."""

    def __init__(self) -> None:
        """Initialize the API service."""
        self.state_manager = get_state_manager()
        self._report_base_url = os.getenv(
            "MONTHLY_ANALYSIS_REPORT_BASE_URL", "/api/v1/monthly-analysis/reports"
        )
        self._output_base_dir = Path(
            os.getenv("MONTHLY_ANALYSIS_OUTPUT_DIR", "artifacts/monthly_analysis")
        )

    async def trigger_analysis(
        self,
        request: MonthlyAnalysisTriggerRequest,
        triggered_by: Optional[str] = None,
    ) -> MonthlyAnalysisStatusResponse:
        """
        Trigger a new monthly analysis run.

        Args:
            request: Trigger request with year, month, and options
            triggered_by: Email of user who triggered the run

        Returns:
            Status response for the new run

        Raises:
            ValueError: If another run is already in progress
        """
        # Create run state (raises if already running)
        run_state = self.state_manager.create_run(
            year=request.year,
            month=request.month,
            triggered_by=triggered_by,
        )

        # Start the analysis in background
        asyncio.create_task(
            self._execute_analysis(
                run_state=run_state,
                resume_from_day=request.resume_from_day,
                top_percentage=request.top_percentage,
                time_window_hours=request.time_window_hours,
                include_blindspot=request.include_blindspot_analysis,
            )
        )

        return run_state.to_status_response()

    async def _execute_analysis(
        self,
        run_state: MonthlyAnalysisRunState,
        resume_from_day: int,
        top_percentage: Optional[float],
        time_window_hours: Optional[int],
        include_blindspot: bool,
    ) -> None:
        """Execute the monthly analysis in background."""
        try:
            run_state.mark_running()
            logger.info(f"Starting monthly analysis run: {run_state.run_id}")

            # Create orchestrator with optional overrides
            orchestrator = MonthlyAnalysisOrchestrator()

            if top_percentage is not None:
                orchestrator.top_percentage = top_percentage
            if time_window_hours is not None:
                orchestrator.time_window_hours = time_window_hours

            # Run analysis with cancellation support
            result = await self._run_with_cancellation_support(
                run_state=run_state,
                orchestrator=orchestrator,
                resume_from_day=resume_from_day,
            )

            if run_state.is_cancelled():
                run_state.mark_cancelled()
                logger.info(f"Monthly analysis cancelled: {run_state.run_id}")
                return

            if result:
                run_state.mark_completed(result)

                # Record report paths
                output_dir = self._output_base_dir / f"{run_state.year}_{run_state.month:02d}"
                html_report = output_dir / "monthly_summary.html"
                if html_report.exists():
                    run_state.add_report("html", str(html_report))

                logger.info(
                    f"Monthly analysis completed: {run_state.run_id} "
                    f"with {result.total_entities} entities"
                )
            else:
                run_state.mark_failed("Analysis returned no results")

        except Exception as e:
            logger.error(f"Monthly analysis failed: {run_state.run_id} - {e}")
            run_state.mark_failed(str(e))

    async def _run_with_cancellation_support(
        self,
        run_state: MonthlyAnalysisRunState,
        orchestrator: MonthlyAnalysisOrchestrator,
        resume_from_day: int,
    ):
        """
        Run the orchestrator with periodic cancellation checks.

        This wraps the orchestrator to provide progress updates and cancellation.
        """
        from app.schemas.monthly_analysis import MonthlyAnalysisResult
        from app.service.investigation.auto_comparison import (
            run_auto_comparisons_for_top_entities,
        )
        from app.service.reporting.monthly_report_generator import (
            generate_monthly_report,
        )

        import calendar
        from decimal import Decimal

        year = run_state.year
        month = run_state.month
        days_in_month = calendar.monthrange(year, month)[1]
        month_name = calendar.month_name[month]

        # Calculate end day based on max_days
        end_day = min(resume_from_day + orchestrator.max_days - 1, days_in_month)

        output_dir = orchestrator.output_base_dir / f"{year}_{month:02d}"
        output_dir.mkdir(parents=True, exist_ok=True)

        daily_results: List[DailyAnalysisResult] = []
        started_at = datetime.now()

        for day in range(resume_from_day, end_day + 1):
            # Check for cancellation before each day
            if run_state.is_cancelled():
                logger.info(f"Cancellation detected at day {day}")
                break

            reference_date = datetime(year, month, day, 23, 59, 59)
            day_started = datetime.now()

            logger.info(f"Processing day {day} for run {run_state.run_id}")

            try:
                results = await run_auto_comparisons_for_top_entities(
                    top_percentage=orchestrator.top_percentage,
                    time_window_hours=orchestrator.time_window_hours,
                    reference_date=reference_date,
                )

                day_completed = datetime.now()

                # Aggregate daily metrics
                tp = fp = tn = fn = 0
                overall_tp = overall_fp = overall_tn = overall_fn = 0
                investigation_ids: List[str] = []
                entity_values: List[str] = []
                entities_expected = 0
                day_saved = Decimal("0")
                day_lost = Decimal("0")

                for result in results:
                    cm = result.get("confusion_matrix", {})
                    tp += cm.get("TP", 0)
                    fp += cm.get("FP", 0)
                    tn += cm.get("TN", 0)
                    fn += cm.get("FN", 0)
                    overall_tp += cm.get("overall_TP", 0)
                    overall_fp += cm.get("overall_FP", 0)
                    overall_tn += cm.get("overall_TN", 0)
                    overall_fn += cm.get("overall_FN", 0)

                    if result.get("investigation_id"):
                        investigation_ids.append(result["investigation_id"])

                    entity_val = result.get("entity_value") or result.get("email")
                    if entity_val:
                        entity_values.append(entity_val)

                    if entities_expected == 0:
                        metadata = result.get("selector_metadata", {})
                        entities_expected = metadata.get("total_entities_expected", 0)

                    rev_data = result.get("revenue_data", {})
                    if rev_data:
                        saved = float(rev_data.get("saved_fraud_gmv", 0) or 0)
                        lost = float(rev_data.get("lost_revenues", 0) or 0)
                        day_saved += Decimal(str(saved))
                        day_lost += Decimal(str(lost))

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
                    investigation_ids=investigation_ids,
                    entity_values=entity_values,
                    started_at=day_started,
                    completed_at=day_completed,
                    duration_seconds=(day_completed - day_started).total_seconds(),
                )

                daily_results.append(day_result)

                # Update run state progress
                run_state.update_progress(day, day_result)

                logger.info(
                    f"Day {day} complete: {len(results)} investigations, "
                    f"TP={tp}, FP={fp}"
                )

            except Exception as e:
                logger.error(f"Error processing day {day}: {e}")
                # Continue to next day on error
                day_result = DailyAnalysisResult(
                    date=reference_date,
                    day_of_month=day,
                    entities_discovered=0,
                    tp=0,
                    fp=0,
                    tn=0,
                    fn=0,
                    started_at=day_started,
                    completed_at=datetime.now(),
                )
                daily_results.append(day_result)
                run_state.update_progress(day, day_result)

        # Build final result
        if not run_state.is_cancelled():
            result = orchestrator._build_monthly_result(
                year,
                month,
                month_name,
                days_in_month,
                daily_results,
                started_at,
                is_final=True,
            )

            # Generate final report
            await generate_monthly_report(result)

            return result

        return None

    def get_status(
        self, run_id: Optional[str] = None
    ) -> Optional[MonthlyAnalysisStatusResponse]:
        """
        Get status of a specific run or the current run.

        Args:
            run_id: Specific run ID, or None for current run

        Returns:
            Status response or None if not found
        """
        if run_id:
            run_state = self.state_manager.get_run(run_id)
        else:
            run_state = self.state_manager.get_current_run()

        if run_state:
            return run_state.to_status_response()
        return None

    def get_history(
        self,
        limit: int = 20,
        offset: int = 0,
        status_filter: Optional[str] = None,
    ) -> MonthlyAnalysisHistoryResponse:
        """
        Get paginated history of analysis runs.

        Args:
            limit: Maximum items to return
            offset: Skip first N items
            status_filter: Filter by status string

        Returns:
            Paginated history response
        """
        filter_status = None
        if status_filter:
            try:
                filter_status = MonthlyAnalysisRunStatus(status_filter)
            except ValueError:
                pass  # Invalid status, ignore filter

        items, total = self.state_manager.get_history(
            limit=limit, offset=offset, status_filter=filter_status
        )

        return MonthlyAnalysisHistoryResponse(
            runs=items,
            total=total,
            page=(offset // limit) + 1 if limit > 0 else 1,
            page_size=limit,
            has_more=(offset + limit) < total,
        )

    def get_results(self, run_id: str) -> Optional[MonthlyAnalysisResultsResponse]:
        """
        Get full results for a completed run.

        Args:
            run_id: Run identifier

        Returns:
            Full results response or None if not found/not completed
        """
        run_state = self.state_manager.get_run(run_id)
        if not run_state:
            return None

        # Build daily summaries
        daily_summaries = [
            DailyResultSummary(
                day=dr.day_of_month,
                date=dr.date.strftime("%Y-%m-%d"),
                entities_analyzed=dr.entities_discovered,
                investigations_count=len(dr.investigation_ids),
                tp=dr.tp,
                fp=dr.fp,
                tn=dr.tn,
                fn=dr.fn,
                net_value=float(dr.net_value),
                duration_seconds=dr.duration_seconds,
            )
            for dr in run_state.daily_results
        ]

        # Build metrics if completed
        metrics = None
        if run_state.monthly_result:
            mr = run_state.monthly_result
            metrics = MonthlyAnalysisMetrics(
                total_entities=mr.total_entities,
                total_investigations=sum(
                    len(dr.investigation_ids) for dr in run_state.daily_results
                ),
                total_tp=mr.total_tp,
                total_fp=mr.total_fp,
                total_tn=mr.total_tn,
                total_fn=mr.total_fn,
                precision=mr.precision,
                recall=mr.recall,
                f1_score=mr.f1_score,
                total_saved_fraud_gmv=float(mr.total_saved_fraud_gmv),
                total_lost_revenues=float(mr.total_lost_revenues),
                total_net_value=float(mr.total_net_value),
                roi_percentage=mr.roi_percentage,
            )

        return MonthlyAnalysisResultsResponse(
            run_id=run_state.run_id,
            status=run_state.status,
            year=run_state.year,
            month=run_state.month,
            month_name=run_state.month_name,
            started_at=run_state.started_at,
            completed_at=run_state.completed_at,
            metrics=metrics,
            daily_results=daily_summaries,
        )

    def cancel_run(self, run_id: str) -> Optional[CancelRunResponse]:
        """
        Cancel a running analysis.

        Args:
            run_id: Run to cancel

        Returns:
            Cancel response or None if not found/not cancellable
        """
        success = self.state_manager.cancel_run(run_id)
        if not success:
            return None

        run_state = self.state_manager.get_run(run_id)
        if not run_state:
            return None

        return CancelRunResponse(
            run_id=run_id,
            status=MonthlyAnalysisRunStatus.CANCELLED,
            message="Cancellation requested. Run will stop after current day.",
            cancelled_at=datetime.now(),
        )

    def get_reports(self, run_id: str) -> Optional[MonthlyAnalysisReportsResponse]:
        """
        Get available reports for a run.

        Args:
            run_id: Run identifier

        Returns:
            Reports response or None if not found
        """
        run_state = self.state_manager.get_run(run_id)
        if not run_state:
            return None

        reports: List[ReportLink] = []

        # Check for generated reports
        output_dir = self._output_base_dir / f"{run_state.year}_{run_state.month:02d}"

        if output_dir.exists():
            # HTML report
            html_path = output_dir / "monthly_summary.html"
            if html_path.exists():
                stat = html_path.stat()
                reports.append(
                    ReportLink(
                        report_type="html",
                        url=f"{self._report_base_url}/{run_id}/download/html",
                        filename=f"monthly_analysis_{run_state.year}_{run_state.month:02d}.html",
                        generated_at=datetime.fromtimestamp(stat.st_mtime),
                        size_bytes=stat.st_size,
                    )
                )

            # CSV blindspot report
            csv_path = output_dir / "blindspots.csv"
            if csv_path.exists():
                stat = csv_path.stat()
                reports.append(
                    ReportLink(
                        report_type="csv",
                        url=f"{self._report_base_url}/{run_id}/download/csv",
                        filename=f"blindspots_{run_state.year}_{run_state.month:02d}.csv",
                        generated_at=datetime.fromtimestamp(stat.st_mtime),
                        size_bytes=stat.st_size,
                    )
                )

        return MonthlyAnalysisReportsResponse(run_id=run_id, reports=reports)

    async def run_blindspot_analysis(
        self,
        request: BlindspotAnalysisTriggerRequest,
    ) -> BlindspotAnalysisResponse:
        """
        Run standalone blindspot analysis.

        Args:
            request: Blindspot analysis parameters

        Returns:
            Blindspot analysis response
        """
        from app.service.analytics.model_blindspot_analyzer import (
            ModelBlindspotAnalyzer,
        )

        try:
            analyzer = ModelBlindspotAnalyzer()
            result = await analyzer.analyze_blindspots(
                export_csv=request.export_csv,
                start_date=request.start_date,
                end_date=request.end_date,
            )

            blindspots = result.get("blindspots", [])
            csv_path = result.get("csv_path")

            period_desc = None
            if request.start_date and request.end_date:
                period_desc = (
                    f"{request.start_date.strftime('%Y-%m-%d')} to "
                    f"{request.end_date.strftime('%Y-%m-%d')}"
                )

            return BlindspotAnalysisResponse(
                status="success" if result.get("status") == "success" else "failed",
                blindspots_count=len(blindspots),
                csv_path=csv_path,
                analysis_period=period_desc,
            )

        except Exception as e:
            logger.error(f"Blindspot analysis failed: {e}")
            return BlindspotAnalysisResponse(
                status="failed",
                blindspots_count=0,
            )


# Singleton instance
_api_service_instance: Optional[MonthlyAnalysisApiService] = None


def get_monthly_analysis_api_service() -> MonthlyAnalysisApiService:
    """Get the singleton API service instance."""
    global _api_service_instance
    if _api_service_instance is None:
        _api_service_instance = MonthlyAnalysisApiService()
    return _api_service_instance
