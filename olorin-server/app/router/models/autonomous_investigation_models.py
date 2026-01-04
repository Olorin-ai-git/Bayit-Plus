"""
Structured Investigation Models
This module contains all Pydantic models for structured investigation requests and responses.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator

from app.utils.entity_validation import validate_entity_type_against_enum


class TimeRange(BaseModel):
    """Time range filter for investigation data"""

    start_time: str = Field(
        ..., description="Start time in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)"
    )
    end_time: str = Field(
        ..., description="End time in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)"
    )

    @validator("start_time", "end_time")
    def validate_iso_format(cls, v):
        """Validate that time strings are in valid ISO 8601 format."""
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
            return v
        except ValueError:
            raise ValueError(
                f"Invalid ISO 8601 timestamp format: {v}. Expected format: YYYY-MM-DDTHH:MM:SSZ"
            )

    @validator("end_time")
    def validate_end_after_start(cls, v, values):
        """Validate that end_time is after start_time."""
        if "start_time" in values:
            start = datetime.fromisoformat(values["start_time"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(v.replace("Z", "+00:00"))
            if end <= start:
                raise ValueError("end_time must be after start_time")
        return v


class StructuredInvestigationRequest(BaseModel):
    """Request model for starting an structured investigation"""

    investigation_id: Optional[str] = Field(
        None, description="Optional investigation ID (auto-generated if not provided)"
    )
    entity_id: str = Field(
        ..., description="Entity being investigated (user_id, device_id, etc.)"
    )
    entity_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Type of entity (user, device, transaction, etc.)",
    )
    time_range: Optional[TimeRange] = Field(
        None, description="Optional time range filter for investigation data"
    )
    scenario: Optional[str] = Field(
        None, description="Mock scenario to use for testing (optional)"
    )
    enable_verbose_logging: bool = Field(
        True, description="Enable comprehensive logging of all interactions"
    )
    enable_journey_tracking: bool = Field(
        True, description="Enable LangGraph journey tracking"
    )
    enable_chain_of_thought: bool = Field(
        True, description="Enable agent reasoning logging"
    )
    investigation_priority: str = Field(
        "normal", description="Investigation priority (low, normal, high, critical)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional investigation metadata"
    )

    @validator("entity_type")
    def validate_entity_type(cls, v):
        """Validate entity type against EntityType enum with comprehensive security checks."""
        is_valid, error_message = validate_entity_type_against_enum(v)
        if not is_valid:
            raise ValueError(error_message)

        return v.strip().lower()


class StructuredInvestigationResponse(BaseModel):
    """Response model for investigation start request"""

    investigation_id: str
    status: str
    message: str
    investigation_context: Dict[str, Any]
    monitoring_endpoints: Dict[str, str]
    estimated_completion_time_ms: int
    created_at: str


class InvestigationStatusResponse(BaseModel):
    """Response model for investigation status"""

    investigation_id: str
    status: str
    current_phase: str
    progress_percentage: float
    agent_status: Dict[str, str]
    findings_summary: Dict[str, Any]
    investigation_timeline: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]


class InvestigationLogsResponse(BaseModel):
    """Response model for investigation logs"""

    investigation_id: str
    log_summary: Dict[str, Any]
    interaction_logs: List[Dict[str, Any]]
    llm_interactions: List[Dict[str, Any]]
    agent_decisions: List[Dict[str, Any]]
    tool_executions: List[Dict[str, Any]]


class LangGraphJourneyResponse(BaseModel):
    """Response model for LangGraph journey visualization"""

    investigation_id: str
    journey_visualization: Dict[str, Any]
    execution_path: List[
        Dict[str, Any]
    ]  # Changed from List[str] to List[Dict[str, Any]] to match timeline data
    agent_coordination: List[Dict[str, Any]]
    performance_analytics: Dict[str, Any]
