#!/usr/bin/env python3
"""
Monthly Analysis Runner

Runs the auto-comparison analysis for each day of a specified month.
Generates incremental HTML reports for each day and an updated monthly summary.

Reads configuration from environment variables:
  - MONTHLY_ANALYSIS_ENABLED: Master switch (true/false)
  - MONTHLY_ANALYSIS_YEAR: Target year (e.g., 2024)
  - MONTHLY_ANALYSIS_MONTH: Target month (1-12)
  - MONTHLY_ANALYSIS_RESUME_FROM_DAY: Day to start/resume from (1-31)

Usage:
  poetry run python scripts/run_monthly_analysis.py
"""

import asyncio
import calendar
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.service.investigation.monthly_analysis_orchestrator import (
    MonthlyAnalysisOrchestrator,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MonthlyAnalysisConfig:
    """Configuration for monthly analysis from environment."""

    def __init__(self) -> None:
        self.enabled = os.getenv("MONTHLY_ANALYSIS_ENABLED", "true").lower() == "true"
        self.year = int(os.getenv("MONTHLY_ANALYSIS_YEAR", datetime.now().year))
        self.month = int(os.getenv("MONTHLY_ANALYSIS_MONTH", datetime.now().month))
        self.resume_from_day = int(os.getenv("MONTHLY_ANALYSIS_RESUME_FROM_DAY", "1"))

    def validate(self) -> bool:
        if not self.enabled:
            return False
        if not (1 <= self.month <= 12):
            logger.error(f"Invalid month: {self.month}")
            return False
        days_in_month = calendar.monthrange(self.year, self.month)[1]
        if not (1 <= self.resume_from_day <= days_in_month):
            logger.error(f"Invalid resume day: {self.resume_from_day}")
            return False
        return True


async def run_monthly_analysis() -> dict:
    """Run analysis for each day in the configured month."""
    config = MonthlyAnalysisConfig()

    if not config.validate():
        logger.error("Monthly analysis is disabled or misconfigured")
        return {"status": "skipped", "reason": "disabled or invalid configuration"}

    orchestrator = MonthlyAnalysisOrchestrator()

    result = await orchestrator.run_monthly_analysis(
        year=config.year,
        month=config.month,
        resume_from_day=config.resume_from_day,
    )

    return {
        "status": "completed",
        "year": result.year,
        "month": result.month,
        "days_processed": result.completed_days,
        "total_entities": result.total_entities,
        "precision": result.precision,
        "recall": result.recall,
        "f1_score": result.f1_score,
    }


def main() -> None:
    """Entry point for monthly analysis."""
    print()
    print("=" * 60)
    print("MONTHLY ANALYSIS RUNNER (HTML Reports)")
    print("=" * 60)
    print()

    config = MonthlyAnalysisConfig()
    print(f"Configuration:")
    print(f"  Enabled: {config.enabled}")
    print(f"  Year: {config.year}")
    print(f"  Month: {config.month} ({calendar.month_name[config.month]})")
    print(f"  Resume from day: {config.resume_from_day}")
    print()

    if not config.enabled:
        print("Monthly analysis is DISABLED.")
        print("Set MONTHLY_ANALYSIS_ENABLED=true in .env to enable.")
        sys.exit(0)

    result = asyncio.run(run_monthly_analysis())

    if result.get("status") == "skipped":
        print(f"Skipped: {result.get('reason')}")
        sys.exit(1)

    print()
    print("=" * 60)
    print("MONTHLY ANALYSIS COMPLETED")
    print("=" * 60)
    print(f"  Days processed: {result.get('days_processed')}")
    print(f"  Total entities: {result.get('total_entities')}")
    print(f"  Precision: {result.get('precision'):.2%}" if result.get('precision') else "  Precision: N/A")
    print(f"  Recall: {result.get('recall'):.2%}" if result.get('recall') else "  Recall: N/A")
    print(f"  F1 Score: {result.get('f1_score'):.2%}" if result.get('f1_score') else "  F1 Score: N/A")
    print()
    print("HTML reports generated in: artifacts/monthly_analysis/")


if __name__ == "__main__":
    main()
