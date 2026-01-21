"""
Monthly Analysis API Schemas

Pydantic schemas for monthly analysis API request/response models.
Used for the frontend-triggered monthly flow feature.

Feature: monthly-frontend-trigger
"""

import os
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, validator


class MonthlyAnalysisRunStatus(str, Enum):
    """Status of a monthly analysis run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MonthlyAnalysisTriggerRequest(BaseModel):
    """Request to trigger a new monthly analysis run."""

    year: int = Field(
        description="Target year for analysis",
        ge=int(os.getenv("MONTHLY_ANALYSIS_MIN_YEAR", "2020")),
        le=int(os.getenv("MONTHLY_ANALYSIS_MAX_YEAR", "2030")),
    )
    month: int = Field(
        description="Target month (1-12)",
        ge=1,
        le=12,
    )
    resume_from_day: int = Field(
        default=1,
        description="Day to start/resume from (1-31)",
        ge=1,
        le=31,
    )
    top_percentage: Optional[float] = Field(
        default=None,
        description="Override top percentage of entities to analyze",
        ge=0.01,
        le=1.0,
    )
    time_window_hours: Optional[int] = Field(
        default=None,
        description="Override time window in hours",
        ge=1,
        le=168,
    )
    include_blindspot_analysis: bool = Field(
        default=True,
        description="Run blindspot analysis after monthly flow",
    )


class MonthlyAnalysisProgressMetrics(BaseModel):
    """Progress metrics for an in-progress monthly analysis."""

    current_day: int = Field(description="Current day being processed")
    total_days: int = Field(description="Total days to process")
    days_completed: int = Field(description="Number of days completed")
    progress_percentage: float = Field(description="Overall progress (0-100)")
    entities_processed: int = Field(default=0, description="Total entities processed")
    investigations_created: int = Field(
        default=0, description="Total investigations created"
    )


class MonthlyAnalysisStatusResponse(BaseModel):
    """Response containing status of a monthly analysis run."""

    run_id: str = Field(description="Unique identifier for this run")
    status: MonthlyAnalysisRunStatus = Field(description="Current run status")
    year: int = Field(description="Analysis year")
    month: int = Field(description="Analysis month (1-12)")
    month_name: str = Field(description="Full month name")
    started_at: datetime = Field(description="When the run started")
    updated_at: datetime = Field(description="When status was last updated")
    completed_at: Optional[datetime] = Field(
        default=None, description="When the run completed"
    )
    progress: Optional[MonthlyAnalysisProgressMetrics] = Field(
        default=None, description="Progress metrics (if running)"
    )
    error_message: Optional[str] = Field(
        default=None, description="Error message (if failed)"
    )
    triggered_by: Optional[str] = Field(
        default=None, description="User who triggered the run"
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class DailyResultSummary(BaseModel):
    """Summary of a single day's analysis result."""

    day: int = Field(description="Day of month")
    date: str = Field(description="Full date string (YYYY-MM-DD)")
    entities_analyzed: int = Field(description="Entities analyzed this day")
    investigations_count: int = Field(description="Investigations created")
    tp: int = Field(default=0, description="True Positives")
    fp: int = Field(default=0, description="False Positives")
    tn: int = Field(default=0, description="True Negatives")
    fn: int = Field(default=0, description="False Negatives")
    net_value: float = Field(default=0.0, description="Net value for the day")
    duration_seconds: Optional[float] = Field(
        default=None, description="Processing time"
    )


class MonthlyAnalysisMetrics(BaseModel):
    """Aggregated metrics for a completed monthly analysis."""

    total_entities: int = Field(description="Total entities analyzed")
    total_investigations: int = Field(description="Total investigations created")
    total_tp: int = Field(default=0, description="Total True Positives")
    total_fp: int = Field(default=0, description="Total False Positives")
    total_tn: int = Field(default=0, description="Total True Negatives")
    total_fn: int = Field(default=0, description="Total False Negatives")
    precision: Optional[float] = Field(default=None, description="Precision rate")
    recall: Optional[float] = Field(default=None, description="Recall rate")
    f1_score: Optional[float] = Field(default=None, description="F1 Score")
    total_saved_fraud_gmv: float = Field(
        default=0.0, description="Total saved fraud GMV"
    )
    total_lost_revenues: float = Field(default=0.0, description="Total lost revenues")
    total_net_value: float = Field(default=0.0, description="Total net value")
    roi_percentage: Optional[float] = Field(default=None, description="ROI percentage")


class MonthlyAnalysisResultsResponse(BaseModel):
    """Full results of a completed monthly analysis run."""

    run_id: str = Field(description="Unique run identifier")
    status: MonthlyAnalysisRunStatus = Field(description="Run status")
    year: int = Field(description="Analysis year")
    month: int = Field(description="Analysis month")
    month_name: str = Field(description="Full month name")
    started_at: datetime = Field(description="When the run started")
    completed_at: Optional[datetime] = Field(
        default=None, description="When the run completed"
    )
    metrics: Optional[MonthlyAnalysisMetrics] = Field(
        default=None, description="Aggregated metrics"
    )
    daily_results: List[DailyResultSummary] = Field(
        default_factory=list, description="Results for each day"
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v),
        }


class MonthlyAnalysisHistoryItem(BaseModel):
    """Summary item for history listing."""

    run_id: str = Field(description="Unique run identifier")
    year: int = Field(description="Analysis year")
    month: int = Field(description="Analysis month")
    month_name: str = Field(description="Full month name")
    status: MonthlyAnalysisRunStatus = Field(description="Run status")
    started_at: datetime = Field(description="When the run started")
    completed_at: Optional[datetime] = Field(
        default=None, description="When the run completed"
    )
    days_completed: int = Field(default=0, description="Days completed")
    total_days: int = Field(description="Total days in month")
    total_entities: int = Field(default=0, description="Total entities analyzed")
    triggered_by: Optional[str] = Field(
        default=None, description="User who triggered"
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class MonthlyAnalysisHistoryResponse(BaseModel):
    """Paginated history of monthly analysis runs."""

    runs: List[MonthlyAnalysisHistoryItem] = Field(
        default_factory=list, description="List of runs"
    )
    total: int = Field(description="Total number of runs")
    page: int = Field(default=1, description="Current page")
    page_size: int = Field(default=20, description="Items per page")
    has_more: bool = Field(default=False, description="More items available")


class ReportLink(BaseModel):
    """Link to a generated report."""

    report_type: str = Field(description="Type of report (html, csv, pdf)")
    url: str = Field(description="Download URL")
    filename: str = Field(description="Suggested filename")
    generated_at: datetime = Field(description="When report was generated")
    size_bytes: Optional[int] = Field(default=None, description="File size")


class MonthlyAnalysisReportsResponse(BaseModel):
    """Available reports for a completed run."""

    run_id: str = Field(description="Run identifier")
    reports: List[ReportLink] = Field(
        default_factory=list, description="Available reports"
    )


class BlindspotAnalysisTriggerRequest(BaseModel):
    """Request to trigger standalone blindspot analysis."""

    start_date: Optional[datetime] = Field(
        default=None, description="Start date for analysis scope"
    )
    end_date: Optional[datetime] = Field(
        default=None, description="End date for analysis scope"
    )
    export_csv: bool = Field(default=True, description="Export results to CSV")


class BlindspotAnalysisResponse(BaseModel):
    """Response from blindspot analysis."""

    status: str = Field(description="Analysis status")
    blindspots_count: int = Field(default=0, description="Number of blindspots found")
    csv_path: Optional[str] = Field(default=None, description="Path to exported CSV")
    analysis_period: Optional[str] = Field(
        default=None, description="Analysis period description"
    )


class CancelRunResponse(BaseModel):
    """Response after cancelling a run."""

    run_id: str = Field(description="Run identifier")
    status: MonthlyAnalysisRunStatus = Field(description="New status (cancelled)")
    message: str = Field(description="Cancellation message")
    cancelled_at: datetime = Field(description="When the run was cancelled")

    class Config:
        """Pydantic config."""

        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }
