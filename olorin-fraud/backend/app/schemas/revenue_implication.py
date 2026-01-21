"""
Revenue Implication Schemas

Pydantic schemas for revenue calculation data structures.

Feature: 024-revenue-implication-tracking
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    """Confidence level for revenue calculations based on transaction volume."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TransactionDetail(BaseModel):
    """Detail of a single transaction used in revenue calculation."""

    tx_id: str = Field(description="Transaction ID")
    gmv: Decimal = Field(description="Transaction GMV amount")
    decision: str = Field(description="nSure decision (APPROVED/BLOCKED)")
    is_fraud: bool = Field(description="Whether transaction was fraud")
    tx_datetime: datetime = Field(description="Transaction timestamp")
    merchant: Optional[str] = Field(default=None, description="Merchant name")


class SavedFraudGMVBreakdown(BaseModel):
    """Detailed breakdown of Saved Fraud GMV calculation."""

    # Core metric
    total_saved_gmv: Decimal = Field(description="Total GMV that would have been lost")

    # Reasoning
    reasoning: str = Field(description="Full explanation of Saved Fraud GMV")
    methodology: str = Field(description="How this metric was calculated")

    # Supporting data
    transaction_count: int = Field(description="Number of approved fraud transactions")
    avg_fraud_tx_value: Decimal = Field(
        default=Decimal("0"), description="Average value per fraud transaction"
    )
    min_tx_value: Decimal = Field(
        default=Decimal("0"), description="Minimum transaction value"
    )
    max_tx_value: Decimal = Field(
        default=Decimal("0"), description="Maximum transaction value"
    )

    # Transaction samples (top N by value for demonstration)
    sample_transactions: List[TransactionDetail] = Field(
        default_factory=list, description="Sample transactions for audit"
    )

    # Query used (for transparency)
    query_window_start: datetime = Field(description="Start of query window")
    query_window_end: datetime = Field(description="End of query window")


class LostRevenuesBreakdown(BaseModel):
    """Detailed breakdown of Lost Revenues calculation."""

    # Core metric
    total_lost_revenues: Decimal = Field(description="Total revenues lost")

    # Intermediate values
    blocked_gmv_total: Decimal = Field(
        description="Total GMV of blocked legitimate transactions"
    )
    take_rate_percent: Decimal = Field(description="Take rate percentage applied")
    lifetime_multiplier: Decimal = Field(description="Lifetime value multiplier")

    # Reasoning
    reasoning: str = Field(description="Full explanation of Lost Revenues")
    methodology: str = Field(description="How this metric was calculated")
    formula_applied: str = Field(
        description="The exact formula: blocked_gmv × (rate/100) × multiplier"
    )

    # Supporting data
    transaction_count: int = Field(
        description="Number of blocked legitimate transactions"
    )
    avg_blocked_tx_value: Decimal = Field(
        default=Decimal("0"), description="Average value per blocked transaction"
    )

    # Transaction samples
    sample_transactions: List[TransactionDetail] = Field(
        default_factory=list, description="Sample blocked transactions for audit"
    )

    # Query used
    query_window_start: datetime = Field(description="Start of query window")
    query_window_end: datetime = Field(description="End of query window")


class NetValueBreakdown(BaseModel):
    """Detailed breakdown of Net Value calculation."""

    net_value: Decimal = Field(description="Final net value")
    formula: str = Field(description="Net Value = Saved Fraud GMV - Lost Revenues")
    reasoning: str = Field(description="Interpretation of the net value")
    is_positive: bool = Field(description="Whether Olorin added value")
    roi_percentage: Optional[Decimal] = Field(
        default=None, description="ROI if Lost Revenues > 0"
    )


class RevenueImplication(BaseModel):
    """Revenue implication calculation result for an investigation."""

    investigation_id: str = Field(description="Reference to the investigation")
    entity_type: str = Field(description="Type of entity investigated (e.g., 'email')")
    entity_value: str = Field(description="Value of entity investigated")
    merchant_name: Optional[str] = Field(
        default=None, description="Associated merchant"
    )

    # Core revenue metrics
    saved_fraud_gmv: Decimal = Field(
        default=Decimal("0"),
        description="GMV saved by detecting fraud",
    )
    lost_revenues: Decimal = Field(
        default=Decimal("0"),
        description="Revenue lost from blocking legitimate transactions",
    )
    net_value: Decimal = Field(
        default=Decimal("0"),
        description="Net value = Saved Fraud GMV - Lost Revenues",
    )

    # DETAILED BREAKDOWNS with full reasoning
    saved_fraud_breakdown: Optional[SavedFraudGMVBreakdown] = Field(
        default=None,
        description="Detailed breakdown of Saved Fraud GMV calculation",
    )
    lost_revenues_breakdown: Optional[LostRevenuesBreakdown] = Field(
        default=None,
        description="Detailed breakdown of Lost Revenues calculation",
    )
    net_value_breakdown: Optional[NetValueBreakdown] = Field(
        default=None,
        description="Detailed breakdown of Net Value calculation",
    )

    # Transaction counts for context
    approved_fraud_tx_count: int = Field(
        default=0,
        description="Number of approved transactions that were fraud",
    )
    blocked_legitimate_tx_count: int = Field(
        default=0,
        description="Number of legitimate transactions that were blocked",
    )
    total_tx_count: int = Field(
        default=0,
        description="Total transactions analyzed for revenue calculation",
    )

    # Configuration used (for audit trail)
    take_rate_used: Decimal = Field(
        description="Take rate percentage used in calculation"
    )
    lifetime_multiplier_used: Decimal = Field(
        description="Lifetime multiplier used in calculation"
    )

    # Time windows used (for methodology explanation in reports)
    # Investigation window: When fraud patterns were detected (e.g., 18-12 months ago)
    investigation_window_start: Optional[datetime] = Field(
        default=None,
        description="Start of investigation analysis window (for methodology context)",
    )
    investigation_window_end: Optional[datetime] = Field(
        default=None,
        description="End of investigation analysis window (for methodology context)",
    )
    # GMV window: FUTURE period showing what would have been saved (e.g., 12-6 months ago)
    gmv_window_start: datetime = Field(
        description="Start of GMV calculation window"
    )
    gmv_window_end: datetime = Field(
        description="End of GMV calculation window"
    )

    # Quality metrics
    confidence_level: ConfidenceLevel = Field(
        default=ConfidenceLevel.LOW,
        description="Confidence level based on transaction volume",
    )
    calculation_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the calculation was performed",
    )

    # Prediction validation (Feature 024 fix: verify Olorin actually predicted fraud)
    prediction_validation: Optional["PredictionValidation"] = Field(
        default=None,
        description="Result of prediction validation from Postgres",
    )

    # Error handling
    calculation_successful: bool = Field(
        default=True,
        description="Whether calculation completed successfully",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error message if calculation failed",
    )
    # Flag to indicate if revenue was skipped due to prediction validation
    skipped_due_to_prediction: bool = Field(
        default=False,
        description="True if revenue calculation was skipped because Olorin did not predict fraud",
    )

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class RevenueAggregation(BaseModel):
    """Aggregated revenue metrics across multiple investigations."""

    total_investigations: int = Field(
        default=0,
        description="Number of investigations with revenue data",
    )
    successful_calculations: int = Field(
        default=0,
        description="Number of successful revenue calculations",
    )
    failed_calculations: int = Field(
        default=0,
        description="Number of failed revenue calculations",
    )

    # Aggregate metrics
    total_saved_fraud_gmv: Decimal = Field(
        default=Decimal("0"),
        description="Total GMV saved across all investigations",
    )
    total_lost_revenues: Decimal = Field(
        default=Decimal("0"),
        description="Total lost revenues across all investigations",
    )
    total_net_value: Decimal = Field(
        default=Decimal("0"),
        description="Total net value across all investigations",
    )

    # Transaction totals
    total_approved_fraud_tx: int = Field(
        default=0,
        description="Total approved fraud transactions",
    )
    total_blocked_legitimate_tx: int = Field(
        default=0,
        description="Total blocked legitimate transactions",
    )

    # Per-merchant breakdown (optional)
    merchant_breakdown: Optional[dict] = Field(
        default=None,
        description="Revenue metrics grouped by merchant",
    )

    aggregation_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the aggregation was performed",
    )

    class Config:
        """Pydantic config."""

        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class PredictionValidation(BaseModel):
    """Result of prediction validation check."""

    entity_predicted_as_fraud: bool = Field(
        description="Whether Olorin predicted this entity as fraudulent (predicted_label=1)"
    )
    prediction_count: int = Field(
        default=0,
        description="Number of predictions found for this entity",
    )
    avg_predicted_risk: Optional[float] = Field(
        default=None,
        description="Average predicted risk score for this entity",
    )
    risk_threshold_used: float = Field(
        description="Risk threshold used for classification",
    )
    validation_message: str = Field(
        description="Human-readable explanation of validation result",
    )


class RevenueCalculationRequest(BaseModel):
    """Request to calculate revenue implications for an investigation."""

    investigation_id: str = Field(
        description="ID of the investigation to calculate revenue for"
    )
    entity_type: str = Field(
        description="Type of entity (e.g., 'email')"
    )
    entity_value: str = Field(
        description="Entity value to query transactions for"
    )
    # Investigation window: When fraud patterns were detected (for methodology context)
    investigation_window_start: Optional[datetime] = Field(
        default=None,
        description="Start of investigation analysis window (for methodology context)",
    )
    investigation_window_end: Optional[datetime] = Field(
        default=None,
        description="End of investigation analysis window (for methodology context)",
    )
    # GMV window: FUTURE period showing what would have been saved
    gmv_window_start: datetime = Field(
        description="Start of GMV calculation window"
    )
    gmv_window_end: datetime = Field(
        description="End of GMV calculation window"
    )
    take_rate_override: Optional[Decimal] = Field(
        default=None,
        description="Override default take rate (optional)",
    )
    lifetime_multiplier_override: Optional[Decimal] = Field(
        default=None,
        description="Override default lifetime multiplier (optional)",
    )
    # Prediction validation: Skip Postgres check if prediction already validated
    skip_prediction_validation: bool = Field(
        default=False,
        description="Skip Postgres prediction check (use if already validated)",
    )
    predicted_risk_score: Optional[float] = Field(
        default=None,
        description="Pre-validated risk score from investigation (optional)",
    )

