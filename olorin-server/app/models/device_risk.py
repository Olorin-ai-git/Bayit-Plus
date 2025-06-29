from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DeviceSignalDetail(BaseModel):
    ip_address: Optional[str] = None
    isp: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    timestamp: Optional[str] = None
    fuzzy_device_id: Optional[str] = None
    challenges: Optional[List[str]] = None  # e.g. ["Password", "SMS"]
    raw_event_time: Optional[str] = None


class DeviceSignalRiskLLMAssessment(BaseModel):
    risk_level: float = Field(
        ...,
        description="A score between 0.0 (low risk) and 1.0 (high risk) based on device signals.",
    )
    risk_factors: List[str] = Field(
        ...,
        description="Specific device-related factors contributing to the risk (e.g., ISP inconsistency, geo-anomaly, VPN detected from device logs).",
    )
    anomaly_details: List[str] = Field(
        default_factory=list,
        description="Details of any specific anomalies detected, e.g., 'Device used from US and IN within short period'.",
    )
    confidence: float = Field(
        ...,
        description="LLM's confidence in this device signal assessment (0.0 to 1.0)",
    )
    summary: str = Field(..., description="LLM's summary of device signal risk.")
    thoughts: str = Field(
        ...,
        description="Detailed analysis and insights about the device risk assessment, including potential implications and patterns observed.",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class AnalyzeDeviceResponse(BaseModel):
    # This will be the new response model for the analyze_device endpoint
    user_id: str
    raw_splunk_results: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        json_schema_extra={"description": "Raw results from Splunk search."},
    )
    extracted_device_signals: List[DeviceSignalDetail] = Field(default_factory=list)
    device_signal_risk_assessment: Optional[DeviceSignalRiskLLMAssessment] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
