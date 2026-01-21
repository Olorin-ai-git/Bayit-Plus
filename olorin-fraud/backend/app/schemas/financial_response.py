"""
Financial Analysis API Response Schemas

Pydantic schemas for financial metrics API responses.

Feature: 025-financial-analysis-frontend
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    """Confidence level for revenue calculations based on transaction volume."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RevenueMetricsResponse(BaseModel):
    """Revenue metrics for a single investigation."""

    saved_fraud_gmv: Decimal = Field(description="GMV saved by detecting fraud")
    lost_revenues: Decimal = Field(
        description="Revenue lost from false positive blocks"
    )
    net_value: Decimal = Field(description="Net value (savedFraudGmv - lostRevenues)")
    confidence_level: ConfidenceLevel = Field(
        description="Confidence based on transaction volume"
    )
    approved_fraud_tx_count: int = Field(
        ge=0, description="Number of approved fraud transactions"
    )
    blocked_legit_tx_count: int = Field(
        ge=0, description="Number of blocked legitimate transactions"
    )
    total_tx_count: int = Field(ge=0, description="Total transactions analyzed")
    calculation_successful: bool = Field(
        description="Whether calculation completed successfully"
    )
    error_message: Optional[str] = Field(
        default=None, description="Error message if calculation failed"
    )
    skipped_due_to_prediction: bool = Field(
        description="True if skipped because entity not predicted as fraud"
    )

    class Config:
        use_enum_values = True
        json_encoders = {Decimal: lambda v: float(v)}


class ConfusionMetricsResponse(BaseModel):
    """Confusion matrix metrics from investigation comparison."""

    true_positives: int = Field(ge=0)
    false_positives: int = Field(ge=0)
    true_negatives: int = Field(ge=0)
    false_negatives: int = Field(ge=0)
    precision: float = Field(ge=0, le=1)
    recall: float = Field(ge=0, le=1)
    f1_score: float = Field(ge=0, le=1)
    accuracy: float = Field(ge=0, le=1)


class FinancialMetricsResponse(BaseModel):
    """Response from GET /api/v1/financial/{investigation_id}/metrics."""

    investigation_id: str
    revenue_metrics: Optional[RevenueMetricsResponse] = None
    confusion_metrics: Optional[ConfusionMetricsResponse] = None
    calculated_at: datetime

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), Decimal: lambda v: float(v)}


class AggregateConfusionMatrix(BaseModel):
    """Aggregated confusion matrix totals."""

    total_tp: int = Field(ge=0)
    total_fp: int = Field(ge=0)
    total_tn: int = Field(ge=0)
    total_fn: int = Field(ge=0)
    avg_precision: float = Field(ge=0, le=1)
    avg_recall: float = Field(ge=0, le=1)


class FinancialSummary(BaseModel):
    """Aggregated financial summary across multiple investigations."""

    total_saved_fraud_gmv: Decimal
    total_lost_revenues: Decimal
    total_net_value: Decimal
    aggregate_confusion_matrix: Optional[AggregateConfusionMatrix] = None
    investigation_count: int = Field(ge=0)
    successful_calculations: int = Field(ge=0)
    failed_calculations: int = Field(ge=0)
    aggregated_at: datetime

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), Decimal: lambda v: float(v)}


class InvestigationStatus(BaseModel):
    """Status of a single investigation in summary response."""

    investigation_id: str
    status: str = Field(description="success, failed, or skipped")
    error_message: Optional[str] = None


class FinancialSummaryResponse(BaseModel):
    """Response from GET /api/v1/financial/summary."""

    summary: FinancialSummary
    investigations: List[InvestigationStatus]
