"""
Core data models for Pattern Recognition ML Tool.

Defines input schemas and core data structures.
"""

from typing import Any, Dict, Optional, List, Literal
from pydantic import BaseModel, Field


class PatternRecognitionInput(BaseModel):
    """Input schema for Pattern Recognition ML Tool."""

    data: Dict[str, Any] = Field(..., description="Data to analyze for patterns")
    pattern_types: List[str] = Field(
        default=["sequence", "behavioral", "temporal", "frequency"],
        description="Types of patterns to recognize: 'sequence', 'behavioral', 'temporal', 'frequency', 'fraud', 'network', 'textual'"
    )
    recognition_mode: str = Field(
        default="comprehensive",
        description="Recognition mode: 'comprehensive', 'targeted', 'learning', 'detection'"
    )
    minimum_support: float = Field(
        default=0.1,
        description="Minimum support threshold for pattern recognition (0.0-1.0)"
    )
    historical_patterns: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Known historical patterns for comparison and evolution tracking"
    )
    learning_enabled: bool = Field(
        default=True,
        description="Whether to learn new patterns from the data"
    )


class PatternResult(BaseModel):
    """Result structure for pattern recognition."""

    pattern_type: str = Field(..., description="Type of pattern recognized")
    pattern_data: Dict[str, Any] = Field(..., description="Pattern data and metrics")
    confidence: float = Field(..., description="Confidence score for the pattern")
    support: float = Field(..., description="Support level of the pattern")
    anomalies: List[Dict[str, Any]] = Field(default=[], description="Detected anomalies")


class ProcessedData(BaseModel):
    """Structure for preprocessed data."""

    sequences: List[List[Any]] = Field(default=[], description="Sequential data")
    behaviors: List[Dict[str, Any]] = Field(default=[], description="Behavioral data")
    timestamps: List[Dict[str, Any]] = Field(default=[], description="Temporal data")
    categorical_data: Dict[str, str] = Field(default={}, description="Categorical features")
    numerical_data: Dict[str, float] = Field(default={}, description="Numerical features")
    text_data: List[str] = Field(default=[], description="Text data")
    network_data: Dict[str, Any] = Field(default={}, description="Network connections")
    transaction_data: List[Dict[str, Any]] = Field(default=[], description="Transaction records")


class FraudPattern(BaseModel):
    """Structure for detected fraud pattern."""

    pattern_type: str = Field(..., description="Type of fraud pattern (card_testing, velocity_burst, amount_clustering, time_anomaly)")
    pattern_name: str = Field(..., description="Human-readable pattern name")
    description: str = Field(..., description="Description of the detected pattern")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the pattern (0.0-1.0)")
    risk_adjustment: float = Field(..., description="Risk score adjustment (e.g., +0.20 for +20%)")
    affected_count: int = Field(..., ge=0, description="Number of transactions affected by this pattern")
    evidence: Dict[str, Any] = Field(..., description="Supporting evidence for the pattern")


class CardTestingPattern(FraudPattern):
    """Card testing pattern: small test followed by large purchase."""
    pattern_type: Literal["card_testing"] = "card_testing"


class VelocityBurstPattern(FraudPattern):
    """Velocity burst pattern: multiple transactions in short time window."""
    pattern_type: Literal["velocity_burst"] = "velocity_burst"


class AmountClusteringPattern(FraudPattern):
    """Amount clustering pattern: transactions near threshold amounts."""
    pattern_type: Literal["amount_clustering"] = "amount_clustering"


class TimeAnomalyPattern(FraudPattern):
    """Time anomaly pattern: transactions at unusual hours."""
    pattern_type: Literal["time_anomaly"] = "time_anomaly"