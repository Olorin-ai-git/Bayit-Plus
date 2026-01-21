"""
Investigation Configuration Schema

Pydantic schemas for hybrid graph investigation configuration.
Used for POST /api/investigations endpoint request validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field, field_validator


class TimeRangeSchema(BaseModel):
    """Time range for investigation data collection."""

    start: datetime = Field(..., description="Investigation start time (ISO 8601)")
    end: datetime = Field(..., description="Investigation end time (ISO 8601)")

    @field_validator("end")
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """Ensure end time is after start time and not later than max lookback."""
        if "start" in info.data and v <= info.data["start"]:
            raise ValueError("end time must be after start time")

        # Cap end_time at max_lookback_months before current date
        import os
        from datetime import timedelta

        max_lookback_months = int(os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6"))
        max_lookback_days = max_lookback_months * 30
        max_allowed_end = datetime.utcnow() - timedelta(days=max_lookback_days)

        if v > max_allowed_end:
            raise ValueError(
                f"end time cannot be later than {max_lookback_months} months before current date ({max_allowed_end.date()})"
            )

        return v

    @field_validator("start", "end")
    @classmethod
    def validate_not_future(cls, v: datetime) -> datetime:
        """Ensure timestamps are not in the future."""
        if v > datetime.now():
            raise ValueError("timestamp cannot be in the future")
        return v


class ToolConfigSchema(BaseModel):
    """Configuration for individual investigation tool."""

    tool_id: str = Field(..., min_length=1, description="Unique tool identifier")
    enabled: bool = Field(True, description="Whether tool is enabled")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Tool-specific configuration parameters"
    )


class InvestigationConfigSchema(BaseModel):
    """
    Request schema for POST /api/investigations endpoint.

    Validates hybrid graph investigation configuration with strict validation rules.
    """

    entity_type: Literal["user", "device", "ip", "transaction"] = Field(
        ..., description="Type of entity to investigate"
    )

    entity_id: str = Field(
        ..., min_length=1, max_length=255, description="Entity identifier"
    )

    time_range: TimeRangeSchema = Field(
        ..., description="Time range for data collection"
    )

    tools: List[ToolConfigSchema] = Field(
        ..., min_length=1, description="List of investigation tools to execute"
    )

    correlation_mode: Literal["OR", "AND"] = Field(
        "OR", description="Multi-entity correlation mode"
    )

    execution_mode: Literal["parallel", "sequential"] = Field(
        "parallel", description="Tool execution mode"
    )

    risk_threshold: int = Field(
        50,
        ge=0,
        le=100,
        description="Risk score threshold for flagging findings (0-100)",
    )

    @field_validator("entity_id")
    @classmethod
    def validate_entity_id_format(cls, v: str, info) -> str:
        """Validate entity ID format based on entity type."""
        if "entity_type" not in info.data:
            return v

        entity_type = info.data["entity_type"]

        # Email validation for user entities
        if entity_type == "user":
            if "@" not in v or "." not in v.split("@")[-1]:
                raise ValueError("user entity_id must be a valid email format")

        # UUID validation for device entities
        elif entity_type == "device":
            import re

            uuid_pattern = (
                r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            )
            if not re.match(uuid_pattern, v.lower()):
                raise ValueError("device entity_id must be a valid UUID format")

        # IP address validation
        elif entity_type == "ip":
            import ipaddress

            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError("ip entity_id must be a valid IP address format")

        # Alphanumeric validation for transaction entities
        elif entity_type == "transaction":
            if not v.isalnum():
                raise ValueError(
                    "transaction entity_id must be alphanumeric characters only"
                )

        return v

    @field_validator("time_range")
    @classmethod
    def validate_time_range_duration(cls, v: TimeRangeSchema) -> TimeRangeSchema:
        """Validate time range does not exceed maximum duration."""
        duration_days = (v.end - v.start).days
        if duration_days > 90:
            raise ValueError("time_range cannot exceed 90 days duration")
        return v

    class Config:
        """Pydantic model configuration."""

        json_schema_extra = {
            "example": {
                "entity_type": "user",
                "entity_id": "user@example.com",
                "time_range": {
                    "start": "2025-01-01T00:00:00Z",
                    "end": "2025-01-07T23:59:59Z",
                },
                "tools": [
                    {"tool_id": "check_device_fingerprint", "enabled": True},
                    {
                        "tool_id": "analyze_network_patterns",
                        "enabled": True,
                        "parameters": {"threshold": 0.8},
                    },
                ],
                "correlation_mode": "OR",
                "execution_mode": "parallel",
                "risk_threshold": 60,
            }
        }
