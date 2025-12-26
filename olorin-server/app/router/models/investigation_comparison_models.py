"""
Investigation Comparison Models

Pydantic models for investigation comparison API endpoints.
Used for OpenAPI schema generation and frontend TypeScript type generation.

Constitutional Compliance:
- All validation from Pydantic validators, no hardcoded business logic
- Datetime handling using ISO 8601 standard format
- Examples from configuration or auto-generated
- No mocks, stubs, or placeholders
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator


class WindowPreset(str, Enum):
    """Window preset types for comparison."""

    RECENT_14D = "recent_14d"
    RETRO_14D_6MO_BACK = "retro_14d_6mo_back"
    CUSTOM = "custom"


class WindowSpec(BaseModel):
    """Specification for a time window in comparison."""

    preset: WindowPreset = Field(..., description="Window preset type")
    start: Optional[datetime] = Field(
        None,
        description="Custom start time (ISO 8601) - required if preset is 'custom'",
    )
    end: Optional[datetime] = Field(
        None, description="Custom end time (ISO 8601) - required if preset is 'custom'"
    )
    label: Optional[str] = Field(None, description="Custom label for the window")

    @field_validator("start", "end", mode="after")
    @classmethod
    def validate_custom_window(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validate custom window requires both start and end, and end > start."""
        preset = info.data.get("preset")
        if preset == WindowPreset.CUSTOM:
            if info.field_name == "start" and v is None:
                raise ValueError("start is required when preset is 'custom'")
            if info.field_name == "end" and v is None:
                raise ValueError("end is required when preset is 'custom'")

            # Validate end > start
            if info.field_name == "end" and v is not None:
                start = info.data.get("start")
                if start is not None and v <= start:
                    raise ValueError("end must be after start when preset is 'custom'")
        return v


class ComparisonOptions(BaseModel):
    """Options for comparison computation."""

    include_per_merchant: bool = Field(
        True, description="Include per-merchant breakdown"
    )
    max_merchants: int = Field(
        25, ge=1, le=1000, description="Maximum number of merchants in breakdown"
    )
    include_histograms: bool = Field(False, description="Include risk histogram data")
    include_timeseries: bool = Field(False, description="Include daily timeseries data")


class InvestigationComparisonRequest(BaseModel):
    """Request model for investigation-level comparison."""

    investigation_id_a: str = Field(
        ..., description="First investigation ID to compare"
    )
    investigation_id_b: str = Field(
        ..., description="Second investigation ID to compare"
    )


class ComparisonRequest(BaseModel):
    """Request model for investigation comparison."""

    entity: Optional[Dict[str, str]] = Field(
        None,
        description="Entity filter: {'type': 'email', 'value': 'user@example.com'}",
    )
    windowA: WindowSpec = Field(..., description="Window A specification")
    windowB: WindowSpec = Field(..., description="Window B specification")
    risk_threshold: float = Field(
        0.7,
        ge=0.0,
        le=1.0,
        description="Risk threshold for predicted_label calculation",
    )
    merchant_ids: Optional[List[str]] = Field(
        None, description="Optional list of merchant IDs to filter"
    )
    options: Optional[ComparisonOptions] = Field(None, description="Comparison options")


class ConfusionMatrix(BaseModel):
    """Confusion matrix metrics for a single entity investigation."""

    entity_type: str = Field(
        ..., description="Entity type (e.g., 'email', 'device_id', 'ip')"
    )
    entity_id: str = Field(..., description="Entity identifier")
    investigation_id: Optional[str] = Field(
        None, description="Investigation ID if available"
    )

    TP: int = Field(
        0, ge=0, description="True Positives: predicted Fraud AND IS_FRAUD_TX = 1"
    )
    FP: int = Field(
        0, ge=0, description="False Positives: predicted Fraud AND IS_FRAUD_TX = 0"
    )
    TN: int = Field(
        0, ge=0, description="True Negatives: predicted Not Fraud AND IS_FRAUD_TX = 0"
    )
    FN: int = Field(
        0, ge=0, description="False Negatives: predicted Not Fraud AND IS_FRAUD_TX = 1"
    )

    excluded_count: int = Field(
        0,
        ge=0,
        description="Transactions with NULL IS_FRAUD_TX excluded from confusion matrix",
    )

    # Review Precision Metrics (only_flagged=True - transactions above threshold)
    precision: float = Field(
        0.0, ge=0.0, le=1.0, description="Review Precision: TP / (TP + FP) for flagged transactions only, or 0.0 if TP + FP = 0"
    )
    recall: float = Field(
        0.0, ge=0.0, le=1.0, description="TP / (TP + FN), or 0.0 if TP + FN = 0"
    )
    f1_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="2 * (precision * recall) / (precision + recall), or 0.0 if precision + recall = 0",
    )
    accuracy: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="(TP + TN) / (TP + FP + TN + FN), or 0.0 if total = 0",
    )

    # Overall Classification Metrics (only_flagged=False - all transactions)
    overall_TP: int = Field(
        0, ge=0, description="Overall True Positives: includes all transactions"
    )
    overall_FP: int = Field(
        0, ge=0, description="Overall False Positives: includes all transactions"
    )
    overall_TN: int = Field(
        0, ge=0, description="Overall True Negatives: includes all transactions"
    )
    overall_FN: int = Field(
        0, ge=0, description="Overall False Negatives: includes all transactions"
    )
    overall_precision: float = Field(
        0.0, ge=0.0, le=1.0, description="Overall Precision: TP / (TP + FP) for ALL transactions, or 0.0 if TP + FP = 0"
    )
    overall_recall: float = Field(
        0.0, ge=0.0, le=1.0, description="Overall Recall: TP / (TP + FN) for ALL transactions, or 0.0 if TP + FN = 0"
    )
    overall_f1_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Overall F1: 2 * (precision * recall) / (precision + recall) for ALL transactions, or 0.0 if precision + recall = 0",
    )
    overall_accuracy: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Overall Accuracy: (TP + TN) / (TP + FP + TN + FN) for ALL transactions, or 0.0 if total = 0",
    )

    investigation_risk_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Risk score from investigation"
    )
    risk_threshold: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Threshold used for classification (RISK_THRESHOLD_DEFAULT)",
    )
    total_transactions: int = Field(
        0, ge=0, description="Total transactions in investigation window"
    )

    window_start: datetime = Field(..., description="Investigation window start time")
    window_end: datetime = Field(..., description="Investigation window end time")


class HistogramBin(BaseModel):
    """Risk histogram bin."""

    bin: str = Field(..., description="Bin range (e.g., '0-0.1')")
    n: int = Field(0, ge=0, description="Count in bin")


class TimeseriesDaily(BaseModel):
    """Daily timeseries data point."""

    date: str = Field(..., description="Date (YYYY-MM-DD)")
    count: int = Field(0, ge=0, description="Transaction count")
    TP: Optional[int] = Field(None, ge=0, description="True Positives")
    FP: Optional[int] = Field(None, ge=0, description="False Positives")
    TN: Optional[int] = Field(None, ge=0, description="True Negatives")
    FN: Optional[int] = Field(None, ge=0, description="False Negatives")


class ConfidenceInterval(BaseModel):
    """Confidence interval tuple."""

    lower: float = Field(..., ge=0.0, le=1.0)
    upper: float = Field(..., ge=0.0, le=1.0)


class SupportMetrics(BaseModel):
    """Support metrics for power assessment."""

    known_transactions: int = Field(0, ge=0)
    predicted_positives: int = Field(0, ge=0)
    actual_frauds: int = Field(0, ge=0)


class PowerAssessment(BaseModel):
    """Power/stability assessment."""

    status: str = Field(..., description="'stable' or 'low_power'")
    reasons: List[str] = Field(
        default_factory=list, description="Reasons for low power status"
    )


class WindowMetrics(BaseModel):
    """Metrics for a single window."""

    total_transactions: int = Field(0, ge=0)
    over_threshold: int = Field(0, ge=0)
    TP: int = Field(0, ge=0)
    FP: int = Field(0, ge=0)
    TN: int = Field(0, ge=0)
    FN: int = Field(0, ge=0)
    precision: float = Field(0.0, ge=0.0, le=1.0)
    recall: float = Field(0.0, ge=0.0, le=1.0)
    f1: float = Field(0.0, ge=0.0, le=1.0)
    accuracy: float = Field(0.0, ge=0.0, le=1.0)
    fraud_rate: float = Field(0.0, ge=0.0, le=1.0)
    pending_label_count: Optional[int] = Field(None, ge=0)
    brier: Optional[float] = Field(
        None, ge=0.0, description="Brier score for calibration (lower is better)"
    )
    log_loss: Optional[float] = Field(
        None, ge=0.0, description="Log loss for calibration (lower is better)"
    )
    source: Optional[str] = Field(
        None, description="Investigation ID or 'fallback' if no investigation"
    )
    ci: Optional[Dict[str, Optional[Tuple[float, float]]]] = Field(
        None, description="Confidence intervals for precision, recall, accuracy"
    )
    support: Optional[SupportMetrics] = Field(
        None, description="Support metrics for power assessment"
    )
    power: Optional[PowerAssessment] = Field(
        None, description="Power/stability assessment"
    )
    risk_histogram: Optional[List[HistogramBin]] = None
    timeseries_daily: Optional[List[TimeseriesDaily]] = None


class AutoExpandMetadata(BaseModel):
    """Metadata about window auto-expansion."""

    expanded: bool = Field(..., description="Whether window was expanded")
    attempts: List[int] = Field(..., description="[original_days, effective_days]")
    reasons: List[str] = Field(
        default_factory=list, description="Reasons expansion stopped"
    )
    effective_support: Optional[Dict[str, int]] = Field(
        None, description="Support metrics after expansion"
    )


class WindowInfo(BaseModel):
    """Window information with computed dates."""

    label: str = Field(..., description="Window label")
    start: str = Field(..., description="Start date (ISO 8601)")
    end: str = Field(..., description="End date (ISO 8601)")
    auto_expand_meta: Optional[AutoExpandMetadata] = Field(
        None, description="Metadata about auto-expansion if enabled"
    )


class DeltaMetrics(BaseModel):
    """Delta metrics (B - A)."""

    precision: float = Field(0.0, description="Delta precision")
    recall: float = Field(0.0, description="Delta recall")
    f1: float = Field(0.0, description="Delta F1")
    accuracy: float = Field(0.0, description="Delta accuracy")
    fraud_rate: float = Field(0.0, description="Delta fraud rate")
    psi_predicted_risk: Optional[float] = Field(
        None, description="PSI statistic for predicted_risk distribution drift"
    )
    ks_stat_predicted_risk: Optional[float] = Field(
        None, description="KS statistic for predicted_risk distribution comparison"
    )


class PerMerchantMetrics(BaseModel):
    """Per-merchant comparison metrics."""

    merchant_id: str = Field(..., description="Merchant ID")
    A: Dict[str, Any] = Field(..., description="Window A metrics")
    B: Dict[str, Any] = Field(..., description="Window B metrics")
    delta: Dict[str, float] = Field(..., description="Delta metrics")


class FraudClassification(BaseModel):
    """Fraud classification result for a transaction."""

    transaction_id: str = Field(..., description="Transaction identifier")
    predicted_label: str = Field(
        ..., description="Predicted label: 'Fraud' or 'Not Fraud'"
    )
    predicted_risk: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Investigation risk score"
    )
    actual_label: Optional[str] = Field(
        None,
        description="Actual label from IS_FRAUD_TX: 'Fraud' or 'Not Fraud', or None if NULL",
    )
    actual_outcome: Optional[int] = Field(
        None, description="IS_FRAUD_TX value: 1, 0, or None"
    )
    confusion_category: Optional[str] = Field(
        None,
        description="Confusion category: 'TP', 'FP', 'TN', 'FN', or None if excluded",
    )


class AggregatedConfusionMatrix(BaseModel):
    """Aggregated confusion matrix metrics across multiple entities."""

    total_TP: int = Field(0, ge=0, description="Sum of TP across all entities")
    total_FP: int = Field(0, ge=0, description="Sum of FP across all entities")
    total_TN: int = Field(0, ge=0, description="Sum of TN across all entities")
    total_FN: int = Field(0, ge=0, description="Sum of FN across all entities")
    total_excluded: int = Field(
        0, ge=0, description="Sum of excluded transactions across all entities"
    )

    # Review Precision Metrics (only_flagged=True)
    aggregated_precision: float = Field(
        0.0, ge=0.0, le=1.0, description="Review Precision: total_TP / (total_TP + total_FP) for flagged transactions only"
    )
    aggregated_recall: float = Field(
        0.0, ge=0.0, le=1.0, description="total_TP / (total_TP + total_FN)"
    )
    aggregated_f1_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="2 * (precision * recall) / (precision + recall)",
    )
    aggregated_accuracy: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="(total_TP + total_TN) / (total_TP + total_FP + total_TN + total_FN)",
    )

    # Overall Classification Metrics (only_flagged=False - all transactions)
    overall_total_TP: int = Field(0, ge=0, description="Overall sum of TP across all entities (all transactions)")
    overall_total_FP: int = Field(0, ge=0, description="Overall sum of FP across all entities (all transactions)")
    overall_total_TN: int = Field(0, ge=0, description="Overall sum of TN across all entities (all transactions)")
    overall_total_FN: int = Field(0, ge=0, description="Overall sum of FN across all entities (all transactions)")
    overall_aggregated_precision: float = Field(
        0.0, ge=0.0, le=1.0, description="Overall Precision: total_TP / (total_TP + total_FP) for ALL transactions"
    )
    overall_aggregated_recall: float = Field(
        0.0, ge=0.0, le=1.0, description="Overall Recall: total_TP / (total_TP + total_FN) for ALL transactions"
    )
    overall_aggregated_f1_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Overall F1: 2 * (precision * recall) / (precision + recall) for ALL transactions",
    )
    overall_aggregated_accuracy: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Overall Accuracy: (total_TP + total_TN) / (total_TP + total_FP + total_TN + total_FN) for ALL transactions",
    )

    entity_matrices: List[ConfusionMatrix] = Field(
        default_factory=list, description="Individual entity confusion matrices"
    )

    entity_count: int = Field(0, ge=0, description="Number of entities analyzed")
    risk_threshold: float = Field(
        ..., ge=0.0, le=1.0, description="Threshold used for classification"
    )
    calculation_timestamp: datetime = Field(
        ..., description="When metrics were calculated"
    )


class ComparisonResponse(BaseModel):
    """Response model for investigation comparison."""

    entity: Optional[Dict[str, str]] = Field(None, description="Entity filter used")
    threshold: float = Field(..., description="Risk threshold used")
    windowA: WindowInfo = Field(..., description="Window A information")
    windowB: WindowInfo = Field(..., description="Window B information")
    A: WindowMetrics = Field(..., description="Window A metrics")
    B: WindowMetrics = Field(..., description="Window B metrics")
    delta: DeltaMetrics = Field(..., description="Delta metrics (B - A)")
    per_merchant: Optional[List[PerMerchantMetrics]] = Field(
        None, description="Per-merchant breakdown"
    )
    excluded_missing_predicted_risk: Optional[int] = Field(
        None, ge=0, description="Transactions excluded due to missing predicted_risk"
    )
    investigation_summary: str = Field(
        ..., description="Human-readable investigation summary (3-6 sentences)"
    )
