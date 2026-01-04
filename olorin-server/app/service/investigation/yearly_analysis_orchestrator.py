"""
Yearly Analysis Orchestrator

Aggregates monthly analysis results into yearly summaries.
Loads existing monthly report data from database or generates from artifacts.

Feature: unified-report-hierarchy
"""

import calendar
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.schemas.monthly_analysis import MonthlyAnalysisResult
from app.schemas.yearly_analysis import YearlyAnalysisResult
from app.service.logging import get_bridge_logger
from app.service.reporting.yearly_report_generator import generate_yearly_report

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "artifacts"))


class YearlyAnalysisOrchestrator:
    """Orchestrates yearly analysis aggregation from monthly data."""

    def __init__(self) -> None:
        """Initialize orchestrator with configuration."""
        self.artifacts_dir = ARTIFACTS_DIR

    async def run_yearly_analysis(
        self,
        year: int,
        monthly_results: Optional[List[MonthlyAnalysisResult]] = None,
    ) -> YearlyAnalysisResult:
        """
        Run yearly analysis aggregation.

        Args:
            year: Year to analyze
            monthly_results: Optional pre-loaded monthly results

        Returns:
            YearlyAnalysisResult with aggregated metrics
        """
        logger.info(f"{'='*60}")
        logger.info(f"YEARLY ANALYSIS: {year}")
        logger.info(f"{'='*60}")

        started_at = datetime.now()

        if monthly_results is None:
            monthly_results = await self._load_monthly_results(year)

        result = YearlyAnalysisResult(
            year=year,
            total_months=12,
            monthly_results=monthly_results,
            started_at=started_at,
        )

        result.aggregate_from_monthly()
        result.completed_at = datetime.now()

        report_path = await generate_yearly_report(result)

        logger.info(f"{'='*60}")
        logger.info(f"YEARLY ANALYSIS COMPLETE: {year}")
        logger.info(f"Months with data: {result.completed_months}")
        logger.info(f"Total entities: {result.total_entities}")
        logger.info(f"Total net value: ${float(result.total_net_value):,.2f}")
        logger.info(f"Report: {report_path}")
        logger.info(f"{'='*60}")

        return result

    async def _load_monthly_results(self, year: int) -> List[MonthlyAnalysisResult]:
        """
        Load monthly results from artifacts directory.

        Args:
            year: Year to load

        Returns:
            List of MonthlyAnalysisResult for available months
        """
        results = []

        for month in range(1, 13):
            month_name = calendar.month_name[month]
            result = await self._load_month(year, month, month_name)
            if result:
                results.append(result)
                logger.info(f"Loaded {month_name} {year}: {result.total_entities} entities")
            else:
                logger.debug(f"No data for {month_name} {year}")

        return results

    async def _load_month(
        self, year: int, month: int, month_name: str
    ) -> Optional[MonthlyAnalysisResult]:
        """
        Load a single month's data from JSON checkpoint file.

        Args:
            year: Year
            month: Month number
            month_name: Month name

        Returns:
            MonthlyAnalysisResult if data exists
        """
        # Try JSON checkpoint first
        checkpoint_path = (
            self.artifacts_dir
            / "monthly_analysis"
            / f"{year}_{month:02d}"
            / "checkpoint.json"
        )

        if checkpoint_path.exists():
            try:
                data = json.loads(checkpoint_path.read_text())
                return MonthlyAnalysisResult(
                    year=year,
                    month=month,
                    month_name=month_name,
                    total_days=calendar.monthrange(year, month)[1],
                    **data,
                )
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Error loading checkpoint {checkpoint_path}: {e}")

        # Fallback: Create empty result if HTML exists
        html_path = (
            self.artifacts_dir / f"startup_analysis_MONTHLY_{year}_{month:02d}.html"
        )
        if html_path.exists():
            return self._create_placeholder_result(year, month, month_name)

        return None

    def _create_placeholder_result(
        self, year: int, month: int, month_name: str
    ) -> MonthlyAnalysisResult:
        """Create placeholder result when only HTML exists."""
        return MonthlyAnalysisResult(
            year=year,
            month=month,
            month_name=month_name,
            total_days=calendar.monthrange(year, month)[1],
            completed_days=0,
            is_complete=False,
        )
