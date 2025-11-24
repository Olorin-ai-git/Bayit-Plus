"""
Fraud Detection Input Schema

Defines input validation and schema for fraud detection ML tool.
"""

from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field


class FraudDetectionInput(BaseModel):
    """Input schema for Fraud Detection ML Tool."""

    transaction_data: Dict[str, Any] = Field(
        ..., description="Transaction or activity data to analyze for fraud"
    )
    user_profile: Optional[Dict[str, Any]] = Field(
        default=None, description="User profile data for behavioral analysis"
    )
    detection_models: List[str] = Field(
        default=["ensemble", "rule_based", "behavioral", "statistical"],
        description="Fraud detection models to use",
    )
    fraud_types: List[str] = Field(
        default=[
            "payment_fraud",
            "identity_fraud",
            "account_takeover",
            "synthetic_fraud",
        ],
        description="Types of fraud to detect",
    )
    sensitivity_level: str = Field(
        default="balanced",
        description="Detection sensitivity: 'conservative', 'balanced', 'aggressive'",
    )
    historical_data: Optional[Dict[str, Any]] = Field(
        default=None, description="Historical fraud patterns and user behavior data"
    )
