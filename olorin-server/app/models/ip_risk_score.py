"""
Pydantic Model: IPRiskScore
Feature: 001-composio-tools-integration

Data model for MaxMind minFraud IP risk scores.
Used for API request/response validation and Snowflake data mapping.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import ipaddress


class IPRiskScoreRequest(BaseModel):
    """Request model for IP risk scoring."""
    transaction_id: str = Field(..., description="Transaction ID")
    ip_address: str = Field(..., description="IP address (IPv4 or IPv6)")
    email: Optional[str] = Field(None, description="Email address")
    billing_country: Optional[str] = Field(None, description="Billing country code")
    transaction_amount: Optional[float] = Field(None, ge=0, description="Transaction amount")
    currency: Optional[str] = Field(None, description="Currency code (e.g., USD)")
    
    @field_validator('ip_address')
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        """Validate IP address format."""
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address format: {v}")


class IPRiskScore(BaseModel):
    """
    IP risk score model for MaxMind minFraud data.
    
    Maps to Snowflake table: ip_risk_scores
    """
    
    transaction_id: str = Field(..., description="Transaction ID")
    ip_address: str = Field(..., description="IP address")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score (0-100)")
    is_proxy: Optional[bool] = Field(None, description="Is proxy")
    is_vpn: Optional[bool] = Field(None, description="Is VPN")
    is_tor: Optional[bool] = Field(None, description="Is TOR")
    geolocation_data: Optional[Dict[str, Any]] = Field(None, description="Geolocation data (JSON)")
    velocity_signals: Optional[Dict[str, Any]] = Field(None, description="Velocity signals (JSON)")
    scored_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when scored")
    provider: str = Field(default="maxmind", description="Provider name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "transaction_id": "txn_abc123",
                "ip_address": "192.0.2.1",
                "risk_score": 75.5,
                "is_proxy": True,
                "is_vpn": False,
                "is_tor": False,
                "geolocation_data": {
                    "country": {"code": "US", "name": "United States"},
                    "region": {"name": "California"},
                    "city": {"name": "San Francisco"}
                },
                "velocity_signals": {
                    "transaction_count_24h": 5,
                    "transaction_count_7d": 20
                },
                "scored_at": "2025-01-31T12:00:00Z",
                "provider": "maxmind"
            }
        }


class IPRiskScoreResponse(BaseModel):
    """Response model for IP risk scoring."""
    transaction_id: str
    ip_address: str
    risk_score: float
    is_proxy: Optional[bool] = None
    is_vpn: Optional[bool] = None
    is_tor: Optional[bool] = None
    geolocation: Optional[Dict[str, Any]] = None
    velocity_signals: Optional[Dict[str, Any]] = None
    scored_at: str
    cached: bool = False
    cached_at: Optional[str] = None
    expires_at: Optional[str] = None

