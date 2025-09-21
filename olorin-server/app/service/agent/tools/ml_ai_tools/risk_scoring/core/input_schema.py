"""
Risk Scoring Input Schema

Defines input validation schemas for risk scoring operations.
"""

from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field


class RiskScoringInput(BaseModel):
    """Input schema for Risk Scoring ML Tool."""

    risk_data: Dict[str, Any] = Field(
        ...,
        description="Data for risk assessment including transaction, user, and contextual information"
    )
    risk_factors: List[str] = Field(
        default=["fraud", "credit", "operational", "behavioral", "contextual"],
        description="Types of risk factors to assess"
    )
    scoring_models: List[str] = Field(
        default=["composite", "weighted", "ml_based", "rule_based"],
        description="Risk scoring models to apply"
    )
    risk_tolerance: str = Field(
        default="medium",
        description="Risk tolerance level: 'low', 'medium', 'high'"
    )
    time_horizon: str = Field(
        default="short_term",
        description="Risk assessment horizon: 'immediate', 'short_term', 'medium_term', 'long_term'"
    )
    historical_risk_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Historical risk data for trend analysis and model training"
    )


class RiskAssessmentResult(BaseModel):
    """Result schema for individual risk assessments."""

    risk_type: str = Field(..., description="Type of risk assessed")
    score: float = Field(..., description="Risk score (0.0 to 1.0)")
    confidence: float = Field(..., description="Confidence in assessment")
    factors: List[str] = Field(default_factory=list, description="Contributing risk factors")
    severity: str = Field(..., description="Risk severity level")


class ComprehensiveRiskResult(BaseModel):
    """Comprehensive risk scoring result."""

    overall_score: float = Field(..., description="Overall composite risk score")
    risk_level: str = Field(..., description="Overall risk level")
    individual_assessments: List[RiskAssessmentResult] = Field(
        default_factory=list,
        description="Individual risk assessments"
    )
    model_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Scores from different models"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Risk mitigation recommendations"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional assessment metadata"
    )