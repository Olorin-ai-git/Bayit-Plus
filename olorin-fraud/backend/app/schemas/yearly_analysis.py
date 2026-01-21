"""
Yearly Analysis Schemas

Pydantic schemas for yearly aggregated analysis data structures.
Aggregates monthly results into yearly summaries.

Feature: unified-report-hierarchy
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.monthly_analysis import MonthlyAnalysisResult


class YearlyAnalysisResult(BaseModel):
    """Aggregated result for full year analysis."""

    year: int = Field(description="Year of analysis")

    # Status
    total_months: int = Field(default=12, description="Total months in year")
    completed_months: int = Field(default=0, description="Months with data")
    is_complete: bool = Field(default=False, description="Whether year is complete")

    # Monthly breakdown
    monthly_results: List[MonthlyAnalysisResult] = Field(
        default_factory=list, description="Results for each month"
    )

    # Aggregated Transaction Analysis metrics (Review Precision)
    total_tp: int = Field(default=0, description="Total True Positives")
    total_fp: int = Field(default=0, description="Total False Positives")
    total_tn: int = Field(default=0, description="Total True Negatives")
    total_fn: int = Field(default=0, description="Total False Negatives")

    # Overall Classification Metrics
    overall_total_tp: int = Field(default=0, description="Overall Total TP")
    overall_total_fp: int = Field(default=0, description="Overall Total FP")
    overall_total_tn: int = Field(default=0, description="Overall Total TN")
    overall_total_fn: int = Field(default=0, description="Overall Total FN")

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

    # Review Precision Metrics
    precision: Optional[float] = Field(default=None, description="Precision rate")
    recall: Optional[float] = Field(default=None, description="Recall rate")
    f1_score: Optional[float] = Field(default=None, description="F1 Score")
    roi_percentage: Optional[float] = Field(default=None, description="ROI %")

    # Overall Classification Metrics
    overall_precision: Optional[float] = Field(default=None)
    overall_recall: Optional[float] = Field(default=None)
    overall_f1_score: Optional[float] = Field(default=None)

    # Entity counts
    total_entities: int = Field(default=0, description="Total entities analyzed")
    total_investigations: int = Field(default=0, description="Total investigations")

    # Timing
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    def aggregate_from_monthly(self) -> None:
        """Aggregate metrics from monthly results."""
        self.completed_months = len(self.monthly_results)
        self.is_complete = self.completed_months >= self.total_months

        # Review Precision Metrics
        self.total_tp = sum(m.total_tp for m in self.monthly_results)
        self.total_fp = sum(m.total_fp for m in self.monthly_results)
        self.total_tn = sum(m.total_tn for m in self.monthly_results)
        self.total_fn = sum(m.total_fn for m in self.monthly_results)

        # Overall Classification Metrics
        self.overall_total_tp = sum(m.overall_total_tp for m in self.monthly_results)
        self.overall_total_fp = sum(m.overall_total_fp for m in self.monthly_results)
        self.overall_total_tn = sum(m.overall_total_tn for m in self.monthly_results)
        self.overall_total_fn = sum(m.overall_total_fn for m in self.monthly_results)

        # Financial metrics
        self.total_saved_fraud_gmv = sum(
            m.total_saved_fraud_gmv for m in self.monthly_results
        )
        self.total_lost_revenues = sum(
            m.total_lost_revenues for m in self.monthly_results
        )
        self.total_net_value = sum(m.total_net_value for m in self.monthly_results)

        # Entity counts
        self.total_entities = sum(m.total_entities for m in self.monthly_results)
        self.total_investigations = sum(
            len(d.investigation_ids)
            for m in self.monthly_results
            for d in m.daily_results
        )

        self._calculate_derived_metrics()

    def _calculate_derived_metrics(self) -> None:
        """Calculate precision, recall, F1, and ROI from raw metrics."""
        # Review Precision
        if self.total_tp + self.total_fp > 0:
            self.precision = self.total_tp / (self.total_tp + self.total_fp)

        if self.total_tp + self.total_fn > 0:
            self.recall = self.total_tp / (self.total_tp + self.total_fn)

        if self.precision and self.recall and (self.precision + self.recall) > 0:
            self.f1_score = (
                2 * (self.precision * self.recall) / (self.precision + self.recall)
            )

        # Overall Classification
        if self.overall_total_tp + self.overall_total_fp > 0:
            self.overall_precision = self.overall_total_tp / (
                self.overall_total_tp + self.overall_total_fp
            )

        if self.overall_total_tp + self.overall_total_fn > 0:
            self.overall_recall = self.overall_total_tp / (
                self.overall_total_tp + self.overall_total_fn
            )

        if (
            self.overall_precision
            and self.overall_recall
            and (self.overall_precision + self.overall_recall) > 0
        ):
            self.overall_f1_score = (
                2
                * (self.overall_precision * self.overall_recall)
                / (self.overall_precision + self.overall_recall)
            )

        # ROI
        if self.total_lost_revenues > 0:
            self.roi_percentage = float(
                (self.total_net_value / self.total_lost_revenues) * 100
            )

    class Config:
        """Pydantic config."""

        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }
