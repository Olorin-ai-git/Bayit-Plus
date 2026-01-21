"""
Investigation Status Schema

Pydantic schemas for hybrid graph investigation status polling responses.
Used for GET /api/investigations/{id}/status endpoint.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class AgentStatusSchema(BaseModel):
    """Status of individual domain agent execution."""

    agent_name: str = Field(..., description="Agent name (e.g., 'Device Agent')")
    status: Literal["pending", "running", "completed", "failed"] = Field(
        ..., description="Current agent execution status"
    )
    progress_percentage: float = Field(
        0.0, ge=0.0, le=100.0, description="Agent progress (0-100)"
    )
    tools_used: int = Field(0, ge=0, description="Number of tools executed")
    findings_count: int = Field(0, ge=0, description="Number of findings generated")
    execution_time_ms: Optional[int] = Field(
        None, ge=0, description="Agent execution time in milliseconds"
    )


class ToolExecutionSchema(BaseModel):
    """Status of individual tool execution within investigation."""

    tool_id: str = Field(..., description="Unique tool identifier")
    tool_name: str = Field(..., description="Human-readable tool name")
    status: Literal["pending", "running", "completed", "failed"] = Field(
        ..., description="Tool execution status"
    )
    started_at: datetime = Field(..., description="Tool execution start time")
    completed_at: Optional[datetime] = Field(
        None, description="Tool execution completion time"
    )
    duration_ms: Optional[int] = Field(
        None, ge=0, description="Tool execution duration in milliseconds"
    )
    output_summary: str = Field("", description="Brief summary of tool output")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class LogEntrySchema(BaseModel):
    """Individual log entry from investigation execution."""

    timestamp: datetime = Field(..., description="Log entry timestamp")
    severity: Literal["info", "warning", "error"] = Field(
        ..., description="Log severity level"
    )
    source: str = Field(..., description="Log source (e.g., 'Device Agent')")
    message: str = Field(..., description="Log message content")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional log metadata"
    )


class ErrorDetailSchema(BaseModel):
    """Error detail information for failed investigations."""

    error_code: str = Field(..., description="Error code identifier")
    error_message: str = Field(..., description="Human-readable error message")
    error_details: Optional[str] = Field(None, description="Detailed error information")
    recovery_suggestions: List[str] = Field(
        default_factory=list, description="Suggested recovery actions"
    )


class InvestigationStatusSchema(BaseModel):
    """
    Response schema for GET /api/investigations/{id}/status endpoint.

    Provides comprehensive investigation status for polling-based progress monitoring.
    """

    investigation_id: str = Field(..., description="Unique investigation identifier")

    status: Literal["pending", "running", "completed", "failed", "timeout"] = Field(
        ..., description="Overall investigation status"
    )

    current_phase: str = Field(
        "", description="Current execution phase (e.g., 'Domain Analysis')"
    )

    progress_percentage: float = Field(
        0.0, ge=0.0, le=100.0, description="Overall progress (0-100)"
    )

    estimated_completion_time: Optional[datetime] = Field(
        None, description="Estimated completion timestamp"
    )

    risk_score: Optional[float] = Field(
        None, ge=0.0, le=100.0, description="Current risk score (0-100)"
    )

    agent_status: Dict[str, AgentStatusSchema] = Field(
        default_factory=dict, description="Status of each domain agent"
    )

    tool_executions: List[ToolExecutionSchema] = Field(
        default_factory=list, description="List of tool execution statuses"
    )

    logs: List[LogEntrySchema] = Field(
        default_factory=list, description="Recent log entries"
    )

    error: Optional[ErrorDetailSchema] = Field(
        None, description="Error details if investigation failed"
    )

    class Config:
        """Pydantic model configuration."""

        json_schema_extra = {
            "example": {
                "investigation_id": "inv-123e4567-e89b-12d3-a456-426614174000",
                "status": "running",
                "current_phase": "Domain Analysis",
                "progress_percentage": 45.5,
                "estimated_completion_time": "2025-01-21T10:30:00Z",
                "risk_score": 67.3,
                "agent_status": {
                    "device_agent": {
                        "agent_name": "Device Agent",
                        "status": "completed",
                        "progress_percentage": 100.0,
                        "tools_used": 3,
                        "findings_count": 2,
                        "execution_time_ms": 5234,
                    }
                },
                "tool_executions": [
                    {
                        "tool_id": "check_device_fingerprint",
                        "tool_name": "Check Device Fingerprint",
                        "status": "completed",
                        "started_at": "2025-01-21T10:15:00Z",
                        "completed_at": "2025-01-21T10:15:05Z",
                        "duration_ms": 5234,
                        "output_summary": "Device fingerprint verified successfully",
                    }
                ],
                "logs": [
                    {
                        "timestamp": "2025-01-21T10:15:00Z",
                        "severity": "info",
                        "source": "Device Agent",
                        "message": "Starting device fingerprint check",
                        "metadata": {},
                    }
                ],
            }
        }
