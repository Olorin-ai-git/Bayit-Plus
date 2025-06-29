from typing import List

from pydantic import BaseModel, Field, confloat


class BehaviorPatterns(BaseModel):
    login_times: List[str] = Field(default_factory=list)
    usual_locations: List[str] = Field(default_factory=list)
    common_devices: List[str] = Field(default_factory=list)


class Anomaly(BaseModel):
    type: str
    timestamp: str
    details: str


class RiskAssessment(BaseModel):
    risk_level: confloat(ge=0.0, le=1.0) = Field(
        ..., json_schema_extra={"description": "Risk level from 0 to 1"}
    )
    risk_factors: List[str] = Field(default_factory=list)
    confidence: confloat(ge=0.0, le=1.0)
    timestamp: str


class FraudResponse(BaseModel):
    behavior_patterns: BehaviorPatterns
    anomalies: List[Anomaly]
    risk_assessment: RiskAssessment
