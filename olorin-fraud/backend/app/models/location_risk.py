from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


class LocationRisk(BaseModel):
    risk_level: float = Field(
        ...,
        examples=[0.5],
        description="A score between 0.0 (low risk) and 1.0 (high risk)",
    )
    risk_factors: List[str] = Field(
        ...,
        examples=[["High-risk IP address"]],
        description="A list of specific factors contributing to the risk.",
    )
    anomaly_details: List[str] = Field(
        default_factory=list,
        description="Details of any specific location anomalies detected, e.g., 'Device X used from unexpected country'.",
    )
    confidence: float = Field(
        ..., examples=[0.8], description="Confidence in this assessment (0.0 to 1.0)"
    )
    summary: str = Field(
        ...,
        examples=["Moderate risk due to IP address history."],
        description="A brief textual summary of the assessment.",
    )
    thoughts: str = Field(
        ...,
        examples=[
            "The rapid switching between US and India locations within a short timeframe suggests potential account compromise. The high confidence level (0.9) in this assessment indicates strong evidence for these concerns."
        ],
        description="Detailed analysis and insights about the location risk assessment, including potential implications and patterns observed.",
    )
    timestamp: Optional[str] = Field(
        None,
        description="Timestamp of the assessment",
        examples=[datetime.now(timezone.utc).isoformat()],
    )


class LocationRiskAssessment(BaseModel):
    risk_assessment: LocationRisk = Field(
        ..., description="The detailed location risk assessment from the LLM."
    )
