"""
Pydantic Model: DeviceSignal
Feature: 001-composio-tools-integration

Data model for device fingerprinting signals captured at the edge.
Used for API request/response validation and Snowflake data mapping.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class DeviceSignal(BaseModel):
    """
    Device signal model for device fingerprinting data.

    Maps to Snowflake table: device_signals
    """

    device_id: str = Field(..., description="Unique device identifier from SDK")
    transaction_id: Optional[str] = Field(None, description="Associated transaction ID")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    tenant_id: Optional[str] = Field(
        None, description="Tenant ID for multi-tenant isolation"
    )
    confidence_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Device fingerprint confidence score"
    )
    browser_fingerprint: Optional[Dict[str, Any]] = Field(
        None, description="Browser fingerprint data (JSON)"
    )
    behavioral_signals: Optional[Dict[str, Any]] = Field(
        None, description="Behavioral signals (mouse movements, typing patterns, etc.)"
    )
    captured_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when signal was captured",
    )
    sdk_provider: str = Field(
        ..., description="SDK provider: 'fingerprint_pro', 'seon', or 'ipqs'"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "device_id": "fp_1234567890abcdef",
                "transaction_id": "txn_abc123",
                "user_id": "user_xyz",
                "tenant_id": "tenant_001",
                "confidence_score": 0.95,
                "browser_fingerprint": {
                    "user_agent": "Mozilla/5.0...",
                    "screen_resolution": "1920x1080",
                    "timezone": "America/New_York",
                },
                "behavioral_signals": {"mouse_movements": [], "typing_patterns": {}},
                "captured_at": "2025-01-31T12:00:00Z",
                "sdk_provider": "fingerprint_pro",
            }
        }


class DeviceSignalCreate(BaseModel):
    """Request model for creating device signal."""

    device_id: str
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    confidence_score: Optional[float] = None
    browser_fingerprint: Optional[Dict[str, Any]] = None
    behavioral_signals: Optional[Dict[str, Any]] = None
    sdk_provider: str
