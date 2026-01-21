"""
Monthly Analysis Schemas

Pydantic schemas for monthly sequential analysis data structures.

Feature: monthly-sequential-analysis
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class DailyAnalysisResult(BaseModel):
    """Result of a single day's analysis within monthly sequential run."""

    date: datetime = Field(description="The date of this analysis window")
    day_of_month: int = Field(description="Day number (1-31)")

    # Entity counts
    entities_expected: int = Field(
        default=0, description="Total number of entities expected for this day"
    )
    entities_discovered: int = Field(
        default=0, description="Number of entities analyzed this day"
    )

    # Review Precision Metrics (only_flagged=True - transactions above threshold)
    tp: int = Field(default=0, description="Review True Positives (flagged transactions only)")
    fp: int = Field(default=0, description="Review False Positives (flagged transactions only)")
    tn: int = Field(default=0, description="Review True Negatives (flagged transactions only)")
    fn: int = Field(default=0, description="Review False Negatives (flagged transactions only)")

    # Overall Classification Metrics (only_flagged=False - all transactions)
    overall_tp: int = Field(default=0, description="Overall True Positives (all transactions)")
    overall_fp: int = Field(default=0, description="Overall False Positives (all transactions)")
    overall_tn: int = Field(default=0, description="Overall True Negatives (all transactions)")
    overall_fn: int = Field(default=0, description="Overall False Negatives (all transactions)")

    # Financial metrics
    saved_fraud_gmv: Decimal = Field(
        default=Decimal("0"), description="Saved Fraud GMV for this day"
    )
    lost_revenues: Decimal = Field(
        default=Decimal("0"), description="Lost Revenues for this day"
    )
    net_value: Decimal = Field(
        default=Decimal("0"), description="Net Value for this day"
    )

    # Vendor breakdown
    vendor_gmv_breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Net GMV breakdown by vendor/merchant name"
    )

    # References
    investigation_ids: List[str] = Field(
        default_factory=list, description="Investigation IDs created this day"
    )
    entity_values: List[str] = Field(
        default_factory=list, description="Entity values (emails) for investigated entities"
    )

    # Timing
    started_at: Optional[datetime] = Field(
        default=None, description="When processing started"
    )
    completed_at: Optional[datetime] = Field(
        default=None, description="When processing completed"
    )
    duration_seconds: Optional[float] = Field(
        default=None, description="Processing duration in seconds"
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class MonthlyAnalysisResult(BaseModel):
    """Aggregated result for full month analysis."""

    year: int = Field(description="Year of analysis")
    month: int = Field(description="Month of analysis (1-12)")
    month_name: str = Field(description="Full month name")

    # Status
    total_days: int = Field(description="Total days in month")
    completed_days: int = Field(default=0, description="Days completed")
    is_complete: bool = Field(default=False, description="Whether month is complete")

    # Daily breakdown
    daily_results: List[DailyAnalysisResult] = Field(
        default_factory=list, description="Results for each day"
    )

    # Aggregated confusion matrix
    total_tp: int = Field(default=0, description="Total True Positives")
    total_fp: int = Field(default=0, description="Total False Positives")
    total_tn: int = Field(default=0, description="Total True Negatives")
    total_fn: int = Field(default=0, description="Total False Negatives")

    # Aggregated financial metrics
    total_saved_fraud_gmv: Decimal = Field(
        default=Decimal("0"), description="Total Saved Fraud GMV"
    )
    total_lost_revenues: Decimal = Field(
        default=Decimal("0"), description="Total Lost Revenues"
    )
    total_net_value: Decimal = Field(
        default=Decimal("0"), description="Total Net Value"
    )

    # Review Precision Metrics (only_flagged=True)
    precision: Optional[float] = Field(default=None, description="Review Precision rate (flagged transactions only)")
    recall: Optional[float] = Field(default=None, description="Recall rate")
    f1_score: Optional[float] = Field(default=None, description="F1 Score")
    roi_percentage: Optional[float] = Field(default=None, description="ROI percentage")

    # Overall Classification Metrics (only_flagged=False - all transactions)
    overall_total_tp: int = Field(default=0, description="Overall Total True Positives (all transactions)")
    overall_total_fp: int = Field(default=0, description="Overall Total False Positives (all transactions)")
    overall_total_tn: int = Field(default=0, description="Overall Total True Negatives (all transactions)")
    overall_total_fn: int = Field(default=0, description="Overall Total False Negatives (all transactions)")
    overall_precision: Optional[float] = Field(default=None, description="Overall Precision rate (all transactions)")
    overall_recall: Optional[float] = Field(default=None, description="Overall Recall rate (all transactions)")
    overall_f1_score: Optional[float] = Field(default=None, description="Overall F1 Score (all transactions)")

    # Entity counts
    total_entities: int = Field(
        default=0, description="Total entities analyzed across month"
    )

    # Timing
    started_at: Optional[datetime] = Field(
        default=None, description="When monthly analysis started"
    )
    completed_at: Optional[datetime] = Field(
        default=None, description="When monthly analysis completed"
    )

    def calculate_derived_metrics(self) -> None:
        """Calculate precision, recall, F1, and ROI from raw metrics (both review and overall)."""
        # Review Precision Metrics: TP / (TP + FP)
        if self.total_tp + self.total_fp > 0:
            self.precision = self.total_tp / (self.total_tp + self.total_fp)

        # Recall: TP / (TP + FN)
        if self.total_tp + self.total_fn > 0:
            self.recall = self.total_tp / (self.total_tp + self.total_fn)

        # F1 Score: 2 * (Precision * Recall) / (Precision + Recall)
        if self.precision and self.recall and (self.precision + self.recall) > 0:
            self.f1_score = (
                2 * (self.precision * self.recall) / (self.precision + self.recall)
            )

        # Overall Classification Metrics
        if self.overall_total_tp + self.overall_total_fp > 0:
            self.overall_precision = self.overall_total_tp / (self.overall_total_tp + self.overall_total_fp)

        if self.overall_total_tp + self.overall_total_fn > 0:
            self.overall_recall = self.overall_total_tp / (self.overall_total_tp + self.overall_total_fn)

        if self.overall_precision and self.overall_recall and (self.overall_precision + self.overall_recall) > 0:
            self.overall_f1_score = (
                2 * (self.overall_precision * self.overall_recall) / (self.overall_precision + self.overall_recall)
            )

        # ROI: (Net Value / Lost Revenues) * 100
        if self.total_lost_revenues > 0:
            self.roi_percentage = float(
                (self.total_net_value / self.total_lost_revenues) * 100
            )

    def aggregate_from_daily(self) -> None:
        """Aggregate metrics from daily results."""
        self.completed_days = len(self.daily_results)
        self.is_complete = self.completed_days >= self.total_days

        # Review Precision Metrics (flagged-only)
        self.total_tp = sum(d.tp for d in self.daily_results)
        self.total_fp = sum(d.fp for d in self.daily_results)
        self.total_tn = sum(d.tn for d in self.daily_results)
        self.total_fn = sum(d.fn for d in self.daily_results)

        # Overall Classification Metrics (all transactions)
        self.overall_total_tp = sum(d.overall_tp for d in self.daily_results)
        self.overall_total_fp = sum(d.overall_fp for d in self.daily_results)
        self.overall_total_tn = sum(d.overall_tn for d in self.daily_results)
        self.overall_total_fn = sum(d.overall_fn for d in self.daily_results)

        self.total_saved_fraud_gmv = sum(
            d.saved_fraud_gmv for d in self.daily_results
        )
        self.total_lost_revenues = sum(d.lost_revenues for d in self.daily_results)
        self.total_net_value = sum(d.net_value for d in self.daily_results)

        self.total_entities = sum(d.entities_discovered for d in self.daily_results)

        self.calculate_derived_metrics()

    class Config:
        """Pydantic config."""

        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class MonthlyAnalysisState(BaseModel):
    """Checkpoint state for resumable monthly analysis."""

    year: int = Field(description="Year being analyzed")
    month: int = Field(description="Month being analyzed (1-12)")
    last_completed_day: int = Field(
        default=0, description="Last successfully completed day"
    )

    # Timing
    started_at: datetime = Field(description="When analysis started")
    updated_at: datetime = Field(description="When checkpoint was last updated")

    # Accumulated results
    daily_results: List[DailyAnalysisResult] = Field(
        default_factory=list, description="Results for completed days"
    )

    # Status
    is_complete: bool = Field(default=False, description="Whether analysis finished")
    error_message: Optional[str] = Field(
        default=None, description="Error message if failed"
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }
