"""
Monthly Analysis State Manager

Manages the state of monthly analysis runs for API access.
Tracks running/completed analyses, supports cancellation, and provides history.

Feature: monthly-frontend-trigger
"""

import calendar
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas.monthly_analysis import DailyAnalysisResult, MonthlyAnalysisResult
from app.schemas.monthly_analysis_api import (
    DailyResultSummary,
    MonthlyAnalysisHistoryItem,
    MonthlyAnalysisMetrics,
    MonthlyAnalysisProgressMetrics,
    MonthlyAnalysisResultsResponse,
    MonthlyAnalysisRunStatus,
    MonthlyAnalysisStatusResponse,
    ReportLink,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MonthlyAnalysisRunState:
    """State container for a single monthly analysis run."""

    def __init__(
        self,
        run_id: str,
        year: int,
        month: int,
        triggered_by: Optional[str] = None,
    ) -> None:
        """Initialize run state."""
        self.run_id = run_id
        self.year = year
        self.month = month
        self.month_name = calendar.month_name[month]
        self.total_days = calendar.monthrange(year, month)[1]
        self.triggered_by = triggered_by

        self.status = MonthlyAnalysisRunStatus.PENDING
        self.started_at = datetime.now()
        self.updated_at = datetime.now()
        self.completed_at: Optional[datetime] = None
        self.error_message: Optional[str] = None

        # Progress tracking
        self.current_day = 0
        self.days_completed = 0
        self.entities_processed = 0
        self.investigations_created = 0

        # Results storage
        self.daily_results: List[DailyAnalysisResult] = []
        self.monthly_result: Optional[MonthlyAnalysisResult] = None

        # Cancellation token
        self.cancel_requested = False

        # Report paths
        self.report_paths: Dict[str, str] = {}

    def request_cancel(self) -> None:
        """Request cancellation of the run."""
        self.cancel_requested = True
        self.updated_at = datetime.now()
        logger.info(f"Cancellation requested for run {self.run_id}")

    def is_cancelled(self) -> bool:
        """Check if cancellation was requested."""
        return self.cancel_requested

    def update_progress(
        self,
        current_day: int,
        daily_result: Optional[DailyAnalysisResult] = None,
    ) -> None:
        """Update progress after processing a day."""
        self.current_day = current_day
        self.updated_at = datetime.now()

        if daily_result:
            self.daily_results.append(daily_result)
            self.days_completed = len(self.daily_results)
            self.entities_processed += daily_result.entities_discovered
            self.investigations_created += len(daily_result.investigation_ids)

    def mark_running(self) -> None:
        """Mark run as started/running."""
        self.status = MonthlyAnalysisRunStatus.RUNNING
        self.updated_at = datetime.now()

    def mark_completed(self, result: MonthlyAnalysisResult) -> None:
        """Mark run as successfully completed."""
        self.status = MonthlyAnalysisRunStatus.COMPLETED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()
        self.monthly_result = result

    def mark_failed(self, error_message: str) -> None:
        """Mark run as failed."""
        self.status = MonthlyAnalysisRunStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()

    def mark_cancelled(self) -> None:
        """Mark run as cancelled."""
        self.status = MonthlyAnalysisRunStatus.CANCELLED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()

    def add_report(self, report_type: str, path: str) -> None:
        """Add a generated report path."""
        self.report_paths[report_type] = path
        self.updated_at = datetime.now()

    def get_progress_metrics(self) -> Optional[MonthlyAnalysisProgressMetrics]:
        """Get current progress metrics."""
        if self.status != MonthlyAnalysisRunStatus.RUNNING:
            return None

        progress_pct = (
            (self.days_completed / self.total_days * 100) if self.total_days > 0 else 0
        )

        return MonthlyAnalysisProgressMetrics(
            current_day=self.current_day,
            total_days=self.total_days,
            days_completed=self.days_completed,
            progress_percentage=round(progress_pct, 1),
            entities_processed=self.entities_processed,
            investigations_created=self.investigations_created,
        )

    def to_status_response(self) -> MonthlyAnalysisStatusResponse:
        """Convert to API status response."""
        return MonthlyAnalysisStatusResponse(
            run_id=self.run_id,
            status=self.status,
            year=self.year,
            month=self.month,
            month_name=self.month_name,
            started_at=self.started_at,
            updated_at=self.updated_at,
            completed_at=self.completed_at,
            progress=self.get_progress_metrics(),
            error_message=self.error_message,
            triggered_by=self.triggered_by,
        )

    def to_history_item(self) -> MonthlyAnalysisHistoryItem:
        """Convert to history list item."""
        return MonthlyAnalysisHistoryItem(
            run_id=self.run_id,
            year=self.year,
            month=self.month,
            month_name=self.month_name,
            status=self.status,
            started_at=self.started_at,
            completed_at=self.completed_at,
            days_completed=self.days_completed,
            total_days=self.total_days,
            total_entities=self.entities_processed,
            triggered_by=self.triggered_by,
        )


class MonthlyAnalysisStateManager:
    """
    Manages all monthly analysis run states.

    Thread-safe singleton that tracks all analysis runs.
    """

    _instance: Optional["MonthlyAnalysisStateManager"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "MonthlyAnalysisStateManager":
        """Singleton pattern with thread safety."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        """Initialize manager (only once due to singleton)."""
        if self._initialized:
            return

        self._runs: Dict[str, MonthlyAnalysisRunState] = {}
        self._runs_lock = threading.Lock()
        self._current_run_id: Optional[str] = None
        self._max_history = int(os.getenv("MONTHLY_ANALYSIS_MAX_HISTORY", "50"))
        self._initialized = True

        logger.info("MonthlyAnalysisStateManager initialized")

    def create_run(
        self,
        year: int,
        month: int,
        triggered_by: Optional[str] = None,
    ) -> MonthlyAnalysisRunState:
        """
        Create a new analysis run.

        Args:
            year: Target year
            month: Target month (1-12)
            triggered_by: User email who triggered the run

        Returns:
            New MonthlyAnalysisRunState

        Raises:
            ValueError: If a run is already in progress
        """
        with self._runs_lock:
            # Check if another run is in progress
            if self._current_run_id:
                current_run = self._runs.get(self._current_run_id)
                if current_run and current_run.status == MonthlyAnalysisRunStatus.RUNNING:
                    raise ValueError(
                        f"Analysis already running: {self._current_run_id}. "
                        "Only one concurrent run is allowed."
                    )

            # Generate unique run ID
            run_id = f"ma_{year}{month:02d}_{uuid.uuid4().hex[:8]}"

            # Create run state
            run_state = MonthlyAnalysisRunState(
                run_id=run_id,
                year=year,
                month=month,
                triggered_by=triggered_by,
            )

            self._runs[run_id] = run_state
            self._current_run_id = run_id

            # Cleanup old runs if exceeding max history
            self._cleanup_old_runs()

            logger.info(
                f"Created monthly analysis run: {run_id} for {month}/{year} "
                f"triggered by {triggered_by}"
            )

            return run_state

    def get_run(self, run_id: str) -> Optional[MonthlyAnalysisRunState]:
        """Get a specific run by ID."""
        with self._runs_lock:
            return self._runs.get(run_id)

    def get_current_run(self) -> Optional[MonthlyAnalysisRunState]:
        """Get the currently active/most recent run."""
        with self._runs_lock:
            if self._current_run_id:
                return self._runs.get(self._current_run_id)
            return None

    def get_running_run(self) -> Optional[MonthlyAnalysisRunState]:
        """Get the currently running analysis (if any)."""
        with self._runs_lock:
            for run in self._runs.values():
                if run.status == MonthlyAnalysisRunStatus.RUNNING:
                    return run
            return None

    def cancel_run(self, run_id: str) -> bool:
        """
        Request cancellation of a run.

        Args:
            run_id: Run to cancel

        Returns:
            True if cancellation was requested, False if run not found/not running
        """
        with self._runs_lock:
            run = self._runs.get(run_id)
            if not run:
                return False

            if run.status != MonthlyAnalysisRunStatus.RUNNING:
                return False

            run.request_cancel()
            return True

    def get_history(
        self,
        limit: int = 20,
        offset: int = 0,
        status_filter: Optional[MonthlyAnalysisRunStatus] = None,
    ) -> tuple[List[MonthlyAnalysisHistoryItem], int]:
        """
        Get paginated history of runs.

        Args:
            limit: Maximum items to return
            offset: Skip first N items
            status_filter: Filter by status (optional)

        Returns:
            Tuple of (list of history items, total count)
        """
        with self._runs_lock:
            # Sort by started_at descending
            sorted_runs = sorted(
                self._runs.values(), key=lambda r: r.started_at, reverse=True
            )

            # Apply status filter
            if status_filter:
                sorted_runs = [r for r in sorted_runs if r.status == status_filter]

            total = len(sorted_runs)

            # Apply pagination
            paginated = sorted_runs[offset : offset + limit]

            return [r.to_history_item() for r in paginated], total

    def _cleanup_old_runs(self) -> None:
        """Remove oldest runs if exceeding max history."""
        if len(self._runs) <= self._max_history:
            return

        # Sort by started_at, keep newest
        sorted_runs = sorted(self._runs.values(), key=lambda r: r.started_at)
        runs_to_remove = len(self._runs) - self._max_history

        for run in sorted_runs[:runs_to_remove]:
            # Don't remove currently running
            if run.status == MonthlyAnalysisRunStatus.RUNNING:
                continue
            del self._runs[run.run_id]
            logger.debug(f"Cleaned up old run: {run.run_id}")


def get_state_manager() -> MonthlyAnalysisStateManager:
    """Get the singleton state manager instance."""
    return MonthlyAnalysisStateManager()
