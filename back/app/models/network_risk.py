from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DeviceNetworkSignal(BaseModel):
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    isp: Optional[str] = None
    country: Optional[str] = None  # Country associated with the IP/ISP
    timestamp: Optional[str] = None
    # Add any other raw fields from Splunk that might be relevant for network analysis context
    # e.g., event.get("values(TRUE_IP_TYPE)") if available and useful for VPN/proxy hints


class NetworkRiskLLMAssessment(BaseModel):
    risk_level: float = Field(
        ...,
        description="A score between 0.0 (low risk) and 1.0 (high risk) based on network signals, primarily ISP analysis.",
    )
    risk_factors: List[str] = Field(
        ...,
        description="Specific network-related factors contributing to the risk (e.g., ISP known for malicious activity, high ISP volatility for a device, suspected VPN/proxy ISP).",
    )
    anomaly_details: List[str] = Field(
        default_factory=list,
        description="Details of any specific network anomalies detected, e.g., 'Device X used ISP known for botnets'.",
    )
    confidence: float = Field(
        ...,
        description="LLM's confidence in this network signal assessment (0.0 to 1.0)",
    )
    summary: str = Field(..., description="LLM's summary of network signal risk.")
    thoughts: str = Field(
        ...,
        description="Detailed analysis and insights about the risk assessment, including potential implications and patterns observed.",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class AnalyzeNetworkResponse(BaseModel):
    user_id: str
    raw_splunk_results_count: int = Field(
        json_schema_extra={"description": "Count of raw events from Splunk search."}
    )
    extracted_network_signals: List[DeviceNetworkSignal] = Field(default_factory=list)
    network_risk_assessment: Optional[NetworkRiskLLMAssessment] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
